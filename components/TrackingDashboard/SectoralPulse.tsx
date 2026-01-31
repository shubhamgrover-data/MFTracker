
import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Search, Loader2, RefreshCw, ExternalLink, ArrowUp, ArrowDown, Minus, ChevronDown, CheckSquare, Square } from 'lucide-react';
import { SectorPulseItem, SectoralData } from '../../types/trackingTypes';
import { getTrackedIndices, addTrackedIndex, removeTrackedIndex } from '../../services/trackingStorage';
import { fetchMasterIndicesList } from '../../services/dataService';
import { findIndexName } from '../../services/helper';
import SectorInsightsWidget from './SectorInsightsWidget';

interface SectoralPulseProps {
  data: SectoralData | null;
  loading: boolean;
  onRefresh: () => void;
  duration: string;
  onDurationChange: (duration: string) => void;
  onAddMover: (symbol: string) => void;
  onSelectStock?: (symbol: string, name: string) => void;
  addedSymbols?: string[];
}

const SectoralPulse: React.FC<SectoralPulseProps> = ({ 
    data, 
    loading, 
    onRefresh, 
    duration, 
    onDurationChange,
    onAddMover,
    onSelectStock,
    addedSymbols = []
}) => {
  const [activeTab, setActiveTab] = useState<'SECTOR' | 'INDUSTRY' | 'INDEX'>('SECTOR');
  const [searchQuery, setSearchQuery] = useState('');
  const [trackedIndices, setTrackedIndices] = useState<string[]>([]);
  const [masterIndices, setMasterIndices] = useState<Array<{index: string}>>([]);

  useEffect(() => {
      const updateTracked = () => setTrackedIndices(getTrackedIndices());
      updateTracked();
      window.addEventListener('fundflow_tracking_update', updateTracked);
      return () => window.removeEventListener('fundflow_tracking_update', updateTracked);
  }, []);

  // Fetch Master Indices List for name resolution
  useEffect(() => {
      const loadMasterIndices = async () => {
          const list = await fetchMasterIndicesList();
          // Map to format expected by findIndexName
          setMasterIndices(list.map(i => ({ index: i.name })));
      };
      loadMasterIndices();
  }, []);

  const handleIndexToggle = (itemName: string) => {
      // Resolve canonical name
      const canonicalName = findIndexName(masterIndices, itemName);
      const targetName = canonicalName || itemName;

      if (trackedIndices.includes(targetName)) {
          removeTrackedIndex(targetName);
      } else {
          addTrackedIndex(targetName);
      }
  };

  const DURATION_OPTIONS = [
      { label: 'Day', value: '1D' },
      { label: 'Week', value: '1W' },
      { label: 'Month', value: '1M' },
      { label: 'Quarter', value: '3M' },
      { label: 'Year', value: '1Y' },
  ];

  const getActiveList = () => {
      if (!data) return [];
      switch (activeTab) {
          case 'SECTOR': return data.sectors;
          case 'INDUSTRY': return data.industries;
          case 'INDEX': return data.indices.filter(i => i.name.toUpperCase().includes('NIFTY'));
          default: return [];
      }
  };

  const processList = (list: SectorPulseItem[]) => {
      // 1. Sort by Change Percent Descending
      const sorted = [...list].sort((a, b) => b.changePercent - a.changePercent);

      // 2. Filter or Slice
      if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          return sorted.filter(item => item.name.toLowerCase().includes(q));
      } else {
          // Top 5 and Bottom 5
          if (sorted.length <= 10) return sorted;
          const top5 = sorted.slice(0, 5);
          const bottom5 = sorted.slice(-5);
          // Ensure no duplicates if list is small (though length check handles it)
          return [...top5, ...bottom5]; 
      }
  };

  const displayList = useMemo(() => processList(getActiveList()), [data, activeTab, searchQuery]);

  const formatVal = (val?: number) => {
      if (val === undefined || val === null) return '-';
      return val.toFixed(2);
  };
  
  const formatPrice = (val?: number) => {
      if (val === undefined || val === null) return '-';
      return val.toLocaleString('en-IN', { maximumFractionDigits: 2 });
  }

  const getChangeColor = (val: number) => {
      if (val > 0) return 'text-green-600';
      if (val < 0) return 'text-red-600';
      return 'text-gray-600';
  };

  return (
    <div className="flex flex-col gap-4">
       <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-4">
               <div className="flex items-center gap-2">
                   <div className="p-1.5 bg-gray-100 text-gray-500 rounded-lg">
                       <Calendar size={18} />
                   </div>
                   <h3 className="text-lg font-bold text-gray-900">Sectoral/Industrial Pulse</h3>
               </div>
               
               {/* Duration Dropdown */}
               <div className="relative">
                   <select 
                       value={duration}
                       onChange={(e) => onDurationChange(e.target.value)}
                       className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-gray-100"
                       disabled={loading}
                   >
                       {DURATION_OPTIONS.map(opt => (
                           <option key={opt.value} value={opt.value}>{opt.label}</option>
                       ))}
                   </select>
                   <ChevronDown size={14} className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
               </div>
           </div>

           <div className="flex items-center gap-3 w-full sm:w-auto">
               <div className="flex bg-gray-100 p-1 rounded-lg">
                   {(['SECTOR', 'INDUSTRY', 'INDEX'] as const).map(tab => (
                       <button
                           key={tab}
                           onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
                           className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                               activeTab === tab 
                               ? 'bg-white text-indigo-600 shadow-sm' 
                               : 'text-gray-500 hover:text-gray-700'
                           }`}
                       >
                           {tab === 'INDEX' ? 'Indices' : tab.charAt(0) + tab.slice(1).toLowerCase()}
                       </button>
                   ))}
               </div>

               <div className="relative flex-1 sm:w-48">
                   <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                       <Search size={14} className="text-gray-400" />
                   </div>
                   <input 
                       type="text"
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       placeholder={`Search ${activeTab.toLowerCase()}...`}
                       className="w-full bg-white border border-gray-200 text-gray-700 text-sm rounded-lg pl-9 pr-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   />
               </div>

               <button 
                   onClick={onRefresh}
                   disabled={loading}
                   className="p-1.5 bg-white border border-gray-200 text-gray-500 hover:text-indigo-600 hover:border-indigo-200 rounded-lg transition-all disabled:opacity-50"
                   title="Refresh Data"
               >
                   <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
               </button>
           </div>
       </div>

       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col max-h-[500px]">
           {loading && !data ? (
               <div className="p-12 flex flex-col items-center justify-center text-gray-400 text-sm italic gap-2">
                   <Loader2 size={24} className="animate-spin text-indigo-500" />
                   Loading sectoral data...
               </div>
           ) : displayList.length > 0 ? (
               <div className="overflow-auto custom-scrollbar">
                   <table className="w-full text-xs text-left whitespace-nowrap">
                       <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-200 sticky top-0 z-10">
                           <tr>
                               {activeTab === 'INDEX' && (
                                   <th className="px-4 py-3 w-10"></th>
                               )}
                               
                               <th className="px-4 py-3 text-left">Name</th>
                               <th className="px-4 py-3 text-right">Price</th>
                               <th className="px-4 py-3 text-center hidden sm:table-cell">Valuation (PE | PB)</th>
                               <th className="px-4 py-3 text-center hidden md:table-cell">Returns (1W | 1M | 1Y)</th>
                               <th className="px-4 py-3 text-center hidden lg:table-cell w-28">52W Range</th>
                               <th className="px-4 py-3 text-center hidden lg:table-cell">Breadth (Adv/Dec)</th>
                           </tr>
                       </thead>
                       <tbody className="bg-white divide-y divide-gray-50">
                           {displayList.map((item, idx) => {
                               const isPos = item.changePercent >= 0;
                               const total = item.advances + item.declines;
                               const advanceWidth = total > 0 ? (item.advances / total) * 100 : 0;
                               
                               const rangePos = (item.currentVal && item.yearLow && item.yearHigh)
                                   ? ((item.currentVal - item.yearLow) / (item.yearHigh - item.yearLow)) * 100
                                   : 0;

                               // Divider for Top/Bottom split if no search
                               const showDivider = !searchQuery && idx === 5 && displayList.length > 5;
                               const colSpan = activeTab === 'INDEX' ? 7 : 6;

                               // Determine tracking status for INDEX rows
                               let isTracked = false;
                               if (activeTab === 'INDEX') {
                                   const resolvedName = findIndexName(masterIndices, item.name);
                                   const target = resolvedName || item.name;
                                   isTracked = trackedIndices.includes(target);
                               }

                               return (
                                   <React.Fragment key={`${item.name}-${idx}`}>
                                       {showDivider && (
                                            <tr className="bg-gray-50">
                                                <td colSpan={colSpan} className="px-4 py-1 text-center text-[10px] text-gray-400 font-medium tracking-widest uppercase">
                                                    Bottom Performers
                                                </td>
                                            </tr>
                                       )}
                                       <tr className="hover:bg-gray-50 transition-colors group">
                                           {activeTab === 'INDEX' && (
                                               <td className="px-4 py-3 text-center">
                                                   <button 
                                                       onClick={(e) => { e.stopPropagation(); handleIndexToggle(item.name); }}
                                                       className={`transition-colors ${isTracked ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-500'}`}
                                                       title={isTracked ? "Remove from Watchlist" : "Add to Watchlist"}
                                                   >
                                                       {isTracked ? <CheckSquare size={16} /> : <Square size={16} />}
                                                   </button>
                                               </td>
                                           )}

                                           <td className="px-4 py-3">
                                               <div className="flex items-center gap-2">
                                                   <span className="font-semibold text-gray-800">{item.name}</span>
                                                   
                                                   {/* External Link */}
                                                   {item.url && (
                                                       <a 
                                                           href={item.url}
                                                           target="_blank"
                                                           rel="noreferrer"
                                                           className="text-gray-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                           onClick={(e) => e.stopPropagation()}
                                                       >
                                                           <ExternalLink size={12} />
                                                       </a>
                                                   )}

                                                   {/* Sector Insights Widget (Bulb Icon) */}
                                                   {item.url && (activeTab === 'SECTOR' || activeTab === 'INDUSTRY') && (
                                                       <SectorInsightsWidget 
                                                           sectorName={item.name}
                                                           sectorUrl={item.url}
                                                           onAddToMover={onAddMover}
                                                           onNavigateStock={onSelectStock}
                                                           addedSymbols={addedSymbols}
                                                       />
                                                   )}
                                               </div>
                                           </td>
                                           <td className="px-4 py-3 text-right">
                                               <div className="flex flex-col items-end">
                                                   <span className="font-medium text-gray-900">{formatPrice(item.currentVal)}</span>
                                                   <span className={`text-[10px] ${getChangeColor(item.changePercent)}`}>
                                                       {isPos ? '+' : ''}{formatVal(item.changePercent)}%
                                                   </span>
                                               </div>
                                           </td>
                                           
                                           {/* Valuation */}
                                           <td className="px-4 py-3 text-center text-gray-600 hidden sm:table-cell">
                                               <div className="flex items-center justify-center gap-2">
                                                   <span className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-700" title="PE">{formatVal(item.pe)}</span>
                                                   <span className="text-gray-300">|</span>
                                                   <span className="text-gray-500" title="PB">{formatVal(item.pb)}</span>
                                               </div>
                                           </td>

                                           {/* Returns */}
                                           <td className="px-4 py-3 text-center hidden md:table-cell">
                                               <div className="flex items-center justify-center gap-3">
                                                   <span className={getChangeColor(item.oneWeekChange || 0)}>{formatVal(item.oneWeekChange)}%</span>
                                                   <span className="text-gray-300">|</span>
                                                   <span className={getChangeColor(item.oneMonthChange || 0)}>{formatVal(item.oneMonthChange)}%</span>
                                                   <span className="text-gray-300">|</span>
                                                   <span className={getChangeColor(item.oneYearChange || 0)}>{formatVal(item.oneYearChange)}%</span>
                                               </div>
                                           </td>

                                           {/* 52W Range */}
                                           <td className="px-4 py-3 text-center hidden lg:table-cell">
                                               {item.yearLow && item.yearHigh ? (
                                                   <div className="flex flex-col gap-1 w-full max-w-[100px] mx-auto">
                                                       <div className="flex justify-between text-[9px] text-gray-400">
                                                           <span>{item.yearLow.toLocaleString()}</span>
                                                           <span>{item.yearHigh.toLocaleString()}</span>
                                                       </div>
                                                       <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden relative">
                                                           <div 
                                                               className="absolute h-full w-1.5 bg-indigo-600 rounded-full top-0 ml-[-3px]" 
                                                               style={{ left: `${Math.min(Math.max(rangePos, 0), 100)}%` }}
                                                           ></div>
                                                       </div>
                                                   </div>
                                               ) : (
                                                   <span className="text-gray-300 text-[10px]">-</span>
                                               )}
                                           </td>

                                           {/* Breadth */}
                                           <td className="px-4 py-3 hidden lg:table-cell">
                                               <div className="flex flex-col gap-1 w-full max-w-[100px] mx-auto">
                                                   <div className="flex w-full h-1.5 rounded-full overflow-hidden bg-gray-200">
                                                       <div className="bg-green-500 h-full" style={{ width: `${advanceWidth}%` }}></div>
                                                       <div className="bg-red-500 h-full" style={{ width: `${100 - advanceWidth}%` }}></div>
                                                   </div>
                                                   <div className="flex justify-between text-[9px] text-gray-500">
                                                       <span>{item.advances}</span>
                                                       <span>{item.declines}</span>
                                                   </div>
                                               </div>
                                           </td>
                                       </tr>
                                   </React.Fragment>
                               );
                           })}
                       </tbody>
                   </table>
               </div>
           ) : (
               <div className="p-8 text-center text-gray-400 text-sm italic">
                   No data found for "{searchQuery}".
               </div>
           )}
       </div>
    </div>
  );
};

export default SectoralPulse;
