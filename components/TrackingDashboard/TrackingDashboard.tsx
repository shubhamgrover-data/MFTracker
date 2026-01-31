
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Loader2, RefreshCw, Database, Sparkles, ExternalLink, BarChart2, BrainCircuit, X, Globe, TrendingUp, TrendingDown } from 'lucide-react';
import InsightCard from './InsightCard';
import BulkInsightManager from './BulkInsightManager';
import IntelligentTrackingManager from './IntelligentTrackingManager';
import InsightChatbot from './InsightChatbot';
import MarketOverview from './MarketOverview';
import { getTrackedItems, TrackedItem, getTrackedIndices } from '../../services/trackingStorage';
import { fetchMarketInsights } from '../../services/geminiService';
import { fetchMarketIndices } from '../../services/dataService';
import { Insight, InsightResultItem, IntelligentState, MarketIndexData, SectoralData } from '../../types/trackingTypes';
import { FundSearchResult } from '../../types';
import { HEADER_INDICES } from '../../types/constants';
import { useInsightExtraction } from '../../hooks/useInsightExtraction';

interface TrackingDashboardProps {
  onSelectStock: (symbol: string, name: string) => void;
  onSelectFund: (fund: FundSearchResult) => void;
  
  // Market Data (Lifted)
  marketIndices: MarketIndexData[];
  setMarketIndices: React.Dispatch<React.SetStateAction<MarketIndexData[]>>;
  moversData: any[];
  setMoversData: React.Dispatch<React.SetStateAction<any[]>>;
  sectoralData: SectoralData | null;
  setSectoralData: React.Dispatch<React.SetStateAction<SectoralData | null>>;

  // Deep Dive State
  deepDiveExtraction: ReturnType<typeof useInsightExtraction>;

  // Intelligent State
  intelligentExtraction: ReturnType<typeof useInsightExtraction>;
  intelligentState: IntelligentState;
  setIntelligentState: React.Dispatch<React.SetStateAction<IntelligentState>>;
}

