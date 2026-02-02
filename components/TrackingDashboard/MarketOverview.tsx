
import React, { useState, useMemo, useEffect } from 'react';
import { MarketIndexData, FiiDiiData, SectoralData } from '../../types/trackingTypes';
import { addTrackedIndex, removeTrackedIndex, getTrackedItems } from '../../services/trackingStorage';
import { fetchFiiDiiActivity, fetchStockQuote, fetchSectoralAnalysis } from '../../services/dataService';
import { MARKET_OVERVIEW_INDICES, HEADER_INDICES } from '../../types/constants.ts'
import { Activity, Search, RefreshCw, CheckSquare, Square, Loader2, TrendingUp, ExternalLink } from 'lucide-react';
import IndexInsightsWidget from './IndexInsightsWidget';
import PortfolioUpdates from './PortfolioMovers';
import SectoralPulse from './SectoralPulse';

interface MarketOverviewProps {
  indicesData: MarketIndexData[];
  trackedIndices: string[];
  onRefresh: () => void;
  loading: boolean;
  onSelectStock?: (symbol: string, name: string) => void;
  moversData: any[];
  setMoversData: React.Dispatch<React.SetStateAction<any[]>>;
  // Sectoral Data Props (Lifted from App.tsx or managed here if not persisted)
  // For simplicity based on prompt requirement "State should be maintained", we assume props passed down.
  sectoralData: SectoralData | null;
  setSectoralData: React.Dispatch<React.SetStateAction<SectoralData | null>>;
}

