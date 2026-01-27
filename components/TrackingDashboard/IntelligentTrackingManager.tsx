
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, RefreshCw, Filter, BrainCircuit, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchIndexConstituents } from '../../services/dataService';
import { processIndicatorData, ProcessedInsight } from '../../services/indicatorProcessor';
import { isTracked, addTrackedItem, removeTrackedItem, getTrackedIndices } from '../../services/trackingStorage';
import IntelligentStockCard from './cards/IntelligentStockCard';
import { InsightResultItem } from '../../types/trackingTypes';
import { IntelligentState } from './TrackingDashboard'; // Import type from parent

interface IntelligentTrackingManagerProps {
  onOpenChat: (context: any[]) => void;
  onSelectStock: (symbol: string, name: string) => void;
  // Props from parent hook
  extractionData: {
      results: Record<string, InsightResultItem[]>;
      status: 'idle' | 'initializing' | 'polling' | 'completed' | 'error';
      startExtraction: (symbols: string[], batchSize?: number, invalidateCache?: boolean) => Promise<void>;
      progress: { completed: number; total: number };
  };
  onStatsUpdate: (stats: { filtered: number; total: number }) => void;
  // Persisted View State
  viewState: IntelligentState;
  setViewState: React.Dispatch<React.SetStateAction<IntelligentState>>;
}

const FILTER_TYPES = ["All", "Valuation", "Technicals", "Holdings", "Performance", "Deals"];
const BATCH_SIZE = 10;

