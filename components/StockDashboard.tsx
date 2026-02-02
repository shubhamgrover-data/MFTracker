
import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, ExternalLink,History, TrendingUp, TrendingDown, Layers, Loader2, Search, Filter, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, BarChart2, RefreshCw, ChevronDown, ChevronUp, CheckSquare, Square } from 'lucide-react';
import { StockPriceData, StockMFAnalysis, MutualFundHolding, FundSearchResult } from '../types';
import { fetchLiveStockPrice, fetchMutualFundHoldingsForStock } from '../services/dataService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import StockDeepDive from './StockDeepDive';
import { getTrackedItems, addTrackedItem, removeTrackedItem } from '../services/trackingStorage';

interface StockDashboardProps {
  symbol: string;
  stockName: string;
  onBack: () => void;
  onSelectFund: (fund: FundSearchResult) => void;
}

type SortField = 'sharesHeld' | 'aum' | 'changePercent' | 'change' | 'aumPercent';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 50;

const StockDashboard: React.FC<StockDashboardProps> = ({ symbol, stockName, onBack, onSelectFund }) => {
  const [priceData, setPriceData] = useState<StockPriceData | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  
  const [mfData, setMfData] = useState<StockMFAnalysis | null>(null);
  const [loadingMF, setLoadingMF] = useState(false);
  
  const [filterQuery, setFilterQuery] = useState('');
  
  // Sorting State
  const [sortField, setSortField] = useState<SortField>('sharesHeld');
  const [sortMonth, setSortMonth] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Section visibility states
  const [isHoldingsExpanded, setIsHoldingsExpanded] = useState(true);

  // MF Tracking State
  const [trackedMFSet, setTrackedMFSet] = useState<Set<string>>(new Set());
  const [showTrackedOnly, setShowTrackedOnly] = useState(false);

  // Load tracked items
  useEffect(() => {
      const updateTracked = () => {
          const items = getTrackedItems().filter(i => i.type === 'MF');
          setTrackedMFSet(new Set(items.map(i => i.id))); // Use ID which might be PK or Name
      };
      updateTracked();
      window.addEventListener('fundflow_tracking_update', updateTracked);
      return () => window.removeEventListener('fundflow_tracking_update', updateTracked);
  }, []);

  const loadData = async () => {
      setLoadingPrice(true);
      setLoadingMF(true);
      
      const p1 = fetchLiveStockPrice(symbol).then(data => {
        setPriceData(data);
        setLoadingPrice(false);
      });
      
      const p2 = fetchMutualFundHoldingsForStock(symbol).then(data => {
        setMfData(data);
        setLoadingMF(false);
      });

      await Promise.all([p1, p2]);
  };

  // Fetch Data on Mount
  useEffect(() => {
    loadData();
  }, [symbol, stockName]);

  const handleRefreshPrice = async () => {
    setLoadingPrice(true);
    const data = await fetchLiveStockPrice(symbol);
    setPriceData(data);
    setLoadingPrice(false);
  };

  const handleRefreshAll = () => {
      loadData();
  };

  // Determine available months from data
  const monthColumns = useMemo(() => {
    if (!mfData || mfData.holdings.length === 0) return [];
    const allMonths = Array.from(new Set(mfData.holdings.flatMap(h => h.history.map(hist => hist.month)))) as string[];
    // Sort descending by date
    const sortedMonths = allMonths.sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).slice(0, 3);
    
    // Set default sort month if not set
    if (!sortMonth && sortedMonths.length > 0) {
      setSortMonth(sortedMonths[0]);
    }
    
    return sortedMonths;
  }, [mfData, sortMonth]);

  // Helper to extract ID from URL or Name
  const getMfId = (url: string, name: string) => {
      const matches = url.match(/\/(\d+)\//);
      if (matches && matches[1]) return matches[1];
      return name;
  };

  const handleTrackMF = (e: React.MouseEvent, mfName: string, mfUrl: string) => {
      e.stopPropagation();
      const id = getMfId(mfUrl, mfName);
      
      // Check if tracked by checking if ID is in set or Name is in set (fallback)
      const isTracked = trackedMFSet.has(id) || trackedMFSet.has(mfName);

      if (isTracked) {
          // Try removing by both potential keys
          removeTrackedItem(id, 'MF');
          removeTrackedItem(mfName, 'MF');
      } else {
          addTrackedItem({ id, name: mfName, type: 'MF', url: mfUrl });
      }
  };

  // Filter and Sort Logic
  const filteredSortedHoldings = useMemo(() => {
    if (!mfData) return [];
    
    let result = mfData.holdings.filter(h => 
      h.fundName.toLowerCase().includes(filterQuery.toLowerCase())
    );

    if (showTrackedOnly) {
        result = result.filter(h => {
            const id = getMfId(h.fundUrl, h.fundName);
            return trackedMFSet.has(id) || trackedMFSet.has(h.fundName);
        });
    }

    const targetMonth = sortMonth || monthColumns[0];

    result.sort((a, b) => {
      const dataA = a.history.find(h => h.month === targetMonth);
      const dataB = b.history.find(h => h.month === targetMonth);
      
      // Handle missing data for specific months (treat as 0 or min value)
      const valA = dataA ? (dataA[sortField] || 0) : -Infinity;
      const valB = dataB ? (dataB[sortField] || 0) : -Infinity;

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [mfData, filterQuery, sortField, sortDirection, sortMonth, monthColumns, showTrackedOnly, trackedMFSet]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredSortedHoldings.length / ITEMS_PER_PAGE);
  const paginatedHoldings = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSortedHoldings.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSortedHoldings, currentPage]);

  // Reset pagination when filter/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterQuery, sortField, sortDirection, sortMonth, showTrackedOnly]);

  const handleSort = (field: SortField, month: string) => {
    if (sortField === field && sortMonth === month) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortMonth(month);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field, month }: { field: SortField, month: string }) => {
    const isActive = sortField === field && sortMonth === month;
    if (!isActive) return <div className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-30"></div>;
    return sortDirection === 'asc' 
      ? <ArrowUp size={12} className="ml-1 text-indigo-600" />
      : <ArrowDown size={12} className="ml-1 text-indigo-600" />;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      <div className="flex justify-between items-center">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Search
        </button>
      </div>

      {/* Top Section: Price & Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  {stockName}
                  {mfData?.sourceUrl && (
                    <a 
                      href={mfData.sourceUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-gray-400 hover:text-indigo-600 transition-colors"
                      title="View full report on Trendlyne"
                    >
                      <ExternalLink size={20} />
                    </a>
                  )}
                  <button 
                    onClick={handleRefreshAll} 
                    disabled={loadingPrice || loadingMF}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                    title="Refresh All Data"
                  >
                     <RefreshCw size={18} className={loadingPrice || loadingMF ? "animate-spin text-indigo-600" : ""} />
                  </button>
                </h1>
                <div className="flex items-center gap-2 text-gray-500 text-sm mt-1 flex-wrap">
                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-xs">{symbol}</span>
                  <span>•</span>
                  <span>NSE/BSE</span>
                  {mfData && (
                    <>
                      <span>•</span>
                      <span className="font-medium text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-xs">
                         MF Count: {mfData.holdings.length}
                      </span>
                    </>
                  )}
                </div>
              </div>
              {priceData ? (
                <div className="text-right">
                    <div className="flex items-center justify-end gap-3 mb-1">
                        <div className="text-2xl font-bold text-gray-900">₹{priceData.current_price}</div>
                        <button 
                            onClick={handleRefreshPrice} 
                            disabled={loadingPrice}
                            className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors"
                            title="Refresh Price Only"
                        >
                            <RefreshCw size={14} className={loadingPrice ? "animate-spin" : ""} />
                        </button>
                    </div>
                    
                    <div className="flex items-center justify-end gap-2 text-sm">
                        <span className="text-gray-500 font-medium text-xs bg-gray-50 px-1.5 py-0.5 rounded" title="Volume">
                           V: {priceData.volume}
                        </span>
                        <span className={`flex items-center font-medium ${
                           priceData.todays_change_direction === 'up' ? 'text-green-600' : 
                           priceData.todays_change_direction === 'down' ? 'text-red-600' : 'text-gray-500'
                        }`}>
                            {priceData.todays_change_direction === 'up' ? <TrendingUp size={14} className="mr-1" /> : 
                             priceData.todays_change_direction === 'down' ? <TrendingDown size={14} className="mr-1" /> : null}
                            {priceData.todays_change_number} ({priceData.todays_change_percentage})
                        </span>
                    </div>
                    <div className="text-[10px] text-gray-400 mt-1">
                       Updated: {priceData.last_updated}
                    </div>
                </div>
              ) : loadingPrice ? (
                 <div className="text-right">
                    <div className="h-8 w-24 bg-gray-100 animate-pulse rounded mb-1 ml-auto"></div>
                    <div className="h-4 w-16 bg-gray-100 animate-pulse rounded ml-auto"></div>
                 </div>
              ) : null}
            </div>
            
            {loadingPrice && !priceData && (
              <div className="flex items-center gap-2 text-indigo-600 text-sm mt-2">
                <Loader2 className="animate-spin" size={16} /> Fetching live price...
              </div>
            )}
            
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-100">
             <div className="text-sm text-gray-500 mb-1">Stock Analysis</div>
             <p className="text-xs text-gray-400">
               Real-time data fetched from market sources via Gemini. MF data aggregated from monthly disclosures.
             </p>
          </div>
        </div>
      </div>
      
      {/* Deep Dive Analysis Component (Collapsible Managed Internally) */}
      <StockDeepDive symbol={symbol} stockName={stockName} />

      {/* Holdings Table Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
        {/* Header */}
        <div 
            className="p-4 border-b border-gray-100 bg-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => setIsHoldingsExpanded(!isHoldingsExpanded)}
        >
           <div className="flex items-center gap-3">
               <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                   <Layers size={18} />
               </div>
               <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  Mutual Fund Portfolios
                  {!isHoldingsExpanded && <span className="text-xs text-gray-400 font-normal">({filteredSortedHoldings.length} records)</span>}
               </h3>
           </div>
           
           <div className="flex items-center gap-4 w-full md:w-auto" onClick={(e) => e.stopPropagation()}>
               {/* Tracked Filter */}
               {isHoldingsExpanded && (
                   <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer select-none bg-white px-2 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-200 transition-all">
                        <input 
                            type="checkbox" 
                            checked={showTrackedOnly} 
                            onChange={(e) => setShowTrackedOnly(e.target.checked)}
                            className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="font-medium">Tracked MFs</span>
                        {showTrackedOnly && (
                            <span className="bg-indigo-100 text-indigo-700 text-[10px] px-1.5 rounded-full font-bold">
                                {filteredSortedHoldings.length}
                            </span>
                        )}
                   </label>
               )}

               {/* Search */}
               {isHoldingsExpanded && (
                   <div className="relative w-full md:w-64">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="w-4 h-4 text-gray-400" />
                      </div>
                      <input 
                        type="text" 
                        className="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-9 p-2 shadow-sm" 
                        placeholder="Filter funds..." 
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                      />
                   </div>
               )}

               <button 
                   className="text-gray-400 hover:text-gray-600"
                   onClick={() => setIsHoldingsExpanded(!isHoldingsExpanded)}
               >
                   {isHoldingsExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
               </button>
           </div>
        </div>

        {/* Collapsible Content */}
        {isHoldingsExpanded && (
            <>
                <div className="overflow-x-auto">
                  {loadingMF ? (
                    <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-3">
                       <Loader2 className="animate-spin text-indigo-500" size={32} />
                       <p>Fetching detailed holdings...</p>
                    </div>
                  ) : (
                    <table className="w-full text-sm text-left text-gray-500 border-collapse">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                        {/* Header Row 1: Grouped Month Names */}
                        <tr>
                          <th rowSpan={2} className="px-6 py-4 font-semibold border-r border-gray-200 bg-gray-50 sticky left-0 z-10 w-64 min-w-[250px]">
                            MF Name
                          </th>
                          {monthColumns.map((month, index) => (
                            <th 
                              key={month} 
                              colSpan={index === 0 ? 4 : 2} // Latest month gets 4 columns (removed AUM Cr), others get 2
                              className={`px-4 py-2 text-center border-r border-gray-200 ${index === 0 ? 'bg-indigo-50 text-indigo-900 font-bold' : ''}`}
                            >
                              {month}
                            </th>
                          ))}
                        </tr>
                        {/* Header Row 2: Columns */}
                        <tr>
                          {monthColumns.map((month, index) => (
                             <React.Fragment key={`${month}-subheaders`}>
                               {index === 0 ? (
                                 // Full columns for latest month (Removed AUM Cr)
                                 <>
                                   <th 
                                     className="px-4 py-2 text-right cursor-pointer hover:bg-gray-100 group border-r border-gray-100"
                                     onClick={() => handleSort('aumPercent', month)}
                                   >
                                     <div className="flex items-center justify-end">AUM % <SortIcon field="aumPercent" month={month}/></div>
                                   </th>
                                   <th 
                                     className="px-4 py-2 text-right cursor-pointer hover:bg-gray-100 group border-r border-gray-100"
                                     onClick={() => handleSort('sharesHeld', month)}
                                   >
                                     <div className="flex items-center justify-end">Shares Held <SortIcon field="sharesHeld" month={month}/></div>
                                   </th>
                                   <th 
                                     className="px-4 py-2 text-right cursor-pointer hover:bg-gray-100 group border-r border-gray-100"
                                     onClick={() => handleSort('change', month)}
                                   >
                                     <div className="flex items-center justify-end">Month Change <SortIcon field="change" month={month}/></div>
                                   </th>
                                   <th 
                                     className="px-4 py-2 text-right cursor-pointer hover:bg-gray-100 group border-r border-gray-200"
                                     onClick={() => handleSort('changePercent', month)}
                                   >
                                     <div className="flex items-center justify-end">Change % <SortIcon field="changePercent" month={month}/></div>
                                   </th>
                                 </>
                               ) : (
                                 // Reduced columns for other months
                                 <>
                                   <th 
                                    className="px-4 py-2 text-right cursor-pointer hover:bg-gray-100 group border-r border-gray-100"
                                    onClick={() => handleSort('sharesHeld', month)}
                                   >
                                     <div className="flex items-center justify-end">Shares Held <SortIcon field="sharesHeld" month={month}/></div>
                                   </th>
                                   <th 
                                    className="px-4 py-2 text-right cursor-pointer hover:bg-gray-100 group border-r border-gray-200"
                                    onClick={() => handleSort('changePercent', month)}
                                   >
                                     <div className="flex items-center justify-end">Change % <SortIcon field="changePercent" month={month}/></div>
                                   </th>
                                 </>
                               )}
                             </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {paginatedHoldings.length > 0 ? paginatedHoldings.map((holding, idx) => {
                            const mfId = getMfId(holding.fundUrl, holding.fundName);
                            const isTracked = trackedMFSet.has(mfId) || trackedMFSet.has(holding.fundName);

                            return (
                              <tr key={idx} className="bg-white hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 border-r border-gray-100 sticky left-0 bg-white group-hover:bg-gray-50 z-10">
                                  <div className="flex items-center gap-3">
                                    {/* Track Toggle */}
                                    <button 
                                        onClick={(e) => handleTrackMF(e, holding.fundName, holding.fundUrl)}
                                        className={`transition-colors ${isTracked ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-500'}`}
                                        title={isTracked ? "Remove MF from Watchlist" : "Add MF to Watchlist"}
                                    >
                                        {isTracked ? <CheckSquare size={16} /> : <Square size={16} />}
                                    </button>

                                    <div className="flex items-center gap-2 group/link">
                                      {holding.historyUrl && (
                                         <a 
                                           href={holding.historyUrl} 
                                           target="_blank" 
                                           rel="noreferrer"
                                           className="text-gray-300 hover:text-indigo-500 transition-colors opacity-0 group-hover/link:opacity-100"
                                           title="View on Trendlyne"
                                         >
                                           <History size={14} />
                                         </a>
                                      )}
                                      <button 
                                        onClick={() => onSelectFund({ name: holding.fundName, url: holding.fundUrl })}
                                        className="font-medium text-indigo-600 hover:text-indigo-800 text-left transition-colors line-clamp-2"
                                      >
                                        {holding.fundName}
                                      </button>
                                      {holding.fundUrl && (
                                         <a 
                                           href={holding.fundUrl} 
                                           target="_blank" 
                                           rel="noreferrer"
                                           className="text-gray-300 hover:text-indigo-500 transition-colors opacity-0 group-hover/link:opacity-100"
                                           title="View on Trendlyne"
                                         >
                                           <ExternalLink size={14} />
                                         </a>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                
                                {monthColumns.map((month, mIndex) => {
                                  const data = holding.history.find(h => h.month === month);
                                  const isLatest = mIndex === 0;

                                  if (!data) {
                                    return (
                                      <React.Fragment key={`${month}-empty`}>
                                         {isLatest ? (
                                           <>
                                             <td className="px-4 py-4 text-right text-gray-300 border-r border-gray-100">-</td>
                                             <td className="px-4 py-4 text-right text-gray-300 border-r border-gray-100">-</td>
                                             <td className="px-4 py-4 text-right text-gray-300 border-r border-gray-100">-</td>
                                             <td className="px-4 py-4 text-right text-gray-300 border-r border-gray-200">-</td>
                                           </>
                                         ) : (
                                           <>
                                             <td className="px-4 py-4 text-right text-gray-300 border-r border-gray-100">-</td>
                                             <td className="px-4 py-4 text-right text-gray-300 border-r border-gray-200">-</td>
                                           </>
                                         )}
                                      </React.Fragment>
                                    );
                                  }

                                  return (
                                    <React.Fragment key={`${month}-data`}>
                                      {isLatest ? (
                                         <>
                                           {/* AUM % */}
                                           <td className="px-4 py-4 text-right font-mono text-gray-700 border-r border-gray-100 bg-indigo-50/20">
                                             {data.aumPercent ? `${data.aumPercent.toFixed(2)}%` : '-'}
                                           </td>
                                           {/* Shares Held */}
                                           <td className="px-4 py-4 text-right font-mono text-gray-900 font-medium border-r border-gray-100 bg-indigo-50/30">
                                             {data.sharesHeld.toLocaleString()}
                                           </td>
                                           {/* Month Change (Absolute) */}
                                           <td className="px-4 py-4 text-right font-mono border-r border-gray-100 bg-indigo-50/20">
                                              {data.change ? (
                                                 <span className={data.change > 0 ? 'text-green-600' : data.change < 0 ? 'text-red-600' : 'text-gray-400'}>
                                                   {data.change.toLocaleString()}
                                                 </span>
                                              ) : <span className="text-gray-300">0</span>}
                                           </td>
                                           {/* Month Change % */}
                                           <td className="px-4 py-4 text-right font-mono border-r border-gray-200 bg-indigo-50/20">
                                             <div className={`flex items-center justify-end gap-1 ${
                                               data.changePercent > 0 ? 'text-green-600 font-medium' : 
                                               data.changePercent < 0 ? 'text-red-600 font-medium' : 'text-gray-400'
                                             }`}>
                                                {data.changePercent > 0 ? `+${data.changePercent}%` : `${data.changePercent}%`}
                                             </div>
                                           </td>
                                         </>
                                      ) : (
                                         <>
                                           {/* Previous Month Shares */}
                                           <td className="px-4 py-4 text-right font-mono text-gray-600 border-r border-gray-100">
                                             {data.sharesHeld.toLocaleString()}
                                           </td>
                                           {/* Previous Month Change % */}
                                           <td className="px-4 py-4 text-right font-mono border-r border-gray-200">
                                             <span className={data.changePercent > 0 ? 'text-green-600' : data.changePercent < 0 ? 'text-red-600' : 'text-gray-400'}>
                                               {data.changePercent}%
                                             </span>
                                           </td>
                                         </>
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </tr>
                            );
                        }) : (
                           <tr>
                             <td colSpan={1 + (monthColumns.length * 2) + 2} className="px-6 py-12 text-center text-gray-400">
                               {showTrackedOnly ? "No tracked funds in this stock's holdings." : "No funds found matching your search."}
                             </td>
                           </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
                
                {mfData && filteredSortedHoldings.length > 0 && (
                  <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs text-gray-500">
                      Showing {paginatedHoldings.length} of {filteredSortedHoldings.length} funds
                      {mfData.sourceUrl && " • Data Source: Trendlyne"}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      
                      <span className="text-sm font-medium text-gray-700 px-2">
                        Page {currentPage} of {totalPages}
                      </span>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border border-gray-200 bg-white text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default StockDashboard;
