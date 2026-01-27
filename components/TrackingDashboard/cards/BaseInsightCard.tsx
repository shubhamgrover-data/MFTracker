
import React, { ReactNode } from 'react';
import { CheckCircle, AlertCircle, Check, Loader2, ExternalLink } from 'lucide-react';

interface BaseInsightCardProps {
  symbol: string;
  indicatorName: string;
  url?: string;
  isProcessing: boolean;
  success: boolean;
  isSelected: boolean;
  onToggleSelect: () => void;
  onStockClick?: () => void;
  children: ReactNode;
}

const BaseInsightCard: React.FC<BaseInsightCardProps> = ({
  symbol,
  indicatorName,
  url,
  isProcessing,
  success,
  isSelected,
  onToggleSelect,
  onStockClick,
  children
}) => {
  return (
    <div 
      className={`bg-white rounded-xl border transition-all duration-200 flex flex-col ${
          isSelected ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500' : 'border-gray-200 shadow-sm hover:shadow-md'
      }`}
    >
      {/* Header */}
      <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-gray-50 rounded-t-xl">
        <div className="flex items-center gap-2 min-w-0">
            {onStockClick ? (
                <button 
                    onClick={onStockClick}
                    className="font-bold text-gray-800 text-sm hover:text-indigo-600 hover:underline transition-colors text-left"
                >
                    {symbol}
                </button>
            ) : (
                <span className="font-bold text-gray-800 text-sm">{symbol}</span>
            )}
            
            <span className="text-xs text-gray-400">•</span>
            
            {url ? (
                <a 
                    href={url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-xs font-medium text-indigo-600 hover:text-indigo-800 truncate max-w-[150px] flex items-center gap-1"
                    title={`Open ${indicatorName} source`}
                >
                    {indicatorName}
                    <ExternalLink size={10} />
                </a>
            ) : (
                <span className="text-xs font-medium text-gray-600 truncate max-w-[150px]" title={indicatorName}>
                    {indicatorName}
                </span>
            )}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
            {!isProcessing && (
              success ? <CheckCircle size={14} className="text-green-500"/> : <AlertCircle size={14} className="text-red-500"/>
            )}
            <button 
              onClick={onToggleSelect}
              className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                  isSelected ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-gray-300 text-transparent hover:border-indigo-400'
              }`}
            >
                <Check size={12} />
            </button>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex-1 overflow-hidden min-h-[120px] flex flex-col">
        {isProcessing ? (
           <div className="flex-1 flex flex-col items-center justify-center text-indigo-600 gap-2 opacity-70">
              <Loader2 size={20} className="animate-spin" />
              <span className="text-xs">Processing data...</span>
           </div>
        ) : !success ? (
           <div className="flex-1 flex items-center justify-center text-red-400 text-xs italic">
              Failed to load data
           </div>
        ) : (
           children
        )}
      </div>
    </div>
  );
};

export default BaseInsightCard;
