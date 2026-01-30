
import React from 'react';
import { Trash2, EyeOff, ExternalLink } from 'lucide-react';

interface IgnoreListProps {
  items: string[];
  onRemove: (symbol: string) => void;
  onItemClick: (symbol: string) => void;
}

const IgnoreList: React.FC<IgnoreListProps> = ({ items, onRemove, onItemClick }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 bg-red-50 flex items-center gap-2 shrink-0">
        <EyeOff size={18} className="text-red-600" />
        <h3 className="font-semibold text-gray-900">Ignored Stocks</h3>
        <span className="ml-auto bg-white text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full border border-gray-200">
          {items.length}
        </span>
      </div>

      <div className="overflow-y-auto flex-1 p-2 space-y-1.5 custom-scrollbar">
        {items.length > 0 ? (
          items.map((symbol) => (
            <div 
              key={symbol} 
              onClick={() => onItemClick(symbol)}
              className="group flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:border-red-200 hover:shadow-sm hover:bg-white transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 bg-red-100 text-red-700">
                  {symbol.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900 group-hover:text-red-700 transition-colors flex items-center gap-1">
                      {symbol}
                      <ExternalLink size={10} className="opacity-0 group-hover:opacity-50" />
                  </div>
                  <div className="text-xs text-gray-400">Hidden from Intelligent Tracking</div>
                </div>
              </div>

              <button
                onClick={(e) => { e.stopPropagation(); onRemove(symbol); }}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors z-10"
                title="Remove from Ignore List"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
             <div className="p-3 bg-gray-50 rounded-full">
               <EyeOff size={24} className="opacity-20"/>
             </div>
             <p>No ignored items.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IgnoreList;
