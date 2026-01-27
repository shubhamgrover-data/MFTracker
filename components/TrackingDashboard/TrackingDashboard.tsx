
import React, { useState, useMemo, useEffect } from 'react';
import { Search, Loader2, RefreshCw, Database, Sparkles, ExternalLink, BarChart2, BrainCircuit } from 'lucide-react';
import InsightCard from './InsightCard';
import BulkInsightManager from './BulkInsightManager';
import IntelligentTrackingManager from './IntelligentTrackingManager';
import InsightChatbot from './InsightChatbot';
import { getTrackedItems, TrackedItem } from '../../services/trackingStorage';
import { fetchMarketInsights } from '../../services/geminiService';
import { Insight, InsightResultItem } from '../../types/trackingTypes';
import { FundSearchResult } from '../../types';
import { useInsightExtraction } from '../../hooks/useInsightExtraction';

interface TrackingDashboardProps {
  onSelectStock: (symbol: string, name: string) => void;
  onSelectFund: (fund: FundSearchResult) => void;
  bulkResults: Record<string, InsightResultItem[]>;
  setBulkResults: React.Dispatch<React.SetStateAction<Record<string, InsightResultItem[]>>>;
  bulkStatus: 'idle' | 'initializing' | 'polling' | 'completed' | 'error';
  setBulkStatus: React.Dispatch<React.SetStateAction<'idle' | 'initializing' | 'polling' | 'completed' | 'error'>>;
  bulkProgress: { completed: number; total: number };
  setBulkProgress: React.Dispatch<React.SetStateAction<{ completed: number; total: number }>>;
  requestId: string | null;
  setRequestId: React.Dispatch<React.SetStateAction<string | null>>;
}

// Interface for persisted Intelligent Tracking State
export interface IntelligentState {
    selectedIndex: string;
    symbols: string[];
    filter: string;
    page: number;
    pageSize: number;
}

const TrackingDashboard: React.FC<TrackingDashboardProps> = ({ 
  onSelectStock, 
  onSelectFund,
  bulkResults,
  setBulkResults,
  bulkStatus,
  setBulkStatus,
  bulkProgress,
  setBulkProgress,
  requestId,
  setRequestId
}) => {
  const [activeStreamTab, setActiveStreamTab] = useState<'DEEP_DIVE' | 'AI' | 'INTELLIGENT'>('INTELLIGENT');
  
  // Global Data State
  const [entities, setEntities] = useState<TrackedItem[]>([]);
  
  // Market News State
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Chat State
  const [chatContext, setChatContext] = useState<any[] | null>(null);

  // --- Lifted State for Intelligent Tracking (Persistence) ---
  const intelligentHook = useInsightExtraction();
  const [intelligentStats, setIntelligentStats] = useState({ filtered: 0, total: 0 });
  
  // Persisted View State for Intelligent Tracking
  const [intelligentState, setIntelligentState] = useState<IntelligentState>({
      selectedIndex: "NIFTY 50",
      symbols: [],
      filter: "All",
      page: 1,
      pageSize: 50
  });

  // Load initial data and listen for updates
  useEffect(() => {
    const loadItems = () => {
        const loadedEntities = getTrackedItems();
        setEntities(loadedEntities);
    };

    loadItems();

    const handleStorageUpdate = () => {
        loadItems();
    };

    window.addEventListener('fundflow_tracking_update', handleStorageUpdate);
    return () => window.removeEventListener('fundflow_tracking_update', handleStorageUpdate);
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

  return (
    <div className="flex flex-col gap-6 animate-fade-in w-full max-w-7xl mx-auto">
      
      {/* Header & Tabs */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
         <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Market Intelligence</h2>
              <p className="text-gray-500 text-sm">
                {activeStreamTab === 'INTELLIGENT' 
                  ? `Showing ${intelligentStats.filtered} stocks of ${intelligentStats.total} from index`
                  : `Tracking ${entities.length} items in your portfolio`
                }
              </p>
            </div>
         </div>

         {/* Tab Navigation */}
         <div className="flex items-center gap-6 border-b border-gray-200 overflow-x-auto">
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
         
         {/* INTELLIGENT TRACKING VIEW */}
         {activeStreamTab === 'INTELLIGENT' && (
            <IntelligentTrackingManager 
                onOpenChat={(ctx) => setChatContext(ctx)}
                onSelectStock={onSelectStock}
                extractionData={intelligentHook}
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
                results={bulkResults}
                setResults={setBulkResults}
                status={bulkStatus}
                setStatus={setBulkStatus}
                progress={bulkProgress}
                setProgress={setBulkProgress}
                requestId={requestId}
                setRequestId={setRequestId}
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
