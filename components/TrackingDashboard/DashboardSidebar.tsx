
import React from 'react';
import { TrackedItem } from '../../services/trackingStorage';
import { Briefcase, PieChart, Layers, CheckCircle } from 'lucide-react';

interface DashboardSidebarProps {
  entities: TrackedItem[];
  selectedEntityId: string | 'ALL';
  selectedType: 'ALL' | 'STOCK' | 'MF';
  onSelectEntity: (id: string | 'ALL') => void;
  onSelectType: (type: 'ALL' | 'STOCK' | 'MF') => void;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({ 
  entities,
  selectedEntityId, 
  selectedType, 
  onSelectEntity, 
  onSelectType 
}) => {
  
  const filteredEntities = selectedType === 'ALL' 
    ? entities 
    : entities.filter(e => e.type === selectedType);

  return (
    <div className="w-full md:w-64 flex-shrink-0 bg-white md:rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col md:h-[calc(100vh-140px)] sticky top-6">
      <div className="p-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 mb-3">Your Watchlist</h3>
        
        {/* Type Filter Buttons */}
        <div className="flex p-1 bg-gray-100 rounded-lg">
          {(['ALL', 'STOCK', 'MF'] as const).map((type) => (
             <button
               key={type}
               onClick={() => { onSelectType(type); onSelectEntity('ALL'); }}
               className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${
                 selectedType === type 
                 ? 'bg-white text-indigo-600 shadow-sm' 
                 : 'text-gray-500 hover:text-gray-700'
               }`}
             >
               {type === 'ALL' ? 'All' : type === 'STOCK' ? 'Stocks' : 'MFs'}
             </button>
          ))}
        </div>
      </div>

      <div className="overflow-y-auto flex-1 p-2 space-y-1">
        <button
          onClick={() => onSelectEntity('ALL')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
            selectedEntityId === 'ALL' 
              ? 'bg-indigo-50 text-indigo-700 font-medium' 
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <div className={`p-1.5 rounded-md ${selectedEntityId === 'ALL' ? 'bg-indigo-100' : 'bg-gray-100'}`}>
            <Layers size={16} />
          </div>
          <span>Combined Feed</span>
          {selectedEntityId === 'ALL' && <CheckCircle size={14} className="ml-auto" />}
        </button>

        <div className="my-2 border-t border-gray-100 mx-2"></div>
        <div className="px-3 pb-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Tracked Items
        </div>

        {filteredEntities.length > 0 ? filteredEntities.map((entity) => (
          <button
            key={entity.id}
            onClick={() => onSelectEntity(entity.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group ${
              selectedEntityId === entity.id 
                ? 'bg-indigo-50 text-indigo-700 font-medium' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <div className={`p-1.5 rounded-md ${
              selectedEntityId === entity.id ? 'bg-indigo-100' : 'bg-gray-100'
            }`}>
              {entity.type === 'STOCK' ? <Briefcase size={16} /> : <PieChart size={16} />}
            </div>
            <div className="flex flex-col items-start min-w-0">
               <span className="truncate max-w-[120px] text-left">{entity.name}</span>
               <span className="text-[10px] text-gray-400">{entity.symbol || entity.type}</span>
            </div>
          </button>
        )) : (
          <div className="px-3 py-4 text-center text-xs text-gray-400 italic">
            No items in watchlist.
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardSidebar;