const IndexRow: React.FC<{ 
    data: MarketIndexData, 
    isTracked: boolean, 
    onToggle: () => void,
    isAlternate?: boolean,
    onSelectStock?: (symbol: string, name: string) => void,
    onAddMover: (symbol: string) => void,
    addedMovers: string[]
}> = ({ data, isTracked, onToggle, isAlternate, onSelectStock, onAddMover, addedMovers }) => {
  
  const isPositive = data.percentChange >= 0;
  const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
  
  // Calculate 1W return
  const oneWeekReturn = data.oneWeekAgoVal 
    ? ((data.last - data.oneWeekAgoVal) / data.oneWeekAgoVal * 100).toFixed(2) 
    : '-';

  // Breadth
  const advances = parseInt(data.advances || "0", 10);
  const declines = parseInt(data.declines || "0", 10);
  const total = advances + declines;
  const advanceWidth = total > 0 ? (advances / total) * 100 : 50;

  // 52 Week Range
  const rangePos = data.yearHigh && data.yearLow
    ? ((data.last - data.yearLow) / (data.yearHigh - data.yearLow)) * 100
    : 0;

  return (
    <tr className={`hover:bg-indigo-50/30 transition-colors border-b border-gray-50 group ${isAlternate ? 'bg-gray-50/30' : ''} ${isTracked ? 'bg-indigo-50/10' : ''}`}>
        {/* Track Checkbox */}
        <td className="px-4 py-3">
            <button 
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className={`transition-colors ${isTracked ? 'text-indigo-600' : 'text-gray-300 group-hover:text-gray-400'}`}
                title={isTracked ? "Remove from Watchlist" : "Add to Watchlist"}
            >
                {isTracked ? <CheckSquare size={18} /> : <Square size={18} />}
            </button>
        </td>
        
        <td className="px-4 py-3">
            <div className="flex items-center gap-1.5">
                <span className="font-semibold text-gray-800 text-xs sm:text-sm">{data.index}</span>
                
                {/* Integrate Insights Widget - Self Managed Mode */}
                <IndexInsightsWidget 
                    indexName={data.indexSymbol} 
                    onAddToMover={onAddMover} 
                    onNavigateStock={onSelectStock} 
                    addedSymbols={addedMovers} 
                />

                {/* External Link to NSE Index Tracker */}
                <a 
                    href={`https://www.nseindia.com/index-tracker/${encodeURIComponent(data.indexSymbol)}`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-gray-300 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"
                    title={`View ${data.index} on NSE`}
                    onClick={(e) => e.stopPropagation()}
                >
                    <ExternalLink size={12} />
                </a>
            </div>
        </td>
        <td className="px-4 py-3 text-right font-mono text-gray-700">{data.last?.toLocaleString()}</td>
        <td className={`px-4 py-3 text-right font-medium ${colorClass}`}>
            {isPositive ? '+' : ''}{data.percentChange.toFixed(2)}%
        </td>
        
        {/* Valuation (PE | PB | DY) */}
        <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">
            <div className="flex items-center justify-center gap-2 text-[11px]">
                <span className="font-medium bg-gray-100 px-1.5 py-0.5 rounded text-gray-700" title="P/E">{data.pe || '-'}</span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500" title="P/B">{data.pb || '-'}</span>
                <span className="text-gray-300">|</span>
                <span className="text-gray-500" title="Yield">{data.dy || '-'}</span>
            </div>
        </td>

        {/* Returns */}
        <td className="px-4 py-3 text-center hidden md:table-cell">
            <div className="flex items-center justify-center gap-3 text-[11px]">
                <div className="flex flex-col items-center w-8">
                    <span className={parseFloat(oneWeekReturn) >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {oneWeekReturn}%
                    </span>
                    <span className="text-[9px] text-gray-400">1W</span>
                </div>
                <div className="flex flex-col items-center w-8">
                    <span className={data.perChange30d >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {data.perChange30d.toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-gray-400">1M</span>
                </div>
                <div className="flex flex-col items-center w-8">
                    <span className={data.perChange365d >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        {data.perChange365d.toFixed(1)}%
                    </span>
                    <span className="text-[9px] text-gray-400">1Y</span>
                </div>
            </div>
        </td>

        {/* 52W Range */}
        <td className="px-4 py-3 hidden lg:table-cell">
            <div className="flex flex-col gap-1 w-full max-w-[120px] mx-auto">
                <div className="flex justify-between text-[9px] text-gray-400">
                    <span>{data.yearLow?.toLocaleString()}</span>
                    <span>{data.yearHigh?.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden relative">
                    <div 
                        className="absolute h-full w-1.5 bg-indigo-600 rounded-full top-0 ml-[-3px]" 
                        style={{ left: `${Math.min(Math.max(rangePos, 0), 100)}%` }}
                    ></div>
                </div>
            </div>
        </td>

        {/* Breadth */}
        <td className="px-4 py-3 hidden xl:table-cell">
            <div className="flex flex-col gap-1 w-full max-w-[80px] mx-auto">
                <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-gray-200">
                    <div className="bg-green-500 h-full" style={{ width: `${advanceWidth}%` }}></div>
                    <div className="bg-red-500 h-full" style={{ width: `${100 - advanceWidth}%` }}></div>
                </div>
                <div className="flex justify-between text-[9px]">
                    <span className="text-green-600 font-medium">{advances}</span>
                    <span className="text-red-600 font-medium">{declines}</span>
                </div>
            </div>
        </td>
    </tr>
  );
};

export const MarketOverview: React.FC<MarketOverviewProps> = ({ 
    indicesData, 
    trackedIndices, 
    onRefresh, 
    loading, 
    onSelectStock, 
    moversData, 
    setMoversData,
    sectoralData,
    setSectoralData
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [fiiData, setFiiData] = useState<FiiDiiData | null>(null);
  const [loadingMover, setLoadingMover] = useState(false);
  const [loadingSector, setLoadingSector] = useState(false);
  const [sectorDuration, setSectorDuration] = useState('1D'); // Default duration
  
  // Use all indices available from the API and filter locally
  const filteredData = useMemo(() => {
      let data = [...indicesData]; // Copy array before sorting
      
      if (filterQuery) {
          const lowerQ = filterQuery.toLowerCase();
          data = data.filter(i => i.index.toLowerCase().includes(lowerQ));
      }
      else {
          // If not searching, show only Default Overview + Tracked Indices
          data = data.filter(i => 
              MARKET_OVERVIEW_INDICES.includes(i.index) || 
              trackedIndices.includes(i.index)
          );
      }
      
      // Sort: Tracked first, then by name
      return data.sort((a, b) => {
          const aTracked = trackedIndices.includes(a.index);
          const bTracked = trackedIndices.includes(b.index);
          if (aTracked && !bTracked) return -1;
          if (!aTracked && bTracked) return 1;
          return a.index.localeCompare(b.index);
      });
  }, [indicesData, filterQuery, trackedIndices]);

  useEffect(() => {
      const loadFii = async () => {
          const data = await fetchFiiDiiActivity(false);
          setFiiData(data);
      };
      loadFii();
  }, []);

  // Fetch Sectoral Data if not present
  useEffect(() => {
      if (!sectoralData) {
          loadSectorData('1D');
      }
  }, []);

  // Sync Movers with Tracked Items
  useEffect(() => {
      const syncTrackedItems = () => {
          const trackedStocks = getTrackedItems().filter(i => i.type === 'STOCK');
          setMoversData(currentData => {
              const existingMap = new Map(currentData.map(m => [m.symbol, m]));
              const nextData = [...currentData];
              let changed = false;
              
              trackedStocks.forEach(item => {
                  if (!existingMap.has(item.id)) {
                      nextData.push({
                          symbol: item.id,
                          companyName: item.name,
                          isLoaded: false // Placeholder state
                      });
                      changed = true;
                  }
              });
              
              return changed ? nextData : currentData;
          });
      };

      syncTrackedItems();
      window.addEventListener('fundflow_tracking_update', syncTrackedItems);
      return () => window.removeEventListener('fundflow_tracking_update', syncTrackedItems);
  }, []);

  const loadSectorData = async (duration: string) => {
      setLoadingSector(true);
      try {
          const data = await fetchSectoralAnalysis(duration);
          setSectoralData(data);
      } catch (e) {
          console.error(e);
      } finally {
          setLoadingSector(false);
      }
  };

  const handleSectorDurationChange = (duration: string) => {
      setSectorDuration(duration);
      loadSectorData(duration);
  };

  const handleRefreshAll = async () => {
      onRefresh(); // Refresh indices
      const data = await fetchFiiDiiActivity(true); // Force refresh FII
      setFiiData(data);
      loadSectorData(sectorDuration); // Refresh Sector data
  };

  const handleToggleTrack = (indexName: string) => {
      if (trackedIndices.includes(indexName)) {
          removeTrackedIndex(indexName);
      } else {
          addTrackedIndex(indexName);
      }
  };

  const processQuoteData = (quote: any) => {
      return {
          symbol: quote.metaData.symbol,
          companyName: quote.metaData.companyName,
          lastPrice: quote.tradeInfo.lastPrice, 
          change: quote.metaData.change,
          pChange: quote.metaData.pChange,
          pdSymbolPe: quote.secInfo?.pdSymbolPe,
          pdSectorPe: quote.secInfo?.pdSectorPe,
          yearHigh: quote.priceInfo?.yearHigh,
          yearLow: quote.priceInfo?.yearLow,
          sector: quote.secInfo?.sector,
          basicIndustry: quote.secInfo?.basicIndustry,
          indexList: quote.secInfo?.indexList || [],
          // New Fields
          delivery: quote.tradeInfo?.deliveryToTradedQuantity || quote.secInfo?.deliveryTotradedQuantity,
          pdSectorInd: quote.secInfo?.pdSectorInd,
          macro: quote.secInfo?.macro,
          industryInfo: quote.secInfo?.industryInfo,
          isLoaded: true // Mark as fully loaded
      };
  };

  const handleAddMover = async (symbol: string) => {
      // Prevent duplicates
      if (moversData.find(m => m.symbol === symbol)) return;
      
      // Optimistically add placeholder
      setMoversData(prev => [...prev, { symbol, companyName: symbol, isLoaded: false }]);
      
      // Then fetch
      await handleRefreshMover(symbol);
  };

  const handleRefreshMover = async (symbol: string) => {
      // set local loading state if needed, or row specific loading in parent
      try {
          const quote = await fetchStockQuote(symbol);
          if (quote && quote.metaData) {
              const processed = processQuoteData(quote);
              setMoversData(prev => prev.map(m => m.symbol === symbol ? processed : m));
          }
      } catch(e) {
          console.error(`Failed to refresh ${symbol}`, e);
      }
  };

  const handleRemoveMover = (symbol: string) => {
      setMoversData(prev => prev.filter(m => m.symbol !== symbol));
  };

  const TableHeader = () => (
      <thead className="bg-gray-50 text-gray-500 text-[10px] uppercase font-bold tracking-wider border-b border-gray-200 sticky top-0 z-10">
          <tr>
              <th className="px-4 py-3 w-10"></th> {/* Checkbox */}
              <th className="px-4 py-3 text-left">Index</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Change</th>
              <th className="px-4 py-3 text-center hidden sm:table-cell">Valuation</th>
              <th className="px-4 py-3 text-center hidden md:table-cell">Returns</th>
              <th className="px-4 py-3 text-center hidden lg:table-cell">52W Range</th>
              <th className="px-4 py-3 text-center hidden xl:table-cell">Breadth</th>
          </tr>
      </thead>
  );

  const formatCurrency = (val: number) => {
      if (val === undefined || val === null) return '-';
      return val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
  };

  // Get list of added mover symbols to pass to widgets
  const moverSymbols = useMemo(() => moversData.map(m => m.symbol), [moversData]);

  return (
    <div className="flex flex-col gap-6 pb-10">
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
               {/* ... Header Content ... */}
               <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                       <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                          <Activity size={18} />
                       </div>
                       <h3 className="text-lg font-bold text-gray-900">All Market Indices</h3>
                       <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                           {filteredData.length}
                       </span>
                   </div>
                   
                   {/* FII/DII Mini Widget */}
                   {fiiData && fiiData.latest && (
                       <div className="relative group hidden md:flex items-center gap-3 px-3 py-1 bg-white border border-gray-200 rounded-lg shadow-sm text-xs cursor-help">
                           <div className="flex items-center gap-1.5">
                               <span className="font-bold text-gray-500">FII</span>
                               <span className={`font-mono font-medium ${fiiData.latest.fiiNet > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                   {fiiData.latest.fiiNet > 0 ? '+' : ''}{formatCurrency(fiiData.latest.fiiNet)}Cr
                               </span>
                           </div>
                           <div className="h-3 w-px bg-gray-200"></div>
                           <div className="flex items-center gap-1.5">
                               <span className="font-bold text-gray-500">DII</span>
                               <span className={`font-mono font-medium ${fiiData.latest.diiNet > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                   {fiiData.latest.diiNet > 0 ? '+' : ''}{formatCurrency(fiiData.latest.diiNet)}Cr
                               </span>
                           </div>
                           <a 
                               href="https://trendlyne.com/macro-data/fii-dii/latest/cash-pastmonth/" 
                               target="_blank" 
                               rel="noreferrer"
                               className="text-gray-400 hover:text-indigo-600"
                           >
                               <ExternalLink size={10} />
                           </a>

                           {/* Tooltip Popover */}
                           <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 shadow-xl rounded-lg p-3 z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                               <h4 className="text-[10px] font-bold uppercase text-gray-500 mb-2 border-b border-gray-100 pb-1">Institutional Activity</h4>
                               <div className="space-y-2">
                                   <div className="flex justify-between text-[10px] text-gray-400">
                                       <span>Period</span>
                                       <span className="mr-8">FII</span>
                                       <span>DII</span>
                                   </div>
                                   {/* Latest */}
                                   <div className="flex justify-between text-xs font-mono">
                                       <span className="text-gray-600 w-16 truncate">{fiiData.latest.period.replace('Last ','')}</span>
                                       <span className={`${fiiData.latest.fiiNet > 0 ? 'text-green-600' : 'text-red-600'} w-16 text-right`}>{formatCurrency(fiiData.latest.fiiNet)}</span>
                                       <span className={`${fiiData.latest.diiNet > 0 ? 'text-green-600' : 'text-red-600'} w-16 text-right`}>{formatCurrency(fiiData.latest.diiNet)}</span>
                                   </div>
                                   {/* History */}
                                   {fiiData.history.map((h, idx) => (
                                       <div key={idx} className="flex justify-between text-xs font-mono">
                                            <span className="text-gray-600 w-16 truncate">{h.period.replace('Last ','')}</span>
                                            <span className={`${h.fiiNet > 0 ? 'text-green-600' : 'text-red-600'} w-16 text-right`}>{formatCurrency(h.fiiNet)}</span>
                                            <span className={`${h.diiNet > 0 ? 'text-green-600' : 'text-red-600'} w-16 text-right`}>{formatCurrency(h.diiNet)}</span>
                                       </div>
                                   ))}
                               </div>
                           </div>
                       </div>
                   )}
               </div>

               <div className="flex items-center gap-3 w-full sm:w-auto">
                   <div className="relative flex-1 sm:w-64">
                       <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                           <Search size={14} className="text-gray-400" />
                       </div>
                       <input 
                           type="text"
                           value={filterQuery}
                           onChange={(e) => setFilterQuery(e.target.value)}
                           placeholder="Filter indices..."
                           className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                       />
                   </div>
                   
                   <button 
                       onClick={handleRefreshAll}
                       disabled={loading}
                       className="p-1.5 bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 rounded-lg transition-all disabled:opacity-50"
                       title="Refresh Data"
                   >
                       <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                   </button>
               </div>
            </div>
            
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col max-h-[600px]">
                {loading && indicesData.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-gray-400 text-sm italic gap-2">
                        <Loader2 size={24} className="animate-spin text-indigo-500" />
                        Loading market indices...
                    </div>
                ) : filteredData.length > 0 ? (
                    <div className="overflow-auto custom-scrollbar">
                        <table className="w-full text-xs text-left whitespace-nowrap">
                            <TableHeader />
                            <tbody className="bg-white">
                                {filteredData.map((data, idx) => (
                                    <IndexRow 
                                        key={data.index} 
                                        data={data} 
                                        isTracked={trackedIndices.includes(data.index)}
                                        onToggle={() => handleToggleTrack(data.index)}
                                        isAlternate={idx % 2 === 1}
                                        onSelectStock={onSelectStock} 
                                        onAddMover={handleAddMover}
                                        addedMovers={moverSymbols}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-gray-400 text-sm italic">
                        No indices found matching "{filterQuery}".
                    </div>
                )}
            </div>
        </div>

        {/* Section 2: Sectoral/Industrial Pulse interchanged posiiton as per requirement*/}
        <SectoralPulse 
            data={sectoralData}
            loading={loadingSector}
            onRefresh={() => loadSectorData(sectorDuration)}
            duration={sectorDuration}
            onDurationChange={handleSectorDurationChange}
            onAddMover={handleAddMover}
            onSelectStock={onSelectStock}
            addedSymbols={moverSymbols}
        />

           {/* Section 3: Portfolio Updates, interchanged position as per requirement */}
        <PortfolioUpdates 
            moversData={moversData} 
            onAddMover={handleAddMover} 
            onRefreshMover={handleRefreshMover}
            onRemoveMover={handleRemoveMover}
            isLoadingExternal={loadingMover}
            onViewDetails={onSelectStock} 
        />
    </div>
     
  );
};

export default MarketOverview;
