
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, Search, Plus, Check, Loader2, ChevronLeft, ChevronRight, Briefcase, CheckSquare, Square, ExternalLink, Globe, Trash2, RefreshCw } from 'lucide-react';
import { fetchStockQuote, searchStocksFromMasterList } from '../../services/dataService';
import { getTrackedIndices, getTrackedItems, addTrackedItem, removeTrackedItem } from '../../services/trackingStorage';
import { MARKET_OVERVIEW_INDICES, HEADER_INDICES } from '../../types/constants';
import PortfolioInsightsWidget from './PortfolioInsightsWidget';

interface PortfolioUpdatesProps {
  moversData: any[]; // The list of mover data objects
  onAddMover: (symbol: string) => Promise<void>;
  isLoadingExternal: boolean;
  onViewDetails?: (symbol: string, name: string) => void;
  onRefreshMover?: (symbol: string) => Promise<void>;
  onRemoveMover?: (symbol: string) => void;
}

const PortfolioUpdates: React.FC<PortfolioUpdatesProps> = ({ moversData, onAddMover, isLoadingExternal, onViewDetails, onRefreshMover, onRemoveMover }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ symbol: string; name: string }>>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  // Pagination State
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Load Tracked Indices for comparison
  const [trackedIndices, setTrackedIndices] = useState<string[]>([]);
  const [trackedStockSet, setTrackedStockSet] = useState<Set<string>>(new Set());
  
  // Row refreshing state
  const [refreshingRows, setRefreshingRows] = useState<Set<string>>(new Set());

  useEffect(() => {
      setTrackedIndices(getTrackedIndices());
      refreshTrackedStocks();
      
      const handleUpdate = () => refreshTrackedStocks();
      window.addEventListener('fundflow_tracking_update', handleUpdate);
      return () => window.removeEventListener('fundflow_tracking_update', handleUpdate);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
              setShowDropdown(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const refreshTrackedStocks = () => {
      const items = getTrackedItems().filter(i => i.type === 'STOCK');
      setTrackedStockSet(new Set(items.map(i => i.id)));
  };

  const handleTrackToggle = (e: React.MouseEvent, symbol: string, name: string) => {
      e.stopPropagation();
      if (trackedStockSet.has(symbol)) {
          removeTrackedItem(symbol, 'STOCK');
      } else {
          addTrackedItem({ id: symbol, name: name, symbol, type: 'STOCK' });
      }
  };

  const handleRowRefresh = async (symbol: string) => {
      if (onRefreshMover) {
          setRefreshingRows(prev => new Set(prev).add(symbol));
          await onRefreshMover(symbol);
          setRefreshingRows(prev => {
              const next = new Set(prev);
              next.delete(symbol);
              return next;
          });
      }
  };

  // Expanded Search Logic using Master List
  useEffect(() => {
      const timeoutId = setTimeout(async () => {
          if (searchQuery.trim().length >= 2) {
              setIsSearching(true);
              setShowDropdown(true);
              try {
                  const results = await searchStocksFromMasterList(searchQuery);
                  // Do not filter out already added stocks; we will indicate them visually
                  setSearchResults(results);
              } catch (error) {
                  console.error("Search failed", error);
                  setSearchResults([]);
              } finally {
                  setIsSearching(false);
              }
          } else {
              setSearchResults([]);
              setShowDropdown(false);
          }
      }, 300);

      return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleAdd = async (symbol: string) => {
      await onAddMover(symbol);
      // Keep search active for multiple selections
  };

  // Pagination Logic
  const totalPages = Math.ceil(moversData.length / pageSize);
  const paginatedData = moversData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => {
      if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(totalPages);
      }
  }, [moversData.length, totalPages]);

  // Combine all indices that are relevant to the dashboard (User Tracked + Default Market Overview + Headers)
  const allDashboardIndices = useMemo(() => {
      const combined = new Set([
          ...trackedIndices,
          ...MARKET_OVERVIEW_INDICES,
          ...HEADER_INDICES
      ]);
      return Array.from(combined);
  }, [trackedIndices]);
  
  // Prepare list of symbols currently in the table to pass to the widget
  const currentTableSymbols = useMemo(() => moversData.map(m => m.symbol), [moversData]);

  return (
    <div className="space-y-4">
       <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-2">
               <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                   <TrendingUp size={18} />
               </div>
               <h3 className="text-lg font-bold text-gray-900">Portfolio Updates</h3>
               {moversData.length > 0 && (
                   <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                       {moversData.length}
                   </span>
               )}
           </div>

           {/* Search Input */}
           <div className="relative w-full sm:w-80 z-20" ref={searchContainerRef}>
               <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                   <Search size={14} className="text-gray-400" />
               </div>
               <input 
                   type="text"
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   onFocus={() => { if(searchQuery.length >= 2) setShowDropdown(true); }}
                   placeholder="Search stock to add (e.g. RELIANCE)..."
                   className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
               />
               {isLoadingExternal && (
                   <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                       <Loader2 size={14} className="animate-spin text-indigo-600" />
                   </div>
               )}

               {/* Dropdown Results */}
               {showDropdown && searchQuery && (
                   <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                       {isSearching ? (
                           <div className="p-3 text-center text-xs text-gray-400">Searching...</div>
                       ) : searchResults.length > 0 ? (
                           searchResults.map(res => {
                               const isAdded = moversData.some(m => m.symbol === res.symbol);
                               return (
                                   <div 
                                       key={res.symbol}
                                       onClick={() => !isAdded && handleAdd(res.symbol)}
                                       className={`px-4 py-2 text-sm flex items-center justify-between border-b border-gray-50 last:border-0 group transition-colors ${
                                           isAdded ? 'cursor-default bg-gray-50 opacity-70' : 'cursor-pointer hover:bg-gray-50'
                                       }`}
                                   >
                                       <div className="flex flex-col">
                                           <span className={`font-bold text-xs ${isAdded ? 'text-gray-500' : 'text-gray-800'}`}>{res.symbol}</span>
                                           <span className="text-[10px] text-gray-500 truncate max-w-[200px]">{res.name}</span>
                                       </div>
                                       {isAdded ? (
                                           <Check size={14} className="text-green-600" />
                                       ) : (
                                           <Plus size={14} className="text-gray-400 group-hover:text-indigo-600" />
                                       )}
                                   </div>
                               );
                           })
                       ) : (
                           <div className="p-3 text-center text-xs text-gray-400">
                               No matching stocks found.
                           </div>
                       )}
                   </div>
               )}
           </div>
       </div>

       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
           {moversData.length === 0 ? (
               <div className="p-12 text-center text-gray-400 text-sm italic">
                   No stocks added yet. Search or click from Index Insights to add.
               </div>
           ) : (
               <>
                   <div className="overflow-x-auto">
                       <table className="w-full text-xs text-left whitespace-nowrap">
                           <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200">
                               <tr>
                                   <th className="px-4 py-3 w-10"></th> {/* Tracking Checkbox */}
                                   <th className="px-4 py-3">Stock</th>
                                   <th className="px-4 py-3 text-right">Price (Chg%)</th>
                                   <th className="px-4 py-3 text-center">Valuation</th>
                                   <th className="px-4 py-3 text-center">Delivery</th>
                                   <th className="px-4 py-3 text-center">Sec. Index</th>
                                   <th className="px-4 py-3">Sector</th>
                                   <th className="px-4 py-3 text-center w-28">52W Range</th>
                                   <th className="px-4 py-3">Tracked Via</th>
                                   <th className="px-4 py-3 text-right">Actions</th>
                               </tr>
                           </thead>
                           <tbody className="bg-white divide-y divide-gray-50">
                               {paginatedData.map((stock, idx) => {
                                   const isPos = stock.change >= 0;
                                   const rangePos = ((stock.lastPrice - stock.yearLow) / (stock.yearHigh - stock.yearLow)) * 100;
                                   const isTracked = trackedStockSet.has(stock.symbol);
                                   const isRowRefreshing = refreshingRows.has(stock.symbol);
                                   
                                   // Identify matching indices (Case Insensitive Check)
                                   const matchedIndices = stock.indexList?.filter((idxName: string) => 
                                       allDashboardIndices.some(dashboardIdx => dashboardIdx.toLowerCase() === idxName.toLowerCase())
                                   ) || [];

                                   const sectorTooltip = [stock.macro, stock.sector, stock.basicIndustry].filter(Boolean).join(" > ");
                                   
                                   // Generate NSE Link
                                   const companySlug = stock.companyName ? stock.companyName.replace(/\s+/g, '-') : '';
                                   const nseUrl = `https://www.nseindia.com/get-quote/equity/${encodeURIComponent(stock.symbol)}/${encodeURIComponent(companySlug)}`;

                                   // Logic for Sector Index Display (Priority: pdSectorInd -> indexList[0])
                                   let displaySectorIndex = stock.pdSectorInd;
                                   if (!displaySectorIndex || displaySectorIndex === '-') {
                                       displaySectorIndex = stock.indexList && stock.indexList.length > 0 ? stock.indexList[0] : null;
                                   }

                                   return (
                                       <tr key={`${stock.symbol}-${idx}`} className="hover:bg-gray-50 transition-colors">
                                           {/* Tracking Checkbox */}
                                           <td className="px-4 py-3 text-center">
                                                <button 
                                                    onClick={(e) => handleTrackToggle(e, stock.symbol, stock.companyName)}
                                                    className={`transition-colors ${isTracked ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-500'}`}
                                                    title={isTracked ? "Remove from Watchlist" : "Add to Watchlist"}
                                                >
                                                    {isTracked ? <CheckSquare size={16} /> : <Square size={16} />}
                                                </button>
                                           </td>

                                           <td className="px-4 py-3">
                                               <div 
                                                    className="flex flex-col group cursor-pointer"
                                                    onClick={() => onViewDetails && onViewDetails(stock.symbol, stock.companyName)}
                                               >
                                                   <div className="flex items-center gap-1.5">
                                                       <span className="font-bold text-indigo-700 group-hover:underline">
                                                           {stock.symbol}
                                                       </span>
                                                       
                                                       {/* Widget Icon wrapped to prevent click propagation if needed, handled inside component though */}
                                                       <div onClick={(e) => e.stopPropagation()}>
                                                           <PortfolioInsightsWidget 
                                                                onAddToMover={async (s) => { if (!moversData.some(m => m.symbol === s)) await onAddMover(s) }}
                                                                onNavigateStock={onViewDetails}
                                                                addedSymbols={currentTableSymbols}
                                                                initialSymbolContext={stock.symbol}
                                                           />
                                                       </div>

                                                       <a 
                                                            href={nseUrl} 
                                                            target="_blank" 
                                                            rel="noreferrer" 
                                                            className="text-gray-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"
                                                            title="View on NSE India"
                                                            onClick={(e) => e.stopPropagation()}
                                                       >
                                                           <ExternalLink size={12} />
                                                       </a>
                                                   </div>
                                                   <div className="text-[10px] text-gray-500 truncate max-w-[140px]" title={stock.companyName}>
                                                       {stock.companyName}
                                                   </div>
                                               </div>
                                           </td>
                                           <td className="px-4 py-3 text-right">
                                               <div className={`font-mono font-medium text-gray-800 ${isRowRefreshing ? 'opacity-50' : ''}`}>
                                                   {stock.lastPrice?.toLocaleString() ?? '-'} 
                                                   <span className={`ml-1 text-[10px] ${isPos ? 'text-green-600' : 'text-red-600'}`}>
                                                       ({isPos ? '+' : ''}{stock.pChange}%)
                                                   </span>
                                               </div>
                                           </td>
                                           <td className="px-4 py-3 text-center">
                                               <div className="flex flex-col items-center">
                                                   {stock.pdSymbolPe && stock.pdSymbolPe !== '-' ? (
                                                       <span className="font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                                                           {stock.pdSymbolPe}
                                                       </span>
                                                   ) : <span className="text-gray-300">-</span>}
                                                   <span className="text-[9px] text-gray-400 mt-0.5">
                                                       Sec: {stock.pdSectorPe || '-'}
                                                   </span>
                                               </div>
                                           </td>
                                           <td className="px-4 py-3 text-center font-mono text-gray-600 text-xs">
                                               {stock.delivery ? `${stock.delivery}%` : '-'}
                                           </td>
                                           <td className="px-4 py-3 text-center">
                                               {displaySectorIndex && displaySectorIndex !== '-' ? (
                                                   <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[10px] whitespace-nowrap">
                                                       {displaySectorIndex}
                                                   </span>
                                               ) : <span className="text-gray-300">-</span>}
                                           </td>
                                           <td className="px-4 py-3">
                                               <span 
                                                    className="text-gray-600 truncate max-w-[120px] block cursor-help decoration-dotted underline underline-offset-2" 
                                                    title={sectorTooltip}
                                               >
                                                   {stock.basicIndustry || stock.sector || '-'}
                                               </span>
                                           </td>
                                           <td className="px-4 py-3 text-center">
                                               <div className="flex flex-col gap-1 w-full max-w-[100px] mx-auto">
                                                   <div className="flex justify-between text-[9px] text-gray-400">
                                                       <span>{stock.yearLow?.toLocaleString() ?? '-'}</span>
                                                       <span>{stock.yearHigh?.toLocaleString() ?? '-'}</span>
                                                   </div>
                                                   <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden relative">
                                                       <div 
                                                           className="absolute h-full w-1.5 bg-indigo-600 rounded-full top-0 ml-[-3px]" 
                                                           style={{ left: `${Math.min(Math.max(rangePos || 0, 0), 100)}%` }}
                                                       ></div>
                                                   </div>
                                               </div>
                                           </td>
                                           <td className="px-4 py-3">
                                               <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                   {matchedIndices.length > 0 ? matchedIndices.map((idxName: string) => (
                                                       <span key={idxName} className="px-1.5 py-0.5 bg-orange-50 text-orange-700 border border-orange-100 rounded text-[9px]">
                                                           {idxName}
                                                       </span>
                                                   )) : (
                                                       <span className="text-gray-300 text-[10px] italic">None</span>
                                                   )}
                                               </div>
                                           </td>
                                           {/* Actions Column */}
                                           <td className="px-4 py-3 text-right">
                                               <div className="flex items-center justify-end gap-2">
                                                   <button 
                                                       onClick={() => handleRowRefresh(stock.symbol)}
                                                       disabled={isRowRefreshing}
                                                       className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                                       title="Refresh Stock Data"
                                                   >
                                                       <RefreshCw size={14} className={isRowRefreshing ? 'animate-spin text-indigo-600' : ''} />
                                                   </button>
                                                   {onRemoveMover && (
                                                       <button 
                                                           onClick={() => onRemoveMover(stock.symbol)}
                                                           className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                           title="Remove from Table"
                                                       >
                                                           <Trash2 size={14} />
                                                       </button>
                                                   )}
                                               </div>
                                           </td>
                                       </tr>
                                   );
                               })}
                           </tbody>
                       </table>
                   </div>

                   {/* Pagination */}
                   <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
                       <div className="flex items-center gap-2">
                           <span className="text-xs text-gray-500">Rows:</span>
                           <select 
                               value={pageSize} 
                               onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                               className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg p-1 focus:ring-indigo-500 focus:border-indigo-500"
                           >
                               <option value={5}>5</option>
                               <option value={10}>10</option>
                               <option value={20}>20</option>
                           </select>
                       </div>
                       
                       <div className="flex items-center gap-2">
                           <button
                               onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                               disabled={currentPage === 1}
                               className="p-1 rounded-md bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-50 text-gray-600"
                           >
                               <ChevronLeft size={14} />
                           </button>
                           <span className="text-xs text-gray-600 font-medium">
                               {currentPage} / {totalPages || 1}
                           </span>
                           <button
                               onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                               disabled={currentPage === totalPages || totalPages === 0}
                               className="p-1 rounded-md bg-white border border-gray-200 hover:bg-gray-100 disabled:opacity-50 text-gray-600"
                           >
                               <ChevronRight size={14} />
                           </button>
                       </div>
                   </div>
               </>
           )}
       </div>
    </div>
  );
};

export default PortfolioUpdates;
