
import { useState, useRef, useEffect, useCallback } from 'react';
import { initiateBulkInsightExtraction, pollBulkInsightStatus } from '../services/dataService';
import { processRawInsightData } from '../services/geminiService';
import { getTopElementInnerHTML } from '../services/helper';
import { InsightResultItem, PollStatusResponse } from '../types/trackingTypes';

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

  const startExtraction = useCallback(async (symbols: string[], batchSize = 10, invalidateCache = false) => {
    if (symbols.length === 0) return;

    // IMPORTANT: Do NOT clear results here. 
    // Clearing results causes the UI to flash empty and can trigger infinite loops 
    // in components that check for missing results to initiate fetching.
    // setResults({}); 

    setBatchProgress({});
    setActiveRequestIds(new Set());
    
    // We only clear processing cache for the symbols we are about to fetch if we wanted a hard refresh,
    // but for now we keep it simple to avoid aggressive reprocessing.
    // processingRef.current.clear(); 

    setStatus('initializing');
    setProgress({ completed: 0, total: symbols.length });

    // Create Batches
    const batches: string[][] = [];
    for (let i = 0; i < symbols.length; i += batchSize) {
      batches.push(symbols.slice(i, i + batchSize));
    }

    console.log(`[useInsightExtraction] Starting ${batches.length} batches of size ${batchSize} with invalidateCache=${invalidateCache}`);

    // Process Batches in Parallel
    let initiatedBatches = 0;

    batches.forEach(async (batch, index) => {
      try {
        const response = await initiateBulkInsightExtraction(batch, invalidateCache);
        
        if (response && response.requestId) {
          const rId = response.requestId;
          
          // Register the new batch
          setActiveRequestIds(prev => new Set(prev).add(rId));
          setBatchProgress(prev => ({
            ...prev,
            [rId]: { completed: 0, total: response.totalStocks }
          }));
          
          // If we have at least one active, we are polling
          setStatus('polling');
        } else {
            console.error(`Batch ${index + 1} failed to initiate`);
        }
      } catch (e) {
        console.error(`Error initiating batch ${index + 1}`, e);
      } finally {
        initiatedBatches++;
        // If all tried and none succeeded (status still initializing), mark error
        if (initiatedBatches === batches.length) {
             setActiveRequestIds(current => {
                 if (current.size === 0) setStatus('error');
                 return current;
             });
        }
      }
    });
  }, []);

  // --- Polling Logic for Multiple Batches ---
  useEffect(() => {
    // If no active requests, we might be done or idle
    if (activeRequestIds.size === 0) {
      if (status === 'polling') {
          setStatus('completed');
      }
      return;
    }

    const pollAll = async () => {
      const ids = Array.from(activeRequestIds);
      
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

          // 3. Check for Completion
          if (data.status === 'resolved' || (data.totalStocks > 0 && data.completedStocks >= data.totalStocks)) {
            setActiveRequestIds(prev => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
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

      const totals = Object.values(batchProgress).reduce((acc, curr) => ({
          completed: acc.completed + curr.completed,
          total: acc.total + curr.total
      }), { completed: 0, total: 0 });

      // Only update if total > 0 to avoid flickers
      if (totals.total > 0) {
          setProgress(totals);
      }
  }, [batchProgress]);

  // --- Gemini Processing Logic ---
  useEffect(() => {
    Object.entries(results).forEach(([symbol, items]) => {
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