const IntelligentTrackingManager: React.FC<IntelligentTrackingManagerProps> = ({ 
  onOpenChat, 
  onSelectStock,
  extractionData,
  onStatsUpdate,
  viewState,
  setViewState
}) => {
  const [loadingSymbols, setLoadingSymbols] = useState(false);
  const [trackTick, setTrackTick] = useState(0);
  const [availableIndices, setAvailableIndices] = useState<string[]>([]);
  
  // Selection and Force Refresh State
  const [selectedSymbols, setSelectedSymbols] = useState<Set<string>>(new Set());
  const [forceRefresh, setForceRefresh] = useState(false);

  // Destructure hook data
  const { results, status, startExtraction, progress } = extractionData;
  
  // Local state for processed trigger data (Derived from results, so safe to be local)
  const [processedStocks, setProcessedStocks] = useState<Record<string, ProcessedInsight[]>>({});
  const [processingData, setProcessingData] = useState(false);

  // Helper to update specific view state fields
  const updateState = (updates: Partial<IntelligentState>) => {
      setViewState(prev => ({ ...prev, ...updates }));
  };

  // 0. Load Available Indices
  useEffect(() => {
    const loadIndices = () => {
        const indices = getTrackedIndices();
        setAvailableIndices(indices);
        
        // Safety check: if current selected index was deleted, default to first available
        if (indices.length > 0 && !indices.includes(viewState.selectedIndex)) {
            updateState({ selectedIndex: indices[0], symbols: [], page: 1 });
        }
    };
    loadIndices();
    
    // Listen for storage changes
    const handleUpdate = () => loadIndices();
    window.addEventListener('fundflow_tracking_update', handleUpdate);
    return () => window.removeEventListener('fundflow_tracking_update', handleUpdate);
  }, [viewState.selectedIndex]);

  // 1. Fetch Index Symbols on Change (Persisted in viewState.symbols)
  useEffect(() => {
     // If we already have symbols for this index, don't refetch unless forced or empty
     if (viewState.symbols.length > 0 && !loadingSymbols) return;
     
     // Only fetch if we have a valid selected index
     if (!viewState.selectedIndex) return;

     const loadSymbols = async () => {
         setLoadingSymbols(true);
         try {
             const data = await fetchIndexConstituents(viewState.selectedIndex);
             updateState({ symbols: data, page: 1 }); // Reset page on index change
             // Clear selection on index change
             setSelectedSymbols(new Set());
         } catch (e) {
             console.error("Failed to fetch index symbols", e);
             updateState({ symbols: [] });
         } finally {
             setLoadingSymbols(false);
         }
     };
     loadSymbols();
  }, [viewState.selectedIndex]); // Only run when index name changes (or on mount if empty)

  // 2. Start Extraction logic (Smart Refresh for Missing Symbols)
  useEffect(() => {
      const isFetching = status === 'initializing' || status === 'polling';
      if (viewState.symbols.length === 0 || isFetching) return;

      // Identify which symbols in the current view don't have results yet
      const missingSymbols = viewState.symbols.filter(sym => !results[sym] || results[sym].length === 0);
      
      if (missingSymbols.length > 0) {
          // Fetch only the missing ones (no force refresh for auto-fetch)
          startExtraction(missingSymbols, BATCH_SIZE, false);
      }
  }, [viewState.symbols, status, results, startExtraction]);

  // 3. Process Raw Results into Intelligent Insights
  useEffect(() => {
      const processResults = async () => {
          if (Object.keys(results).length === 0) {
              setProcessedStocks({});
              return;
          }

          setProcessingData(true);
          const newProcessed: Record<string, ProcessedInsight[]> = {};

          for (const [symbol, items] of Object.entries(results)) {
              // Optimization: Only process symbols relevant to current index to save performance
              if (!viewState.symbols.includes(symbol)) continue;

              const stockInsights: ProcessedInsight[] = [];
              for (const item of items) {
                  if (item.success && (item.type === 'json' || item.data)) {
                       const insight = await processIndicatorData(symbol, item.indicatorName, item.data);
                       if (insight.status === 'triggered') {
                           stockInsights.push(insight);
                       }
                  }
              }
              if (stockInsights.length > 0) {
                  newProcessed[symbol] = stockInsights;
              }
          }
          setProcessedStocks(newProcessed);
          setProcessingData(false);
      };

      const timer = setTimeout(processResults, 1000);
      return () => clearTimeout(timer);
  }, [results, viewState.symbols]);

  // 4. Filter Logic
  const filteredStocks = useMemo(() => {
      return Object.entries(processedStocks).filter(([_, insights]) => {
          if (viewState.filter === "All") return true;
          return insights.some(i => i.type === viewState.filter);
      }).sort((a, b) => b[1].length - a[1].length); 
  }, [processedStocks, viewState.filter]);

  // 5. Pagination Logic
  const paginatedStocks = useMemo(() => {
      const startIndex = (viewState.page - 1) * viewState.pageSize;
      return filteredStocks.slice(startIndex, startIndex + viewState.pageSize);
  }, [filteredStocks, viewState.page, viewState.pageSize]);

  const totalPages = Math.ceil(filteredStocks.length / viewState.pageSize);

  // 6. Update Parent Stats
  useEffect(() => {
      onStatsUpdate({
          filtered: filteredStocks.length,
          total: viewState.symbols.length
      });
  }, [filteredStocks.length, viewState.symbols.length, onStatsUpdate]);

  const handleToggleTrack = (symbol: string) => {
      if (isTracked(symbol, 'STOCK')) {
          removeTrackedItem(symbol, 'STOCK');
      } else {
          addTrackedItem({ id: symbol, name: symbol, symbol, type: 'STOCK' });
      }
      setTrackTick(prev => prev + 1);
  };

  const handleToggleSelect = (symbol: string) => {
      const newSet = new Set(selectedSymbols);
      if (newSet.has(symbol)) {
          newSet.delete(symbol);
      } else {
          newSet.add(symbol);
      }
      setSelectedSymbols(newSet);
  };

  const handleManualRefresh = () => {
      if (selectedSymbols.size > 0) {
          // If specific cards selected, force refresh them
          startExtraction(Array.from(selectedSymbols), BATCH_SIZE, true);
          // Optional: Clear selection or keep it? Keeping it allows re-selection.
          setSelectedSymbols(new Set()); // Clear to indicate action taken
      } else if (viewState.symbols.length > 0) {
          // If no selection, refresh entire view based on force checkbox
          startExtraction(viewState.symbols, BATCH_SIZE, forceRefresh);
      }
  };

  const handleCardRefresh = (symbol: string) => {
      // Single card refresh always forces cache invalidation
      startExtraction([symbol], 1, true);
  };

  return (
    <div className="space-y-6">
       {/* Controls Bar */}
       <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col xl:flex-row items-center justify-between gap-4 shadow-sm">
           
           <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
               {/* Index Selector */}
               <div className="relative w-full md:w-48">
                   <select 
                       value={viewState.selectedIndex}
                       onChange={(e) => {
                           // This triggers symbol reload via effect 1
                           updateState({ selectedIndex: e.target.value, symbols: [], page: 1 }); 
                       }}
                       className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg pl-4 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                       disabled={loadingSymbols || status === 'initializing'}
                   >
                       {availableIndices.map(idx => <option key={idx} value={idx}>{idx}</option>)}
                   </select>
                   <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
               </div>
               
               <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

               {/* Filter Dropdown */}
               <div className="relative w-full md:w-48">
                   <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Filter size={16} className="text-gray-400" />
                   </div>
                   <select 
                       value={viewState.filter}
                       onChange={(e) => updateState({ filter: e.target.value, page: 1 })}
                       className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg pl-9 pr-10 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                   >
                       {FILTER_TYPES.map(type => (
                           <option key={type} value={type}>{type} Insights</option>
                       ))}
                   </select>
                   <ChevronDown size={16} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
               </div>

                {/* Force Refresh Checkbox (Only visible if no selection, as selection implies force) */}
               {selectedSymbols.size === 0 && (
                   <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer whitespace-nowrap ml-2">
                       <input 
                           type="checkbox" 
                           checked={forceRefresh} 
                           visibility=false
                           onChange={(e) => setForceRefresh(e.target.checked)}
                           className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                       />
                       Refresh index cache
                   </label>
               )}
           </div>

           {/* Right Side: Pagination & Status */}
           <div className="flex items-center gap-4 w-full xl:w-auto justify-between xl:justify-end">
               
               {filteredStocks.length > 0 && (
                   <div className="flex items-center gap-3">
                       <div className="flex items-center gap-2">
                           <span className="text-xs text-gray-500">Rows:</span>
                           <select 
                             value={viewState.pageSize} 
                             onChange={(e) => updateState({ pageSize: Number(e.target.value), page: 1 })}
                             className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg p-1.5"
                           >
                               <option value={10}>10</option>
                               <option value={20}>20</option>
                               <option value={50}>50</option>
                               <option value={100}>100</option>
                           </select>
                       </div>

                       <div className="flex items-center gap-1">
                            <button
                                onClick={() => updateState({ page: Math.max(1, viewState.page - 1) })}
                                disabled={viewState.page === 1}
                                className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-medium w-16 text-center">
                                {viewState.page} / {totalPages}
                            </span>
                            <button
                                onClick={() => updateState({ page: Math.min(totalPages, viewState.page + 1) })}
                                disabled={viewState.page === totalPages}
                                className="p-1.5 rounded-md border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={16} />
                            </button>
                       </div>
                   </div>
               )}

               <div className="h-6 w-px bg-gray-200 hidden xl:block"></div>

               {loadingSymbols ? (
                   <span className="text-xs text-gray-500 flex items-center gap-2">
                       <Loader2 size={14} className="animate-spin" /> Fetching Symbols...
                   </span>
               ) : status === 'initializing' || status === 'polling' ? (
                   <div className="flex items-center gap-3">
                       <span className="text-xs text-gray-500 flex items-center gap-2">
                           <Loader2 size={14} className="animate-spin text-indigo-600" /> 
                           Analyzing {progress.completed}/{progress.total}
                       </span>
                   </div>
               ) : (
                   <button 
                       onClick={handleManualRefresh}
                       className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium whitespace-nowrap"
                       title={selectedSymbols.size > 0 ? "Refresh Selected (Forces Update)" : "Refresh List"}
                   >
                       <RefreshCw size={16} />
                       {selectedSymbols.size > 0 ? `Refresh (${selectedSymbols.size})` : ''}
                   </button>
               )}
           </div>
       </div>

       {/* Content Grid */}
       {loadingSymbols ? (
           <div className="flex flex-col items-center justify-center py-20 text-gray-400">
               <Loader2 size={32} className="animate-spin text-indigo-500 mb-2" />
               <p className="text-sm">Loading Index Constituents...</p>
           </div>
       ) : paginatedStocks.length > 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
               {paginatedStocks.map(([symbol, insights]) => (
                   <IntelligentStockCard 
                       key={symbol}
                       symbol={symbol}
                       insights={insights}
                       isTracked={isTracked(symbol, 'STOCK')}
                       onToggleTrack={() => handleToggleTrack(symbol)}
                       onOpenDeepDive={() => onSelectStock(symbol, symbol)}
                       onAskAI={() => onOpenChat(insights.map(i => ({ symbol, type: i.type, insight: i.text, rawData: i.data })))}
                       onRefresh={() => handleCardRefresh(symbol)}
                       isSelected={selectedSymbols.has(symbol)}
                       onToggleSelect={() => handleToggleSelect(symbol)}
                   />
               ))}
           </div>
       ) : (
           <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
               {status === 'initializing' || status === 'polling' || processingData ? (
                   <>
                      <BrainCircuit size={48} className="text-indigo-200 mb-4 animate-pulse" />
                      <h3 className="text-lg font-medium text-gray-900">Analysis in Progress</h3>
                      <p className="text-gray-500 mt-1">Processing data in batches of {BATCH_SIZE}...</p>
                   </>
               ) : (
                   <>
                      <p className="text-gray-500">No stocks found matching your criteria.</p>
                      <p className="text-xs text-gray-400 mt-1">Try changing the filter or refreshing analysis.</p>
                   </>
               )}
           </div>
       )}
    </div>
  );
};

export default IntelligentTrackingManager;
