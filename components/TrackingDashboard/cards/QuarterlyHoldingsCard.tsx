
import React from 'react';
import { TrendingUp, TrendingDown, Minus, ArrowRight } from 'lucide-react';

interface Insight {
  type: string;
  message: string;
}

interface QuarterlyHoldingsCardProps {
  data: { insights: Insight[] } | null;
}

const QuarterlyHoldingsCard: React.FC<QuarterlyHoldingsCardProps> = ({ data }) => {
  if (!data || !data.insights || data.insights.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
          No Quarterly Data
        </div>
      );
  }

  const getIcon = (type: string) => {
      const t = type.toLowerCase();
      if (t === 'positive') return <TrendingUp size={14} className="text-green-600" />;
      if (t === 'negative') return <TrendingDown size={14} className="text-red-600" />;
      return <Minus size={14} className="text-gray-400" />;
  };

  const getBgClass = (type: string) => {
      const t = type.toLowerCase();
      if (t === 'positive') return 'bg-green-50 border-green-100';
      if (t === 'negative') return 'bg-red-50 border-red-100';
      return 'bg-gray-50 border-gray-100';
  };

  // Helper to make percentages bold
  const formatMessage = (msg: string) => {
      const parts = msg.split(/(\d+(?:\.\d+)?%)/);
      return parts.map((part, i) => {
          if (part.includes('%')) {
              return <span key={i} className="font-bold text-gray-900">{part}</span>;
          }
          return <span key={i}>{part}</span>;
      });
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-1">
        <div className="space-y-2">
            {data.insights.map((insight, idx) => (
                <div key={idx} className={`p-2 rounded border flex items-start gap-2.5 ${getBgClass(insight.type)}`}>
                    <div className="mt-0.5 shrink-0 bg-white p-1 rounded-full shadow-sm">
                        {getIcon(insight.type)}
                    </div>
                    <div className="text-[10px] leading-relaxed text-gray-700 font-medium">
                        {formatMessage(insight.message)}
                    </div>
                </div>
            ))}
        </div>
    </div>
  );
};

export default QuarterlyHoldingsCard;
