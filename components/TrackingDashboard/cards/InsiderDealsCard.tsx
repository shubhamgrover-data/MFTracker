
import React from 'react';
import { User, ShieldAlert, ArrowRightCircle } from 'lucide-react';

interface InsiderDealsCardProps {
  data: {
    title: string;
    summaries: string[];
    description: string;
  } | null;
}

const InsiderDealsCard: React.FC<InsiderDealsCardProps> = ({ data }) => {
  if (!data || !data.summaries || data.summaries.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
          No Insider Activity
        </div>
      );
  }

  const getTypeStyle = (text: string) => {
      const lower = text.toLowerCase();
      if (lower.includes('acquisition') || lower.includes('buy') || lower.includes('purchase')) {
          return { border: 'border-l-green-500', bg: 'bg-green-50/50', iconColor: 'text-green-600', label: 'Acquisition' };
      }
      if (lower.includes('disposal') || lower.includes('sell') || lower.includes('sold')) {
          return { border: 'border-l-red-500', bg: 'bg-red-50/50', iconColor: 'text-red-600', label: 'Disposal' };
      }
      if (lower.includes('revoke')) {
          return { border: 'border-l-yellow-500', bg: 'bg-yellow-50/50', iconColor: 'text-yellow-600', label: 'Revoke' };
      }
      if (lower.includes('pledge')) {
          return { border: 'border-l-orange-500', bg: 'bg-orange-50/50', iconColor: 'text-orange-600', label: 'Pledge' };
      }
      return { border: 'border-l-gray-300', bg: 'bg-gray-50', iconColor: 'text-gray-400', label: 'Disclosure' };
  };

  const highlightInfo = (text: string) => {
      // Bold Names and Numbers/Dates
      // Note: This regex is approximate based on standard disclosure formats
      return text.split(/(Acquisition|Disposal|Revoke|Pledge|[\d,]+|Rs\.?\s?[\d,.]+)/g).map((part, i) => {
          if (part.match(/^(Acquisition|Disposal|Revoke|Pledge)$/)) return <span key={i} className="font-bold underline">{part}</span>;
          if (part.match(/([\d,]+|Rs\.?\s?[\d,.]+)/)) return <span key={i} className="font-semibold text-gray-900">{part}</span>;
          return <span key={i}>{part}</span>;
      });
  };

  return (
    <div className="h-full overflow-y-auto custom-scrollbar p-1">
        <div className="space-y-3">
            {data.summaries.map((summary, idx) => {
                const style = getTypeStyle(summary);
                return (
                    <div key={idx} className={`pl-3 pr-2 py-2 rounded-r border border-gray-100 border-l-4 ${style.border} ${style.bg} relative`}>
                         <div className="flex justify-between items-center mb-1">
                             <div className="flex items-center gap-1.5">
                                 <User size={12} className={style.iconColor} />
                                 <span className={`text-[9px] font-bold uppercase tracking-wider ${style.iconColor}`}>
                                     {style.label}
                                 </span>
                             </div>
                         </div>
                         <p className="text-[10px] leading-relaxed text-gray-700">
                             {highlightInfo(summary)}
                         </p>
                    </div>
                );
            })}
            
            {/* Footer Description */}
            {data.description && (
                <div className="mt-4 pt-2 border-t border-gray-100 flex gap-2">
                    <ShieldAlert size={12} className="text-gray-400 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-gray-400 leading-normal">
                        {data.description}
                    </p>
                </div>
            )}
        </div>
    </div>
  );
};

export default InsiderDealsCard;
