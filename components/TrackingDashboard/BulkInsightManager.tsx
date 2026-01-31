
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Loader2, RefreshCw, MessageSquare, Check, LayoutGrid, List, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { TrackedItem } from '../../services/trackingStorage';
import { InsightResultItem } from '../../types/trackingTypes';

// Import Card Components
import BaseInsightCard from './cards/BaseInsightCard';
import PECard from './cards/PECard';
import DetailedPECard from './cards/DetailedPECard';
import MFHoldingsCard from './cards/MFHoldingsCard';
import QuarterlyHoldingsCard from './cards/QuarterlyHoldingsCard';
import BulkBlockDealsCard from './cards/BulkBlockDealsCard';
import InsiderDealsCard from './cards/InsiderDealsCard';
import TechnicalCard from './cards/TechnicalCard';
import FinancialsCard from './cards/FinancialsCard';
import DefaultInsightCard from './cards/DefaultInsightCard';

interface BulkInsightManagerProps {
  items: TrackedItem[];
  // Replaced individual state props with hook object
  extractionData: {
      results: Record<string, InsightResultItem[]>;
      status: 'idle' | 'initializing' | 'polling' | 'completed' | 'error';
      startExtraction: (symbols: string[], batchSize?: number, invalidateCache?: boolean) => Promise<void>;
      progress: { completed: number; total: number };
      setResults: React.Dispatch<React.SetStateAction<Record<string, InsightResultItem[]>>>;
  };
  onOpenChat: (context: any[]) => void;
  onSelectStock: (symbol: string, name: string) => void;
}

// --- MultiSelect Component ---
interface MultiSelectProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
}

