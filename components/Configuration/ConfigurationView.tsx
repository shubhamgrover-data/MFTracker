
import React, { useState, useEffect } from 'react';
import { Settings, Info } from 'lucide-react';
import EntityList from './EntityList';
import IndexWatchlist from './IndexWatchlist';
import { getTrackedItems, removeTrackedItem, TrackedItem } from '../../services/trackingStorage';
import { FundSearchResult } from '../../types';

interface ConfigurationViewProps {
  onSelectStock: (symbol: string, name: string) => void;
  onSelectFund: (fund: FundSearchResult) => void;
}

const ConfigurationView: React.FC<ConfigurationViewProps> = ({ onSelectStock, onSelectFund }) => {
  const [items, setItems] = useState<TrackedItem[]>([]);

  useEffect(() => {
    refreshItems();
  }, []);

  const refreshItems = () => {
    setItems(getTrackedItems());
  };

  const handleRemove = (id: string, type: 'STOCK' | 'MF') => {
    removeTrackedItem(id, type);
    refreshItems();
  };
  
  const handleItemClick = (item: TrackedItem) => {
    if (item.type === 'STOCK') {
      onSelectStock(item.id, item.name);
    } else {
      // Reconstruct FundSearchResult
      onSelectFund({
        name: item.name,
        url: item.url || '',
        pk: !isNaN(Number(item.id)) ? Number(item.id) : undefined
      });
    }
  };

  const stockItems = items.filter(i => i.type === 'STOCK');
  const mfItems = items.filter(i => i.type === 'MF');

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-10">
      <div className="flex items-center gap-3 pb-6 border-b border-gray-100">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configure Watchlist</h1>
          <p className="text-gray-500 text-sm">Manage the entities and indices you are tracking in your dashboard.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <EntityList 
          title="Tracked Stocks" 
          items={stockItems} 
          type="STOCK" 
          onRemove={(id) => handleRemove(id, 'STOCK')}
          onItemClick={handleItemClick}
        />
        
        <EntityList 
          title="Tracked Mutual Funds" 
          items={mfItems} 
          type="MF" 
          onRemove={(id) => handleRemove(id, 'MF')} 
          onItemClick={handleItemClick}
        />

        <IndexWatchlist />
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 text-blue-800 text-sm">
         <Info size={18} className="mt-0.5 shrink-0" />
         <p>
           To add more items to your watchlist, visit the <strong>Stock Search</strong> or <strong>MF Search</strong> pages 
           and click the <span className="inline-flex items-center justify-center w-5 h-5 bg-indigo-600 text-white rounded text-xs font-bold leading-none mx-1">+</span> icon next to any result.
         </p>
      </div>
    </div>
  );
};

export default ConfigurationView;
