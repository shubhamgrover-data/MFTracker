
import React, { useEffect, useState } from 'react';
import { RefreshCw, Loader2, Sparkles, MessageSquare, Plus, Check } from 'lucide-react';
import { useInsightExtraction } from '../hooks/useInsightExtraction';
import { addTrackedItem, removeTrackedItem, isTracked } from '../services/trackingStorage';
import InsightChatbot from './TrackingDashboard/InsightChatbot';
import BaseInsightCard from './TrackingDashboard/cards/BaseInsightCard';

// Import Cards
import PECard from './TrackingDashboard/cards/PECard';
import DetailedPECard from './TrackingDashboard/cards/DetailedPECard';
import MFHoldingsCard from './TrackingDashboard/cards/MFHoldingsCard';
import QuarterlyHoldingsCard from './TrackingDashboard/cards/QuarterlyHoldingsCard';
import BulkBlockDealsCard from './TrackingDashboard/cards/BulkBlockDealsCard';
import InsiderDealsCard from './TrackingDashboard/cards/InsiderDealsCard';
import TechnicalCard from './TrackingDashboard/cards/TechnicalCard';
import FinancialsCard from './TrackingDashboard/cards/FinancialsCard';
import DefaultInsightCard from './TrackingDashboard/cards/DefaultInsightCard';

interface StockDeepDiveProps {
  symbol: string;
  stockName: string;
}

const StockDeepDive: React.FC<StockDeepDiveProps> = ({ symbol, stockName }) => {
  const { results, status, startExtraction, progress } = useInsightExtraction();
  const [chatContext, setChatContext] = useState<any[] | null>(null);
  const [isTrackedStock, setIsTrackedStock] = useState(false);
  
  // Auto-fetch on mount if no data
  useEffect(() => {
    if (!results[symbol]) {
        startExtraction([symbol]);
    }
  }, [symbol]);

  // Check tracking status
  useEffect(() => {
    setIsTrackedStock(isTracked(symbol, 'STOCK'));
  }, [symbol]);

  const toggleTracking = () => {
    if (isTrackedStock) {
        removeTrackedItem(symbol, 'STOCK');
        setIsTrackedStock(false);
    } else {
        addTrackedItem({ id: symbol, name: stockName, symbol, type: 'STOCK' });
        setIsTrackedStock(true);
    }
  };

  const stockResults = results[symbol] || [];
  const isLoading = status === 'initializing' || status === 'polling';

  const renderSpecificCard = (indicator: string, data: any) => {
      switch(indicator) {
          case 'PE': return <PECard data={data} />;
          case 'DetailledPE': return <DetailedPECard data={data} />;
          case 'MFHoldings': return <MFHoldingsCard data={data} />;
          case 'QuaterlyHoldings': return <QuarterlyHoldingsCard data={data} />;
          case 'Bulk/Block Deals': return <BulkBlockDealsCard data={data} />;
          case 'Insider/SAST Deals': return <InsiderDealsCard data={data} />;
          case 'Technical': return <TechnicalCard data={data} />;
          case 'FinancialInsights': return <FinancialsCard data={data} />;
          default: return <DefaultInsightCard data={data} />;
      }
  };

  return (
    <div className="space-y-4 animate-fade-in">
       {/* Header */}
       <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center gap-3">
               <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                   <Sparkles size={20} />
               </div>
               <div>
                   <h3 className="font-bold text-gray-900">Deep Dive Analysis</h3>
                   <p className="text-xs text-gray-500">Comprehensive indicators for {stockName}</p>
               </div>
           </div>
           
           <div className="flex items-center gap-3 w-full sm:w-auto">
               <button
                   onClick={toggleTracking}
                   className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                       isTrackedStock 
                       ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' 
                       : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                   }`}
                   title={isTrackedStock ? "Remove from Watchlist" : "Add to Watchlist"}
               >
                   {isTrackedStock ? <Check size={16} /> : <Plus size={16} />}
                   <span>{isTrackedStock ? 'Tracked' : 'Track Stock'}</span>
               </button>

               {stockResults.length > 0 && (
                   <button 
                       onClick={() => setChatContext(stockResults.map(i => ({ symbol, indicator: i.indicatorName, data: i.data })))}
                       className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium transition-colors"
                   >
                       <MessageSquare size={16} />
                       Ask AI
                   </button>
               )}
               
               <button 
                   onClick={() => startExtraction([symbol])}
                   disabled={isLoading}
                   className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
               >
                   {isLoading ? (
                       <>
                         <Loader2 size={16} className="animate-spin" />
                         <span>{progress.total > 0 ? `${progress.completed}/${progress.total}` : 'Loading...'}</span>
                       </>
                   ) : (
                       <>
                         <RefreshCw size={16} />
                         <span>Refresh Analysis</span>
                       </>
                   )}
               </button>
           </div>
       </div>

       {/* Grid Content */}
       {stockResults.length > 0 ? (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               {stockResults.map((item, idx) => (
                   <BaseInsightCard
                        key={`${item.indicatorName}-${idx}`}
                        symbol={symbol}
                        indicatorName={item.indicatorName}
                        url={item.url}
                        isProcessing={false} // Hook handles data readiness
                        success={item.success}
                        isSelected={false}
                        onToggleSelect={() => {}} // No selection in this view
                        // onStockClick is undefined, so it renders as text
                   >
                       {renderSpecificCard(item.indicatorName, item.data)}
                   </BaseInsightCard>
               ))}
           </div>
       ) : (
           isLoading ? (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
                   {[...Array(3)].map((_, i) => (
                       <div key={i} className="h-48 bg-white rounded-xl border border-gray-100 p-4">
                           <div className="h-4 bg-gray-100 rounded w-1/3 mb-4"></div>
                           <div className="space-y-2">
                               <div className="h-3 bg-gray-100 rounded w-full"></div>
                               <div className="h-3 bg-gray-100 rounded w-5/6"></div>
                           </div>
                       </div>
                   ))}
               </div>
           ) : (
               <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300">
                   <p className="text-gray-500">Click "Refresh Analysis" to load detailed indicators.</p>
               </div>
           )
       )}

       {/* Chatbot Overlay */}
       {chatContext && (
           <InsightChatbot contextData={chatContext} onClose={() => setChatContext(null)} />
       )}
    </div>
  );
};

export default StockDeepDive;
