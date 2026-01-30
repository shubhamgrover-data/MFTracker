
import React, { useState, useEffect } from 'react';
import { Settings, Info } from 'lucide-react';
import EntityList from './EntityList';
import IndexWatchlist from './IndexWatchlist';
import IgnoreList from './IgnoreList';
import { getTrackedItems, removeTrackedItem, TrackedItem, getIgnoredItems, removeIgnoredItem } from '../../services/trackingStorage';
import { FundSearchResult } from '../../types';

interface ConfigurationViewProps {
  onSelectStock: (symbol: string, name: string) => void;
  onSelectFund: (fund: FundSearchResult) => void;
}

const ConfigurationView: React.FC<ConfigurationViewProps> = ({ onSelectStock, onSelectFund }) => {
  const [items, setItems] = useState<TrackedItem[]>([]);
  const [ignoredItems, setIgnoredItems] = useState<string[]>([]);

  useEffect(() => {
    refreshItems();
  }, []);

  const refreshItems = () => {
    setItems(getTrackedItems());
    setIgnoredItems(getIgnoredItems());
  };

  const handleRemove = (id: string, type: 'STOCK' | 'MF') => {
    removeTrackedItem(id, type);
    refreshItems();
  };
  
  const handleRemoveIgnored = (symbol: string) => {
      removeIgnoredItem(symbol);
      refreshItems();
  }
  
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

  const handleIgnoreClick = (symbol: string) => {
      onSelectStock(symbol, symbol);
  };

  const stockItems = items.filter(i => i.type === 'STOCK');
  const mfItems = items.filter(i => i.type === 'MF');

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in flex flex-col h-[calc(100vh-100px)] min-h-[800px]">
      <div className="flex items-center gap-3 pb-4 border-b border-gray-100 shrink-0">
        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
          <Settings size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configure Watchlist</h1>
          <p className="text-gray-500 text-sm">Manage the entities, indices, and ignored items in your dashboard.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Column 1: Stocks (Top) & Ignored (Bottom) - 50/50 Split */}
        <div className="flex flex-col gap-6 h-full min-h-0">
            <div className="flex-1 min-h-0">
                <EntityList 
                  title="Tracked Stocks" 
                  items={stockItems} 
                  type="STOCK" 
                  onRemove={(id) => handleRemove(id, 'STOCK')}
                  onItemClick={handleItemClick}
                />
            </div>
            <div className="flex-1 min-h-0">
                <IgnoreList 
                    items={ignoredItems}
                    onRemove={handleRemoveIgnored}
                    onItemClick={handleIgnoreClick}
                />
            </div>
        </div>
        
        {/* Column 2: Mutual Funds */}
        <div className="h-full min-h-0">
            <EntityList 
              title="Tracked Mutual Funds" 
              items={mfItems} 
              type="MF" 
              onRemove={(id) => handleRemove(id, 'MF')} 
              onItemClick={handleItemClick}
            />
        </div>

        {/* Column 3: Indices */}
        <div className="h-full min-h-0">
            <IndexWatchlist />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3 text-blue-800 text-sm shrink-0">
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