const MultiSelect: React.FC<MultiSelectProps> = ({ label, options, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter(s => s !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    return (
        <div className="relative flex-1 min-w-[140px]" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg px-3 py-2 hover:bg-white hover:border-gray-300 transition-colors"
            >
                <span className="truncate">
                    {selected.length === 0 ? `All ${label}` : `${selected.length} ${label}`}
                </span>
                <ChevronDown size={14} className="text-gray-400 ml-2" />
            </button>

            {isOpen && (
                <div 
                    className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto p-1"
                    onMouseDown={(e) => e.stopPropagation()} 
                >
                    <div 
                        onClick={() => onChange([])}
                        className={`px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-indigo-50 flex items-center justify-between ${selected.length === 0 ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-gray-700'}`}
                    >
                        <span>All {label}</span>
                        {selected.length === 0 && <Check size={14} />}
                    </div>
                    {options.map(opt => (
                        <div 
                            key={opt}
                            onClick={() => toggleOption(opt)}
                            className={`px-3 py-2 text-sm rounded-md cursor-pointer hover:bg-gray-50 flex items-center justify-between ${selected.includes(opt) ? 'bg-gray-50 text-gray-900 font-medium' : 'text-gray-600'}`}
                        >
                            <span className="truncate mr-2">{opt}</span>
                            {selected.includes(opt) && <Check size={14} className="text-indigo-600 flex-shrink-0" />}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const BulkInsightManager: React.FC<BulkInsightManagerProps> = ({ 
  items, 
  extractionData,
  onOpenChat,
  onSelectStock
}) => {
  const { results, status, startExtraction, progress, setResults } = extractionData;
  
  // Local UI State
  const [selectedCards, setSelectedCards] = useState<Set<string>>(new Set());
  
  // Multi-select filters (empty array means ALL)
  const [filterSymbols, setFilterSymbols] = useState<string[]>([]);
  const [filterIndicators, setFilterIndicators] = useState<string[]>([]);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  
  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterSymbols, filterIndicators]);

  // --- Actions ---

  const handleStartExtraction = () => {
    setResults({});
    const stockSymbols = items.filter(i => i.type === 'STOCK').map(i => i.id);
    if (stockSymbols.length === 0) return;
    
    // Batch size of 10 enforced here as per requirement
    startExtraction(stockSymbols, 10, true);
  };

  // --- Auto Fetch Logic ---
  useEffect(() => {
    const stockItems = items.filter(i => i.type === 'STOCK');
    const hasItems = stockItems.length > 0;
    
    // Check if we are missing results for any tracked stock
    // We check if result exists and has items
    const missingResults = stockItems.some(i => !results[i.id] || results[i.id].length === 0);

    const shouldFetch = hasItems && 
                        status !== 'polling' && 
                        status !== 'initializing' &&
                        (status === 'idle' || missingResults);

    if (shouldFetch) {
        const stockSymbols = stockItems.map(i => i.id);
        // Batch size 10, no invalidate for auto-fetch
        startExtraction(stockSymbols, 10, false);
    }
  }, [items, status, results, startExtraction]); 

  // --- Selection Logic ---

  const toggleCardSelection = (symbol: string, indicator: string) => {
      const key = `${symbol}|${indicator}`;
      const newSet = new Set(selectedCards);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      setSelectedCards(newSet);
  };

  const handleAnalyzeSelection = () => {
      const selectedData: any[] = [];
      selectedCards.forEach(key => {
          const [sym, ind] = key.split('|');
          const item = results[sym]?.find(i => i.indicatorName === ind);
          if (item) {
              selectedData.push({ symbol: sym, indicator: ind, data: item.data });
          }
      });
      if (selectedData.length > 0) onOpenChat(selectedData);
  };

  const getStockName = (sym: string) => {
      const item = items.find(i => i.id === sym);
      return item ? item.name : sym;
  };

  // --- Render Factory ---

  const renderSpecificCard = (indicator: string, data: any) => {
      switch(indicator) {
          case 'PE':
              return <PECard data={data} />;
          case 'DetailledPE':
              return <DetailedPECard data={data} />;
          case 'MFHoldings':
              return <MFHoldingsCard data={data} />;
          case 'QuaterlyHoldings':
              return <QuarterlyHoldingsCard data={data} />;
          case 'Bulk/Block Deals':
              return <BulkBlockDealsCard data={data} />;
          case 'Insider/SAST Deals':
              return <InsiderDealsCard data={data} />;
          case 'Technical':
              return <TechnicalCard data={data} />;
          case 'FinancialInsights':
              return <FinancialsCard data={data} />;
          default:
              return <DefaultInsightCard data={data} />;
      }
  };

  const flatItems = useMemo(() => {
      const flat: Array<{ symbol: string; item: InsightResultItem }> = [];
      Object.entries(results).forEach(([symbol, val]) => {
          const indicators = val as InsightResultItem[];
          if (filterSymbols.length > 0 && !filterSymbols.includes(symbol)) return;

          indicators.forEach(item => {
              if (filterIndicators.length > 0 && !filterIndicators.includes(item.indicatorName)) return;
              flat.push({ symbol, item });
          });
      });
      return flat;
  }, [results, filterSymbols, filterIndicators]);

  // --- Pagination Slice ---
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return flatItems.slice(startIndex, startIndex + pageSize);
  }, [flatItems, currentPage, pageSize]);

  const totalPages = Math.ceil(flatItems.length / pageSize);

  const uniqueSymbols = Object.keys(results);
  const uniqueIndicators = Array.from(new Set((Object.values(results).flat() as InsightResultItem[]).map(i => i.indicatorName)));

  if (items.filter(i => i.type === 'STOCK').length === 0) return null;

  return (
    <div className="space-y-4">
      {/* Control Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col xl:flex-row items-center justify-between gap-4 shadow-sm z-30 relative">
         <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full xl:w-auto">
             
             {/* Left Group: View & Filters */}
             <div className="flex items-center gap-4 w-full md:w-auto">
                {/* View Toggle */}
                <div className="flex bg-gray-100 p-1 rounded-lg shrink-0">
                  <button 
                      onClick={() => setViewMode('grid')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                      title="Grid View"
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button 
                      onClick={() => setViewMode('list')}
                      className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                      title="List View"
                  >
                    <List size={16} />
                  </button>
                </div>

                <div className="h-6 w-px bg-gray-200 mx-1 hidden md:block"></div>

                {/* Multi-Select Filters */}
                <div className="flex gap-2 w-full md:w-auto flex-wrap">
                    <MultiSelect 
                        label="Stocks" 
                        options={uniqueSymbols} 
                        selected={filterSymbols} 
                        onChange={setFilterSymbols} 
                    />
                    
                    <MultiSelect 
                        label="Indicators" 
                        options={uniqueIndicators} 
                        selected={filterIndicators} 
                        onChange={setFilterIndicators} 
                    />
                </div>
             </div>

             {/* Pagination Controls */}
             {flatItems.length > 0 && (
                <div className="flex items-center gap-3 pl-0 md:pl-4 md:border-l border-gray-200 w-full md:w-auto justify-between md:justify-start">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 font-medium">Rows:</span>
                      <select 
                        value={pageSize} 
                        onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                        className="bg-gray-50 border border-gray-200 text-gray-700 text-xs rounded-lg p-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="p-1.5 rounded-md bg-gray-50 text-gray-600 border border-gray-200 hover:bg-white hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                           <ChevronLeft size={14} />
                        </button>
                        <span className="text-xs text-gray-600 font-medium whitespace-nowrap min-w-[60px] text-center">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="p-1.5 rounded-md bg-gray-50 text-gray-600 border border-gray-200 hover:bg-white hover:border-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                           <ChevronRight size={14} />
                        </button>
                    </div>
                </div>
             )}
         </div>

         {/* Right Group: Actions */}
         <div className="flex items-center gap-3 w-full xl:w-auto justify-end border-t xl:border-t-0 border-gray-100 pt-3 xl:pt-0">
             {selectedCards.size > 0 && (
                 <button 
                    onClick={handleAnalyzeSelection}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm whitespace-nowrap"
                 >
                     <MessageSquare size={16} />
                     Analyze Selected ({selectedCards.size})
                 </button>
             )}

            {status === 'polling' || status === 'initializing' ? (
                <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm whitespace-nowrap">
                    <Loader2 size={16} className="animate-spin" />
                    <span>
                      {status === 'initializing' ? 'Initializing...' : `${progress.completed}/${progress.total}`}
                    </span>
                </div>
            ) : (
                <button 
                    onClick={handleStartExtraction}
                    className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
                    title="Refresh Data"
                >
                    <RefreshCw size={20} />
                </button>
            )}
         </div>
      </div>

      {/* Loading Skeleton */}
      {flatItems.length === 0 && (status === 'initializing' || status === 'polling') && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-pulse">
             {[...Array(6)].map((_, i) => (
                 <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 h-40 flex flex-col justify-between">
                    <div className="flex justify-between items-center mb-4">
                        <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                        <div className="h-4 bg-gray-200 rounded w-4"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="h-3 bg-gray-100 rounded w-full"></div>
                        <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                        <div className="h-3 bg-gray-100 rounded w-4/6"></div>
                    </div>
                 </div>
             ))}
          </div>
      )}

      {/* Empty State */}
      {flatItems.length === 0 && status !== 'polling' && status !== 'initializing' && (
          <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-500">
                  {uniqueSymbols.length > 0 ? "No data matches your filters." : "No data loaded yet. Auto-fetching..."}
              </p>
          </div>
      )}

      {/* Grid vs List View */}
      <div className={`
        ${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'flex flex-col gap-3'}
      `}>
          {paginatedItems.map(({ symbol, item }, idx) => {
              const cardKey = `${symbol}|${item.indicatorName}`;
              const isSelected = selectedCards.has(cardKey);
              // Hook handles 'json' type conversion, so non-json means still processing or raw
              // Fix: For Technical cards (and other non-Gemini cards), they don't convert to 'json' via the hook
              // so we shouldn't wait for 'json' type if geminiParsingReq is false.
              const isProcessing = item.success && item.geminiParsingReq && item.type !== 'json';

              return (
                  <BaseInsightCard
                    key={`${cardKey}-${idx}`}
                    symbol={symbol}
                    indicatorName={item.indicatorName}
                    url={item.url}
                    isProcessing={isProcessing}
                    success={item.success}
                    isSelected={isSelected}
                    onToggleSelect={() => toggleCardSelection(symbol, item.indicatorName)}
                    onStockClick={() => onSelectStock(symbol, getStockName(symbol))}
                  >
                     {renderSpecificCard(item.indicatorName, item.data)}
                  </BaseInsightCard>
              );
          })}
      </div>
    </div>
  );
};

export default BulkInsightManager;
