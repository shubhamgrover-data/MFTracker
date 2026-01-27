
import React from 'react';
import { Calendar, Layers, FileText } from 'lucide-react';

interface BulkBlockDealsCardProps {
  data: {
    title: string;
    summary: string;
    description: string;
  } | null;
}

const BulkBlockDealsCard: React.FC<BulkBlockDealsCardProps> = ({ data }) => {
  if (!data || !data.summary) {
      return (
        <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
          No Recent Deals
        </div>
      );
  }

  // Basic regex to wrap numbers and dates in bold tags
  const highlightKeyInfo = (text: string) => {
      // Matches dates like Nov. 21, 2025 or numbers like 352,107 or prices like Rs 1534.00
      const parts = text.split(/(\b[A-Z][a-z]{2}\.\s\d{1,2},\s\d{4}\b|\b[\d,]+\s(?:shares)|Rs\s[\d,.]+)/g);
      return parts.map((part, i) => {
          if (part.match(/(\b[A-Z][a-z]{2}\.\s\d{1,2},\s\d{4}\b|\b[\d,]+\s(?:shares)|Rs\s[\d,.]+)/)) {
              return <span key={i} className="font-bold text-indigo-900 bg-indigo-50 px-1 rounded">{part}</span>;
          }
          return part;
      });
  };

  return (
    <div className="h-full flex flex-col justify-between overflow-y-auto custom-scrollbar p-1 gap-3">
        {/* Latest Deal Highlight */}
        <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-2 text-indigo-600">
                <Layers size={14} />
                <span className="text-[10px] font-bold uppercase tracking-wider">Latest Deal Summary</span>
            </div>
            <div className="p-3 bg-white rounded-lg border border-indigo-100 shadow-sm text-sm text-gray-700 leading-relaxed">
                {highlightKeyInfo(data.summary)}
            </div>
        </div>

        {/* Description / Footer */}
        {data.description && (
            <div className="mt-auto border-t border-gray-100 pt-2">
                 <div className="flex gap-1.5 items-start">
                    <FileText size={12} className="text-gray-400 mt-0.5 shrink-0" />
                    <p className="text-[9px] text-gray-400 leading-normal line-clamp-3">
                        {data.description}
                    </p>
                 </div>
            </div>
        )}
    </div>
  );
};

export default BulkBlockDealsCard;
