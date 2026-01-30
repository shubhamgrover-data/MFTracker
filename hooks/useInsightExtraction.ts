
import { useState, useRef, useEffect, useCallback } from 'react';
import { initiateBulkInsightExtraction, pollBulkInsightStatus, fetchStockSecInfo } from '../services/dataService';
import { processRawInsightData } from '../services/geminiService';
import { getTopElementInnerHTML } from '../services/helper';
import { InsightResultItem, PollStatusResponse } from '../types/trackingTypes';

const MAX_CONCURRENT_REQUESTS = 5;

export const useInsightExtraction = () => {
  const [results, setResults] = useState<Record<string, InsightResultItem[]>>({});
  const [status, setStatus] = useState<'idle' | 'initializing' | 'polling' | 'completed' | 'error'>('idle');
  
  // Aggregate progress across all batches
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  
  // Track multiple active batches (Request IDs)
  const [activeRequestIds, setActiveRequestIds] = useState<Set<string>>(new Set());
  
  // Track progress of each individual batch to compute total
  const [batchProgress, setBatchProgress] = useState<Record<string, { completed: number; total: number }>>({});
  
  // Track ongoing Gemini processing to prevent duplicate calls
  const processingRef = useRef<Set<string>>(new Set());

  // --- Queue Management State ---
  const pendingBatchesRef = useRef<string[][]>([]);
  const initiatingCountRef = useRef(0);
  const invalidateCacheRef = useRef(false);
  
  // Signal to trigger queue processing checks
  const [queueTick, setQueueTick] = useState(0);

  const startExtraction = useCallback(async (symbols: string[], batchSize = 10, invalidateCache = false) => {
    if (symbols.length === 0) return;

    // Reset Batches Progress (New extraction cycle for these symbols)
    // Note: We don't clear 'results' to prevent UI flashing, but we reset tracking of current operation
    setBatchProgress({});
    setActiveRequestIds(new Set());
    
    // We only clear processing cache for the symbols we are about to fetch
    // But simplistic approach is to clear all for fresh fetching session
    // processingRef.current.clear(); 

    setStatus('initializing');
    setProgress({ completed: 0, total: symbols.length });

    // Setup Queue
    pendingBatchesRef.current = [];
    for (let i = 0; i < symbols.length; i += batchSize) {
      pendingBatchesRef.current.push(symbols.slice(i, i + batchSize));
    }
    invalidateCacheRef.current = invalidateCache;
    initiatingCountRef.current = 0;

    console.log(`[useInsightExtraction] Queued ${pendingBatchesRef.current.length} batches. Concurrency Limit: ${MAX_CONCURRENT_REQUESTS}`);

    // Trigger queue processing
    setQueueTick(prev => prev + 1);
  }, []);

  // --- Queue Processing Logic ---
  useEffect(() => {
    const processQueue = async () => {
        // Current Load = Active Polling Requests + Requests currently initiating (network flight)
        const currentLoad = activeRequestIds.size + initiatingCountRef.current;
        
        if (currentLoad >= MAX_CONCURRENT_REQUESTS) {
            // console.log(`[Queue] Max concurrency reached (${currentLoad}/${MAX_CONCURRENT_REQUESTS}). Waiting...`);
            return;
        }

        if (pendingBatchesRef.current.length === 0) return;

        // Calculate how many batches we can launch
        const slotsAvailable = MAX_CONCURRENT_REQUESTS - currentLoad;
        const batchesToLaunch = pendingBatchesRef.current.splice(0, slotsAvailable);

        if (batchesToLaunch.length > 0) {
            console.log(`[Queue] Launching ${batchesToLaunch.length} batches. Remaining in queue: ${pendingBatchesRef.current.length}`);
            
            batchesToLaunch.forEach(async (batch) => {
                initiatingCountRef.current += 1;
                try {
                    const response = await initiateBulkInsightExtraction(batch, invalidateCacheRef.current);
                    if (response && response.requestId) {
                        const rId = response.requestId;
                        console.log(`[Queue] Batch initiated. ID: ${rId}`);
                        
                        // Register batch for polling
                        setBatchProgress(prev => ({
                            ...prev,
                            [rId]: { completed: 0, total: response.totalStocks }
                        }));
                        setActiveRequestIds(prev => new Set(prev).add(rId));
                        setStatus('polling');
                    } else {
                        console.error("Batch failed to initiate properly");
                    }
                } catch (e) {
                    console.error("Error initiating batch", e);
                } finally {
                    initiatingCountRef.current -= 1;
                    // Trigger check again as slot opened (or failed)
                    setQueueTick(prev => prev + 1);
                }
            });
        }
    };

    processQueue();
  }, [queueTick, activeRequestIds.size]); // Re-run when queueTick updates or active requests change (completion)


  // --- Polling Logic for Multiple Batches ---
  useEffect(() => {
    // Check for completion of all tasks
    if (activeRequestIds.size === 0 && pendingBatchesRef.current.length === 0 && initiatingCountRef.current === 0) {
      if (status === 'polling') {
          console.log("[useInsightExtraction] All batches completed.");
          setStatus('completed');
      }
      return;
    }

    if (activeRequestIds.size === 0) return;

    const pollAll = async () => {
      const ids = Array.from(activeRequestIds) as string[];
      
      await Promise.all(ids.map(async (id) => {
        const data = await pollBulkInsightStatus(id);
        
        if (data) {
          // 1. Update Results (Merge)
          setResults(prev => {
            const next = { ...prev };
            for (const [symbol, newItems] of Object.entries(data.results)) {
              const existingItems = next[symbol] || [];
              const mergedItems = [...existingItems];
              
              newItems.forEach(newItem => {
                const index = mergedItems.findIndex(i => i.indicatorName === newItem.indicatorName);
                if (index > -1) {
                  const existing = mergedItems[index];
                  // Preserve parsed JSON if new data is raw string (polling often returns same raw data)
                  if (existing.type === 'json' && typeof newItem.data === 'string') {
                    // Do nothing, keep existing parsed data
                  } else {
                    mergedItems[index] = newItem;
                  }
                } else {
                  mergedItems.push(newItem);
                }
              });
              next[symbol] = mergedItems;
            }
            return next;
          });

          // 2. Update Batch Progress
          setBatchProgress(prev => ({
            ...prev,
            [id]: { completed: data.completedStocks, total: data.totalStocks }
          }));

          // 3. Check for Completion of this batch
          if (data.status === 'resolved' || (data.totalStocks > 0 && data.completedStocks >= data.totalStocks)) {
            console.log(`[Polling] Batch ${id} completed.`);
            setActiveRequestIds(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
            // Slot opened, check queue
            setQueueTick(prev => prev + 1);
          }
        }
      }));
    };

    const intervalId = setInterval(pollAll, 5000);
    return () => clearInterval(intervalId);
  }, [activeRequestIds, status]);

  // --- Aggregate Progress ---
  useEffect(() => {
      if (Object.keys(batchProgress).length === 0) return;

      const totals = Object.values(batchProgress).reduce<{ completed: number; total: number }>((acc, curr) => ({
          completed: acc.completed + curr.completed,
          total: acc.total + curr.total
      }), { completed: 0, total: 0 });

      // Add pending items to total count to show real progress relative to initial request
      const pendingCount = pendingBatchesRef.current.reduce((acc, batch) => acc + batch.length, 0);
      const initiatingCount = initiatingCountRef.current * 10; // Approx
      
      // If we are just starting, ensure total reflects input
      if (totals.total > 0) {
          setProgress({
              completed: totals.completed,
              // Use the max of tracked total vs computed to avoid progress bar jumping back
              total: Math.max(totals.total + pendingCount, progress.total)
          });
      }
  }, [batchProgress, queueTick]); // queueTick dependency helps update when pending queue changes

  // --- Gemini Processing Logic ---
  useEffect(() => {
    Object.entries(results).forEach(([symbol, val]) => {
      const items = val as InsightResultItem[];
      items.forEach(async (item) => {
        const uniqueKey = `${symbol}-${item.indicatorName}`;
        
        if (item.geminiParsingReq && 
            item.success && 
            typeof item.data === 'string' && 
            item.data.trim().startsWith('<') &&
            !processingRef.current.has(uniqueKey)
        ) {
            processingRef.current.add(uniqueKey);
            
            try {
                let dataToParse = item.data;
                if(item.indicatorName === "Insider/SAST Deals") {
                  dataToParse = getTopElementInnerHTML(item.data);
                }
                
                const jsonStr = await processRawInsightData(dataToParse, item.geminiPrompt, item.indicatorName);
                
                let jsonObj;
                try {
                    jsonObj = JSON.parse(jsonStr);
                    // MERGE NSE DATA FOR PE CARD
                    if (item.indicatorName === 'PE') {
                         try {
                             const secInfo = await fetchStockSecInfo(symbol);
                             if (secInfo) {
                                 jsonObj.secInfo = secInfo;
                             }
                         } catch(e) {
                             console.warn(`Failed to fetch NSE SecInfo for ${symbol}`, e);
                         }
                    }
                } catch(e) {
                    jsonObj = { error: "Failed to parse data output", raw: jsonStr };
                }

                setResults(prev => {
                    const next = { ...prev };
                    const symItems = [...(next[symbol] || [])];
                    const itemIdx = symItems.findIndex(i => i.indicatorName === item.indicatorName);
                    if (itemIdx > -1) {
                        symItems[itemIdx] = {
                            ...symItems[itemIdx],
                            data: jsonObj,
                            type: 'json'
                        };
                    }
                    next[symbol] = symItems;
                    return next;
                });
            } catch (err) {
                console.error("Processing failed for", uniqueKey);
                setResults(prev => {
                    const next = { ...prev };
                    const symItems = [...(next[symbol] || [])];
                    const itemIdx = symItems.findIndex(i => i.indicatorName === item.indicatorName);
                    if (itemIdx > -1) {
                        symItems[itemIdx] = {
                            ...symItems[itemIdx],
                            data: { error: "Processing failed" },
                            type: 'json'
                        };
                    }
                    next[symbol] = symItems;
                    return next;
                });
            }
        }
      });
    });
  }, [results]);

  return {
    results,
    setResults,
    status,
    setStatus,
    progress,
    setProgress,
    activeRequestIds,
    startExtraction
  };
};
