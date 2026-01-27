
import React from 'react';
import { Trash2, Briefcase, PieChart, ExternalLink } from 'lucide-react';
import { TrackedItem } from '../../services/trackingStorage';

interface EntityListProps {
  title: string;
  items: TrackedItem[];
  onRemove: (id: string) => void;
  type: 'STOCK' | 'MF';
  onItemClick: (item: TrackedItem) => void;
}

const EntityList: React.FC<EntityListProps> = ({ title, items, onRemove, type, onItemClick }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
        {type === 'STOCK' ? (
           <Briefcase size={18} className="text-indigo-600" />
        ) : (
           <PieChart size={18} className="text-indigo-600" />
        )}
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <span className="ml-auto bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>

      <div className="overflow-y-auto flex-1 p-2 space-y-2 max-h-[500px]">
        {items.length > 0 ? (
          items.map((item) => (
            <div 
              key={item.id} 
              onClick={() => onItemClick(item)}
              className="group flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-indigo-300 hover:shadow-sm hover:bg-white cursor-pointer transition-all"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    type === 'STOCK' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                }`}>
                  {item.symbol ? item.symbol.charAt(0) : item.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate pr-2 group-hover:text-indigo-700 transition-colors" title={item.name}>
                    {item.name}
                  </div>
                  {item.symbol && (
                    <div className="text-xs text-gray-500 font-mono">
                      {item.symbol}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                 <div className="p-2 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink size={16} />
                 </div>
                 <button
                    onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors z-10"
                    title="Remove from tracking"
                  >
                    <Trash2 size={16} />
                 </button>
              </div>
            </div>
          ))
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
             <div className="p-3 bg-gray-50 rounded-full">
               {type === 'STOCK' ? <Briefcase size={24} className="opacity-20"/> : <PieChart size={24} className="opacity-20"/>}
             </div>
             <p>No {type === 'STOCK' ? 'stocks' : 'funds'} tracked yet.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EntityList;
