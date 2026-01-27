
import React from 'react';
import { TrendingUp, Briefcase, Activity, Layers, Plus, Check, ExternalLink, Gauge, RefreshCw, Square, CheckSquare } from 'lucide-react';
import { ProcessedInsight } from '../../../services/indicatorProcessor';

interface IntelligentStockCardProps {
  symbol: string;
  insights: ProcessedInsight[];
  isTracked: boolean;
  onToggleTrack: () => void;
  onOpenDeepDive: () => void;
  onAskAI: () => void;
  onRefresh: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}

const IntelligentStockCard: React.FC<IntelligentStockCardProps> = ({ 
  symbol, 
  insights,
  isTracked,
  onToggleTrack, 
  onOpenDeepDive,
  onAskAI,
  onRefresh,
  isSelected,
  onToggleSelect
}) => {

  const groupInsights = () => {
      const groups = {
          Valuation: [] as ProcessedInsight[],
          Technicals: [] as ProcessedInsight[],
          Holdings: [] as ProcessedInsight[],
          Performance: [] as ProcessedInsight[],
          Deals: [] as ProcessedInsight[]
      };

      insights.forEach(i => {
          if (i.type && groups[i.type]) {
              groups[i.type].push(i);
          }
      });
      return groups;
  };

  const grouped = groupInsights();
  const hasData = insights.length > 0;

  const renderSection = (title: string, items: ProcessedInsight[], icon: React.ReactNode, bgClass: string, textClass: string) => {
      if (items.length === 0) return null;
      
      return (
          <div className="mb-3 last:mb-0">
             <div className="flex items-center gap-1.5 mb-1.5">
                <div className={`p-1 rounded ${bgClass} ${textClass}`}>
                    {icon}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${textClass}`}>{title}</span>
             </div>
             <div className="space-y-1.5">
                 {items.map((item, idx) => (
                     <div key={idx} className="text-xs text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 leading-snug">
                         {item.text}
                     </div>
                 ))}
             </div>
          </div>
      );
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all flex flex-col h-full group ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-200'}`}>
        {/* Header */}
        <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl">
             {/* Left: Selection & Symbol */}
             <div className="flex items-center gap-2 flex-1 min-w-0">
                 <button 
                    onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
                    className={`shrink-0 text-gray-400 hover:text-indigo-600 transition-colors`}
                    title="Select Card"
                 >
                    {isSelected ? <CheckSquare size={18} className="text-indigo-600" /> : <Square size={18} />}
                 </button>

                 <div 
                    onClick={onOpenDeepDive}
                    className="flex items-center gap-2 text-left cursor-pointer hover:bg-gray-100 p-1 rounded-lg transition-colors flex-1 min-w-0"
                    title="Click for Deep Dive Analysis"
                 >
                     <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                        {symbol[0]}
                     </div>
                     <div className="min-w-0">
                        <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">
                            {symbol}
                        </h3>
                        <div className="text-[10px] text-gray-500 font-medium truncate">
                            {insights.length} Insight{insights.length !== 1 ? 's' : ''} Found
                        </div>
                     </div>
                 </div>
             </div>

             {/* Right: Actions */}
             <div className="flex items-center gap-1">
                 {/* External Link */}
                 <a 
                    href={`https://trendlyne.com/equity/${symbol}/stock-page/`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-md transition-all"
                    title="View on Trendlyne"
                    onClick={(e) => e.stopPropagation()}
                 >
                    <ExternalLink size={14} />
                 </a>

                 {/* Single Card Refresh */}
                 <button 
                    onClick={(e) => { e.stopPropagation(); onRefresh(); }}
                    className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-white rounded-md transition-all"
                    title="Force Refresh Data"
                 >
                    <RefreshCw size={14} />
                 </button>

                 {/* Track Toggle Button */}
                 <button 
                    onClick={(e) => { e.stopPropagation(); onToggleTrack(); }}
                    className={`w-8 h-8 flex items-center justify-center rounded-lg border transition-all shrink-0 ml-1 ${
                        isTracked 
                        ? 'bg-green-50 border-green-200 text-green-600' 
                        : 'bg-white border-gray-200 text-gray-400 hover:text-indigo-600 hover:border-indigo-200'
                    }`}
                    title={isTracked ? "Remove from Tracking List" : "Add to Tracking List"}
                 >
                    {isTracked ? <Check size={14} /> : <Plus size={14} />}
                 </button>
             </div>
        </div>

        {/* Body */}
        <div className="p-3 flex-1 overflow-y-auto max-h-[300px] custom-scrollbar">
            {hasData ? (
                <>
                   {renderSection("Valuation", grouped.Valuation, <Activity size={12}/>, "bg-blue-50", "text-blue-700")}
                   {renderSection("Technicals", grouped.Technicals, <Gauge size={12}/>, "bg-cyan-50", "text-cyan-700")}
                   {renderSection("Institutional Holdings", grouped.Holdings, <Briefcase size={12}/>, "bg-purple-50", "text-purple-700")}
                   {renderSection("Performance Trend", grouped.Performance, <TrendingUp size={12}/>, "bg-green-50", "text-green-700")}
                   {renderSection("Deals & Insider", grouped.Deals, <Layers size={12}/>, "bg-orange-50", "text-orange-700")}
                </>
            ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-xs italic">
                    No significant triggers found.
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-100 mt-auto flex gap-2">
             <button 
                onClick={onAskAI}
                className="flex-1 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1.5"
             >
                <Briefcase size={12} /> Ask AI
             </button>
        </div>
    </div>
  );
};

export default IntelligentStockCard;
