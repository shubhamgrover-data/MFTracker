import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, TrendingUp, TrendingDown, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, Upload, Loader2, ExternalLink, History, ChevronLeft, ChevronRight, PieChart as PieIcon, Info, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { FundSnapshot, FundSearchResult, FundPortfolioHolding, FundMeta, SectorDistribution, HoldingHistoryItem } from '../types';
import { parseExcelFile, fetchFundPortfolio, fetchFundHoldingHistory } from '../services/dataService';
import FundSearch from './FundSearch';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface FundViewProps {
  funds: FundSnapshot[]; // For uploaded files
  onFundDataAdded: (data: FundSnapshot) => void;
  onSelectStock: (symbol: string, name: string) => void;
  initialSelectedFund?: FundSearchResult | null;
}

type SortField = 'stockName' | 'sector' | 'percentage' | 'quantity' | 'changePercentage' | string;
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 50;
const CHART_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#64748b'];

const FundView: React.FC<FundViewProps> = ({ funds, onFundDataAdded, onSelectStock, initialSelectedFund }) => {
  const [selectedFund, setSelectedFund] = useState<FundSearchResult | null>(initialSelectedFund || null);
  
  // Data States
  const [portfolioData, setPortfolioData] = useState<FundPortfolioHolding[] | null>(null);
  const [fundMeta, setFundMeta] = useState<FundMeta | null>(null);
  const [sectorData, setSectorData] = useState<SectorDistribution[]>([]);

  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // History Data State
  const [historyCache, setHistoryCache] = useState<Record<string | number, { date: string, change: string }[]>>({});
  const [monthHeaders, setMonthHeaders] = useState<string[]>([]);
  const [loadingHistoryMap, setLoadingHistoryMap] = useState<Record<string | number, boolean>>({});

  // Sorting
  const [sortField, setSortField] = useState<SortField>('percentage');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync prop changes
  useEffect(() => {
    if (initialSelectedFund) {
      setSelectedFund(initialSelectedFund);
    }
  }, [initialSelectedFund]);

  const loadData = async () => {
      if (!selectedFund || !selectedFund.url) {
          setPortfolioData(null);
          setFundMeta(null);
          setSectorData([]);
          setHistoryCache({});
          setMonthHeaders([]);
          return;
      }

      setLoading(true);
      // Reset data to ensure clean state on refresh
      setPortfolioData(null); 
      setSectorData([]);
      
      try {
        const data = await fetchFundPortfolio(selectedFund.url);
        if (data) {
            setPortfolioData(data.holdings);
            setFundMeta(data.meta);
            setSectorData(data.sectorDistribution);
        } else {
            setPortfolioData([]);
            setFundMeta(null);
            setSectorData([]);
        }
      } catch (err) {
          console.error("Failed to load fund portfolio", err);
          setPortfolioData([]);
      } finally {
          setLoading(false);
      }
  };

  // Fetch API Data whenever selectedFund changes
  useEffect(() => {
    loadData();
  }, [selectedFund]);

  const handleRefresh = () => {
      loadData();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsUploading(true);
      try {
        const data = await parseExcelFile(e.target.files[0]);
        if (data) {
          onFundDataAdded(data);
          // Switch to offline view logic (not fully implemented in this iteration, keeping focus on API)
          setSelectedFund({ name: data.fundName, url: '' });
          alert("Offline file viewing is limited in this demo mode. Please use the API flow.");
        }
      } catch (err) {
        alert("Failed to upload file");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedData = useMemo(() => {
      if (!portfolioData) return [];
      
      let data = [...portfolioData];
      if (searchTerm) {
          const lower = searchTerm.toLowerCase();
          data = data.filter(item => 
              item.stockName.toLowerCase().includes(lower) || 
              item.stockSymbol.toLowerCase().includes(lower) ||
              item.sector.toLowerCase().includes(lower)
          );
      }

      return data.sort((a, b) => {
          let valA: any;
          let valB: any;

          // Check if sorting by history
          if (sortField.startsWith('history_')) {
              const index = parseInt(sortField.split('_')[1]);
              
              const getHistoryVal = (item: FundPortfolioHolding) => {
                  if (!item.stockPk) return -Infinity;
                  const history = historyCache[item.stockPk];
                  // If history not loaded or index out of bounds, treat as lowest value
                  if (!history || !history[index]) return -Infinity; 
                  return parseFloat(history[index].change.replace('%', '')) || 0;
              };

              valA = getHistoryVal(a);
              valB = getHistoryVal(b);
          } else {
              valA = a[sortField as keyof FundPortfolioHolding];
              valB = b[sortField as keyof FundPortfolioHolding];
              
              if (valA === undefined || valA === null) valA = sortField === 'stockName' || sortField === 'sector' ? '' : 0;
              if (valB === undefined || valB === null) valB = sortField === 'stockName' || sortField === 'sector' ? '' : 0;
          }

          // Handle strings
          if (typeof valA === 'string' && typeof valB === 'string') {
              valA = valA.toLowerCase();
              valB = valB.toLowerCase();
          }

          if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
          if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
          return 0;
      });
  }, [portfolioData, searchTerm, sortField, sortDirection, historyCache]);

  // Pagination Logic
  const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [sortedData, currentPage]);

  // Reset pagination when filter/sort changes
  useEffect(() => {
    setCurrentPage(1);
    // Note: We don't clear historyCache here to preserve loaded data if user navigates back
  }, [searchTerm, sortField, sortDirection, selectedFund]);

  // --- Fetch History for Visible Rows ---
  useEffect(() => {
      if (!fundMeta?.fundPk || !paginatedData.length) return;

      const fetchVisibleHistory = async () => {
          // Identify items that need fetching (have stockPk but no cache)
          const itemsToFetch = paginatedData.filter(item => 
              item.stockPk && !historyCache[item.stockPk] && !loadingHistoryMap[item.stockPk]
          );

          if (itemsToFetch.length === 0) return;

          // Mark as loading
          setLoadingHistoryMap(prev => {
              const next = { ...prev };
              itemsToFetch.forEach(i => { if(i.stockPk) next[i.stockPk] = true; });
              return next;
          });

          // Fetch in batches to avoid overwhelming the browser/proxy
          const BATCH_SIZE = 5;
          for (let i = 0; i < itemsToFetch.length; i += BATCH_SIZE) {
              const batch = itemsToFetch.slice(i, i + BATCH_SIZE);
              
              await Promise.all(batch.map(async (item) => {
                  if (!item.stockPk) return;
                  try {
                      const url = item.historyUrl ? (item.historyUrl.startsWith('http') ? item.historyUrl : `https://trendlyne.com${item.historyUrl}`) : '';
                      if (!url) return;
                      const history = await fetchFundHoldingHistory(url);
                      if (history && history.length > 0) {
                          // Extract only necessary data: last 6 months
                          const processed = history.slice(0, 6).map(h => ({
                              date: h["Holding Date"],
                              change: h["1M Change %"]
                          }));

                          setHistoryCache(prev => ({
                              ...prev,
                              [item.stockPk!]: processed
                          }));

                          // Update headers if this is the first successful fetch or has newer data
                          setMonthHeaders(prevHeaders => {
                              if (prevHeaders.length === 0 && processed.length > 0) {
                                  return processed.map(p => p.date);
                              }
                              return prevHeaders;
                          });
                      }
                  } catch (e) {
                      console.error(`Failed history fetch for ${item.stockSymbol}`, e);
                  } finally {
                      setLoadingHistoryMap(prev => {
                          const next = { ...prev };
                          if (item.stockPk) delete next[item.stockPk];
                          return next;
                      });
                  }
              }));
          }
      };

      fetchVisibleHistory();
  }, [paginatedData, fundMeta, historyCache, loadingHistoryMap]);


  const SortIcon = ({ field }: { field: SortField }) => {
    const isActive = sortField === field;
    return (
      <div className={`ml-1 flex flex-col ${isActive ? 'opacity-100' : 'opacity-20 group-hover:opacity-50'}`}>
         {isActive && sortDirection === 'asc' ? <ArrowUp size={12} /> : <ArrowUp size={12} className="opacity-0 h-0" />} 
         <ArrowDown size={12} className={isActive && sortDirection === 'asc' ? 'opacity-0 h-0' : ''} />
      </div>
    );
  };

  const getDotColor = (val: string) => {
      if (val === 'positive') return 'bg-green-500';
      if (val === 'negative') return 'bg-red-500';
      return 'bg-yellow-400';
  };

  const getValueColor = (val: number) => {
    if (val > 0) return 'text-green-600';
    if (val < 0) return 'text-red-600';
    return 'text-gray-400';
  };

  // Helper to ensure URL is absolute for the user link
  const getDisplayUrl = (url: string) => {
      if (!url) return '';
      if (url.startsWith('http')) return url;
      return `https://trendlyne.com${url}`;
  };

  const renderLegendText = (value: string, entry: any) => {
    const { color } = entry;
    return (
        <span className="text-gray-600 font-medium ml-1 text-xs">
            {value} <span className="text-gray-400 font-normal">({entry.payload.value}%)</span>
        </span>
    );
  };

  // Helper to get change color for history
  const getHistoryChangeColor = (val: string | undefined) => {
      if (!val) return 'text-gray-300';
      if (val.includes('-')) return 'text-red-500';
      return 'text-green-500';
  };

  return (
    <div className="space-y-6">
      {/* Header Area */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Fund Monitor</h2>
        </div>
        
        {/* Upload Excel Button - Hidden until implemented */}
        <div className="flex items-center gap-4" style={{ display: 'none' }}>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
          >
            {isUploading ? <Loader2 size={16} className="animate-spin"/> : <Upload size={16} />}
            Upload Excel
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {!selectedFund ? (
        <FundSearch onSelectFund={(fund) => setSelectedFund(fund)} />
      ) : (
        <div className="animate-fade-in space-y-6">
          <button 
            onClick={() => { setSelectedFund(null); setPortfolioData(null); setFundMeta(null); setSectorData([]); setHistoryCache({}); setMonthHeaders([]); }}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft size={16} />
            Search different fund
          </button>

          {/* Top Section: Fund Info & Pie Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             {/* Fund Description Card */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between">
                <div>
                    <div className="flex items-start justify-between mb-4">
                      <div>
                          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                              {selectedFund.name}
                              {selectedFund.url && (
                                  <a 
                                      href={getDisplayUrl(selectedFund.url)} 
                                      target="_blank" 
                                      rel="noreferrer"
                                      className="text-gray-400 hover:text-indigo-600 transition-colors"
                                      title="View full report on Trendlyne"
                                  >
                                      <ExternalLink size={20} />
                                  </a>
                              )}
                          </h3>
                          {loading ? (
                          <div className="h-6 w-32 bg-gray-100 animate-pulse rounded mt-2"></div>
                          ) : fundMeta?.category && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 mt-2">
                              {fundMeta.category}
                          </span>
                          )}
                      </div>
                      
                      <button 
                        onClick={handleRefresh} 
                        disabled={loading}
                        className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-indigo-600 transition-colors border border-gray-100 shadow-sm"
                        title="Refresh Fund Data"
                      >
                         <RefreshCw size={18} className={loading ? "animate-spin text-indigo-600" : ""} />
                      </button>
                    </div>
                    
                    <div className="prose prose-sm text-gray-500 max-w-none">
                    {loading ? (
                        <div className="space-y-2">
                        <div className="h-4 bg-gray-100 rounded w-full animate-pulse"></div>
                        <div className="h-4 bg-gray-100 rounded w-5/6 animate-pulse"></div>
                        <div className="h-4 bg-gray-100 rounded w-4/6 animate-pulse"></div>
                        </div>
                    ) : (
                        <p>{fundMeta?.description || "No description available for this fund category."}</p>
                    )}
                    </div>
                </div>
             </div>

             {/* Sector Pie Chart */}
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2 text-sm">
                   <PieIcon size={16} className="text-indigo-500"/>
                   Sector Allocation
                </h4>
                <div className="flex-1 min-h-[220px] relative">
                   {loading ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                         <Loader2 className="animate-spin text-indigo-400" />
                      </div>
                   ) : sectorData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                         <PieChart>
                            <Pie
                               data={sectorData}
                               dataKey="value"
                               nameKey="name"
                               cx="50%"
                               cy="50%"
                               innerRadius={50}
                               outerRadius={80}
                               paddingAngle={2}
                            >
                               {sectorData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                               ))}
                            </Pie>
                            <Tooltip formatter={(value: number) => `${value}%`} />
                            <Legend 
                                layout="horizontal" 
                                verticalAlign="bottom" 
                                align="center" 
                                iconSize={8} 
                                wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}
                                formatter={renderLegendText}
                            />
                         </PieChart>
                      </ResponsiveContainer>
                   ) : (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                         No sector data available
                      </div>
                   )}
                </div>
             </div>
          </div>

          {/* Holdings Table Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="p-6 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Portfolio Holdings</h3>
                <p className="text-sm text-gray-500">
                    {loading ? 'Fetching...' : portfolioData ? `${sortedData.length} Stocks Found` : 'No data'}
                </p>
              </div>

              <div className="relative w-full md:w-64">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Search className="w-4 h-4 text-gray-500" />
                </div>
                <input 
                  type="text" 
                  className="bg-white border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 p-2.5" 
                  placeholder="Search portfolio..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="overflow-x-auto min-h-[400px]">
              {loading ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500 gap-3">
                      <Loader2 className="animate-spin text-indigo-600" size={32} />
                      <p>Loading real-time portfolio data...</p>
                  </div>
              ) : portfolioData && portfolioData.length > 0 ? (
                  <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th 
                           scope="col" 
                           className="px-4 py-3 sticky left-0 bg-gray-50 z-10 border-r border-gray-200 w-[20%] min-w-[200px] cursor-pointer hover:bg-gray-100 group"
                           onClick={() => handleSort('stockName')}
                        >
                            <div className="flex items-center justify-between">
                                Invested In <SortIcon field="stockName"/>
                            </div>
                        </th>
                        <th 
                           scope="col" 
                           className="px-4 py-3 text-right w-[15%] cursor-pointer hover:bg-gray-100 group"
                           onClick={() => handleSort('sector')}
                        >
                             <div className="flex items-center justify-end">Sector <SortIcon field="sector"/></div>
                        </th>
                        <th 
                            scope="col" 
                            className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 group w-[10%]"
                            onClick={() => handleSort('percentage')}
                        >
                            <div className="flex items-center justify-end">% Assets <SortIcon field="percentage"/></div>
                        </th>
                        <th 
                            scope="col" 
                            className="px-4 py-3 text-right cursor-pointer hover:bg-gray-100 group w-[10%]"
                            onClick={() => handleSort('quantity')}
                        >
                            <div className="flex items-center justify-end">Quantity <SortIcon field="quantity"/></div>
                        </th>
                        
                        {/* Dynamic History Columns - Up to 6 */}
                        {monthHeaders.length > 0 ? (
                            monthHeaders.slice(0, 6).map((header, i) => (
                                <th key={i} 
                                    scope="col" 
                                    className={`px-4 py-3 text-right w-[10%] min-w-[100px] text-gray-400 font-medium cursor-pointer hover:bg-gray-100 group`}
                                    onClick={() => handleSort(i === 0 ? 'changePercentage' : `history_${i}`)}
                                >
                                    <div className="flex items-center justify-end gap-1">
                                         <div>
                                            {header.split(' ')[0]} <br/> 
                                            <span className="text-[10px] opacity-75">{header.split(' ').slice(1).join(' ')}</span>
                                         </div>
                                         <SortIcon field={i === 0 ? 'changePercentage' : `history_${i}`}/>
                                    </div>
                                </th>
                            ))
                        ) : (
                            // Placeholder columns while loading first batch
                            [...Array(6)].map((_, i) => (
                                <th key={i} scope="col" className="px-4 py-3 text-right w-[10%] min-w-[100px] text-gray-300">
                                    M-{i}
                                </th>
                            ))
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {paginatedData.map((row, idx) => {
                          // Get cached history
                          const history = row.stockPk ? historyCache[row.stockPk] : undefined;
                          const isLoadingHistory = row.stockPk ? loadingHistoryMap[row.stockPk] : false;

                          return (
                          <tr key={idx} className="bg-white hover:bg-gray-50 transition-colors group">
                            <td className="px-4 py-3 font-medium text-gray-900 sticky left-0 bg-white group-hover:bg-gray-50 border-r border-gray-200 z-10 align-top">
                              <div className="flex flex-col gap-1">
                                  <div className="flex items-start gap-2">
                                    <div className="mt-0.5 text-gray-300 flex-shrink-0 w-4 hover:text-indigo-600 transition-colors">
                                        {row.historyUrl && 
                                         (<a href={row.historyUrl} 
                                         target="_blank" 
                                         rel="noreferrer" 
                                         className="flex"
                                         title="View Historical Changes"
                                         onClick={(e) => e.stopPropagation()}>
                                          <History size={14} />
                                          </a>
                                          
                                         )
                                        }
                                    </div>
                                    <button 
                                        onClick={() => onSelectStock(row.stockSymbol, row.stockName)}
                                        className="text-indigo-600 hover:text-indigo-800 hover:underline text-left text-sm w-full group/link flex items-center gap-2"
                                    >
                                        <span className="font-semibold break-words line-clamp-2 leading-tight">{row.stockName}</span>
                                        {row.stockUrl && (
                                            <a 
                                                href={row.stockUrl} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="text-gray-400 hover:text-indigo-500 opacity-0 group-hover/link:opacity-100 transition-opacity"
                                                title="View External"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <ExternalLink size={14} />
                                            </a>
                                        )}
                                    </button>
                                  </div>
                                  <div className="flex items-center gap-1 pl-6 mt-1">
                                      <div className={`w-1.5 h-1.5 rounded-full ${getDotColor(row.dColor)}`} title={`Durability: ${row.d}`}></div>
                                      <div className={`w-1.5 h-1.5 rounded-full ${getDotColor(row.vColor)}`} title={`Valuation: ${row.v}`}></div>
                                      <div className={`w-1.5 h-1.5 rounded-full ${getDotColor(row.mColor)}`} title={`Momentum: ${row.m}`}></div>
                                  </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right text-xs align-top">
                                {row.sector}
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-medium text-gray-900 text-sm align-top">
                                {row.percentage.toFixed(2)}%
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-gray-600 text-sm align-top">
                                {(row.quantity / 1000).toLocaleString()} K
                            </td>
                            
                            {/* History Cells */}
                            {[...Array(6)].map((_, hIdx) => {
                                const historyItem = history ? history[hIdx] : null;
                                return (
                                    <td key={hIdx} className="px-4 py-3 text-right font-mono text-sm align-top">
                                        {isLoadingHistory && hIdx === 0 ? (
                                            <div className="flex justify-end"><Loader2 className="animate-spin text-gray-300" size={12}/></div>
                                        ) : historyItem ? (
                                            <span className={getHistoryChangeColor(historyItem.change)}>
                                                {historyItem.change}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">-</span>
                                        )}
                                    </td>
                                );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
              ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                      <p>{selectedFund.url ? "No portfolio data found." : "Please select a fund from the Dashboard to view its live portfolio."}</p>
                  </div>
              )}
            </div>

            {/* Pagination Controls */}
            {portfolioData && sortedData.length > 0 && (
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-gray-500">
                  Showing {paginatedData.length} of {sortedData.length} holdings
                  {selectedFund.url && " • Data Source: Trendlyne"}
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
          </div>
        </div>
      )}
    </div>
  );
};

export default FundView;