const TrackingDashboard: React.FC<TrackingDashboardProps> = ({ 
  onSelectStock, 
  onSelectFund,
  marketIndices,
  setMarketIndices,
  moversData,
  setMoversData,
  sectoralData,
  setSectoralData,
  deepDiveExtraction,
  intelligentExtraction,
  intelligentState,
  setIntelligentState
}) => {
  const [activeStreamTab, setActiveStreamTab] = useState<'DEEP_DIVE' | 'AI' | 'INTELLIGENT' | 'MARKET'>('MARKET');
  
  // Global Data State
  const [entities, setEntities] = useState<TrackedItem[]>([]);
  const [trackedIndices, setTrackedIndices] = useState<string[]>([]);
  
  const [loadingIndices, setLoadingIndices] = useState(false);

  // Market News State
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Chat State
  const [chatContext, setChatContext] = useState<any[] | null>(null);

  // Local stats for display
  const [intelligentStats, setIntelligentStats] = useState<{ filtered: number; total: number; ignoredList: string[] }>({ filtered: 0, total: 0, ignoredList: [] });
  const [showIgnoredPopover, setShowIgnoredPopover] = useState(false);
  const ignoredPopoverRef = useRef<HTMLDivElement>(null);

  const loadIndices = async () => {
      setLoadingIndices(true);
      const data = await fetchMarketIndices();
      setMarketIndices(data);
      setLoadingIndices(false);
  };

  // Load initial data and listen for updates
  useEffect(() => {
    const loadItems = () => {
        setEntities(getTrackedItems());
        setTrackedIndices(getTrackedIndices());
    };

    loadItems();

    const handleStorageUpdate = () => {
        loadItems();
    };

    window.addEventListener('fundflow_tracking_update', handleStorageUpdate);
    return () => window.removeEventListener('fundflow_tracking_update', handleStorageUpdate);
  }, []); 

  // Fetch Market Indices only if empty
  useEffect(() => {
      if (marketIndices.length === 0) {
          loadIndices();
      }
  }, []);

  // Close popover on click outside
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (ignoredPopoverRef.current && !ignoredPopoverRef.current.contains(event.target as Node)) {
              setShowIgnoredPopover(false);
          }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchInsights = async () => {
     if (entities.length === 0) return;
     setLoadingInsights(true);
     try {
         const data = await fetchMarketInsights(entities);
         setInsights(data);
     } catch (err) {
         console.error(err);
     } finally {
         setLoadingInsights(false);
     }
  };

  const filteredInsights = useMemo(() => {
    let filtered = insights;
    if (searchQuery) {
        const lowerQ = searchQuery.toLowerCase();
        filtered = filtered.filter(i => 
        i.title.toLowerCase().includes(lowerQ) || 
        i.content.toLowerCase().includes(lowerQ)
        );
    }
    return filtered.map(item => {
        const entity = entities.find(e => e.id === item.entityId);
        return { ...item, entityName: entity?.name || 'Unknown', entitySymbol: entity?.symbol };
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [insights, entities, searchQuery]);

  // Header Indices Data
  const headerIndicesData = useMemo(() => {
      return marketIndices.filter(idx => HEADER_INDICES.includes(idx.index));
  }, [marketIndices]);

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-7xl mx-auto relative">
      
      {/* Header & Tabs */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
         <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-6">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">Market Intelligence</h2>
              <p className="text-gray-500 text-sm relative mt-1">
                {activeStreamTab === 'INTELLIGENT' 
                  ? (
                    <span>
                      Showing <strong>{intelligentStats.filtered}</strong> potential stocks from index ({intelligentStats.total} active)
                      {intelligentStats.ignoredList.length > 0 && (
                          <span className="ml-1 text-red-400">
                              • <span 
                                  className="cursor-pointer underline decoration-dotted hover:text-red-600"
                                  onClick={() => setShowIgnoredPopover(!showIgnoredPopover)}
                                >
                                  {intelligentStats.ignoredList.length} ignored
                                </span>
                          </span>
                      )}
                    </span>
                  )
                  : activeStreamTab === 'MARKET' ? "Overview of global and tracked indices"
                  : `Tracking ${entities.length} items in your portfolio`
                }
              </p>
              
              {/* Ignored List Popover */}
              {showIgnoredPopover && intelligentStats.ignoredList.length > 0 && (
                  <div 
                    ref={ignoredPopoverRef}
                    className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-64 animate-fade-in left-0 md:left-auto"
                  >
                      <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                          <h4 className="text-xs font-bold text-gray-700">Ignored in this Index</h4>
                          <button onClick={() => setShowIgnoredPopover(false)} className="text-gray-400 hover:text-gray-600">
                              <X size={14} />
                          </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto space-y-1">
                          {intelligentStats.ignoredList.map(sym => (
                              <div 
                                key={sym} 
                                className="text-xs text-gray-600 px-2 py-1 rounded hover:bg-gray-50 cursor-pointer flex justify-between"
                                onClick={() => { onSelectStock(sym, sym); setShowIgnoredPopover(false); }}
                              >
                                  <span>{sym}</span>
                                  <ExternalLink size={10} className="text-gray-400 opacity-50" />
                              </div>
                          ))}
                      </div>
                  </div>
              )}
            </div>

            {/* Subtle Market Header Stats - Vertical Stack */}
            <div className="flex flex-col gap-2 items-end min-w-[200px]">
                <div className="flex items-center gap-2 mb-1">
                     <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Live Indices</span>
                     <button 
                         onClick={loadIndices}
                         disabled={loadingIndices}
                         className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                         title="Refresh Indices"
                     >
                         <RefreshCw size={12} className={loadingIndices ? 'animate-spin' : ''} />
                     </button>
                </div>
                {headerIndicesData.length > 0 ? (
                    headerIndicesData.map(idx => {
                        const isPos = idx.percentChange >= 0;
                        const tooltipText = `PE: ${idx.pe}\nPrevious Close: ${idx.previousClose}\nOpen: ${idx.open}\nHigh: ${idx.high}\nLow: ${idx.low}\nYear High: ${idx.yearHigh}\nYear Low: ${idx.yearLow}`;
                        
                        return (
                            <div 
                                key={idx.index} 
                                className="flex items-center justify-between gap-3 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100 text-xs cursor-help hover:bg-gray-100 hover:border-gray-300 transition-colors w-full"
                                title={tooltipText}
                            >
                                <span className="font-semibold text-gray-700">{idx.index}</span>
                                <div className="flex items-center gap-2">
                                    <span className="font-mono text-gray-800">{idx.last.toLocaleString()}</span>
                                    <span className={`font-medium w-12 text-right ${isPos ? 'text-green-600' : 'text-red-600'}`}>
                                        {isPos ? '+' : ''}{idx.percentChange.toFixed(2)}%
                                    </span>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-xs text-gray-400 italic">Loading indices...</div>
                )}
            </div>
         </div>

         {/* Tab Navigation - Updated Order */}
         <div className="flex items-center gap-6 border-b border-gray-200 overflow-x-auto">
             <button
                onClick={() => setActiveStreamTab('MARKET')}
                className={`flex items-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeStreamTab === 'MARKET' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
             >
                <Globe size={18} />
                Market Overview
             </button>
             <button
                onClick={() => setActiveStreamTab('INTELLIGENT')}
                className={`flex items-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeStreamTab === 'INTELLIGENT' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
             >
                <BrainCircuit size={18} />
                Intelligent Tracking
             </button>
             <button
                onClick={() => setActiveStreamTab('DEEP_DIVE')}
                className={`flex items-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeStreamTab === 'DEEP_DIVE' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
             >
                <BarChart2 size={18} />
                Tracked Assets
             </button>
             <button
                onClick={() => setActiveStreamTab('AI')}
                className={`flex items-center gap-2 px-2 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeStreamTab === 'AI' 
                    ? 'border-indigo-600 text-indigo-600' 
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
             >
                <Sparkles size={18} />
                Market News
             </button>
         </div>
      </div>

      {/* Main Content Area */}
      <div className="min-h-[500px]">
         
         {/* MARKET OVERVIEW */}
         {activeStreamTab === 'MARKET' && (
             <MarketOverview 
                indicesData={marketIndices} 
                trackedIndices={trackedIndices}
                onRefresh={loadIndices}
                loading={loadingIndices}
                onSelectStock={onSelectStock}
                moversData={moversData}
                setMoversData={setMoversData}
                sectoralData={sectoralData}
                setSectoralData={setSectoralData}
             />
         )}

         {/* INTELLIGENT TRACKING VIEW */}
         {activeStreamTab === 'INTELLIGENT' && (
            <IntelligentTrackingManager 
                onOpenChat={(ctx) => setChatContext(ctx)}
                onSelectStock={onSelectStock}
                extractionData={intelligentExtraction}
                onStatsUpdate={setIntelligentStats}
                // Pass persisted state props
                viewState={intelligentState}
                setViewState={setIntelligentState}
            />
         )}

         {/* TRACKED ASSETS (Deep Dive) VIEW */}
         {activeStreamTab === 'DEEP_DIVE' && (
            <BulkInsightManager 
                items={entities}
                extractionData={deepDiveExtraction}
                onOpenChat={(ctx) => setChatContext(ctx)}
                onSelectStock={onSelectStock}
            />
         )}

         {/* MARKET NEWS VIEW */}
         {activeStreamTab === 'AI' && (
            <div className="space-y-4">
               <div className="flex items-center justify-between pb-2">
                  <p className="text-xs text-gray-500">
                      {loadingInsights 
                        ? 'Analyzing market data...' 
                        : `${filteredInsights.length} insights generated via Gemini`
                      }
                  </p>
                  <button 
                      onClick={fetchInsights} 
                      disabled={loadingInsights}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors text-sm font-medium"
                  >
                      {loadingInsights ? <Loader2 size={16} className="animate-spin"/> : <RefreshCw size={16} />}
                      Generate New Insights
                  </button>
               </div>

               {loadingInsights && filteredInsights.length === 0 ? (
                  <div className="p-12 flex flex-col items-center justify-center space-y-3 bg-white rounded-xl border border-gray-100">
                      <Loader2 size={32} className="animate-spin text-indigo-600" />
                      <p className="text-gray-500 text-sm">Gathering intelligent insights...</p>
                  </div>
               ) : filteredInsights.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredInsights.map(insight => (
                          <InsightCard key={insight.id} insight={insight} />
                      ))}
                  </div>
               ) : (
                  <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
                      <Sparkles size={48} className="mx-auto text-indigo-200 mb-4" />
                      <h3 className="text-lg font-medium text-gray-900">AI Market News</h3>
                      <p className="text-gray-500 max-w-sm mx-auto mt-2">
                          Get real-time summaries and sentiment analysis for your portfolio items powered by Gemini 2.5.
                      </p>
                      <button 
                          onClick={fetchInsights}
                          className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-full font-medium hover:bg-indigo-700 transition-shadow shadow-md"
                      >
                          Generate News
                      </button>
                  </div>
               )}
            </div>
         )}
      </div>

      {/* Floating Chatbot Overlay */}
      {chatContext && (
          <InsightChatbot 
              contextData={chatContext} 
              onClose={() => setChatContext(null)} 
          />
      )}
    </div>
  );
};

export default TrackingDashboard;
