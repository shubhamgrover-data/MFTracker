
import React from 'react';
import { Insight, Sentiment } from '../../types/trackingTypes';
import { TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react';

interface InsightCardProps {
  insight: Insight & { entityName: string; entitySymbol?: string };
}

const InsightCard: React.FC<InsightCardProps> = ({ insight }) => {
  
  const getSentimentColor = (s: Sentiment) => {
    switch(s) {
      case 'POSITIVE': return 'border-l-4 border-l-green-500';
      case 'NEGATIVE': return 'border-l-4 border-l-red-500';
      default: return 'border-l-4 border-l-gray-300';
    }
  };

  const getSentimentIcon = (s: Sentiment) => {
    switch(s) {
      case 'POSITIVE': return <TrendingUp size={16} className="text-green-600" />;
      case 'NEGATIVE': return <TrendingDown size={16} className="text-red-600" />;
      default: return <Minus size={16} className="text-gray-400" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
  };

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all ${getSentimentColor(insight.sentiment)}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
           <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded flex items-center gap-1">
             {insight.entitySymbol}
           </span>
           <span className="text-xs text-gray-400">• {insight.source}</span>
        </div>
        <span className="text-xs text-gray-400">{formatDate(insight.date)}</span>
      </div>

      <div className="flex items-start gap-2 mb-2">
        <h3 className="text-lg font-bold text-gray-900 leading-tight">
          {insight.title}
        </h3>
        {insight.sourceUrl && (
          <a 
            href={insight.sourceUrl} 
            target="_blank" 
            rel="noreferrer" 
            className="mt-1 text-gray-400 hover:text-indigo-600 transition-colors"
            title="Read Source"
          >
            <ExternalLink size={16} />
          </a>
        )}
      </div>
      
      <p className="text-gray-600 text-sm leading-relaxed mb-4">
        {insight.content}
      </p>

      <div className="flex items-center justify-between pt-4 border-t border-gray-50">
         <div className="flex items-center gap-2 text-xs font-medium">
            Sentiment: 
            <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-50">
               {getSentimentIcon(insight.sentiment)}
               <span className={insight.sentiment === 'POSITIVE' ? 'text-green-700' : insight.sentiment === 'NEGATIVE' ? 'text-red-700' : 'text-gray-500'}>
                 {insight.sentiment}
               </span>
            </div>
         </div>
      </div>
    </div>
  );
};

export default InsightCard;
