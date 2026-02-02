
import React, { useState, useEffect } from 'react';
import { Settings, Info, Key, X, Save } from 'lucide-react';
import EntityList from './EntityList';
import IndexWatchlist from './IndexWatchlist';
import IgnoreList from './IgnoreList';
import { getTrackedItems, removeTrackedItem, TrackedItem, getIgnoredItems, removeIgnoredItem } from '../../services/trackingStorage';
import { FundSearchResult } from '../../types';
import { getGeminiApiKey, updateGeminiApiKey } from '../../services/geminiService';

interface ConfigurationViewProps {
  onSelectStock: (symbol: string, name: string) => void;
  onSelectFund: (fund: FundSearchResult) => void;
}

const ConfigurationView: React.FC<ConfigurationViewProps> = ({ onSelectStock, onSelectFund }) => {
  const [items, setItems] = useState<TrackedItem[]>([]);
  const [ignoredItems, setIgnoredItems] = useState<string[]>([]);
  
  // API Key Modal State
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKey, setApiKey] = useState('');

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

  const handleOpenSettings = () => {
      setApiKey(getGeminiApiKey());
      setShowApiKeyModal(true);
  };

  const handleSaveApiKey = () => {
      updateGeminiApiKey(apiKey);
      setShowApiKeyModal(false);
  };

  const stockItems = items.filter(i => i.type === 'STOCK');
  const mfItems = items.filter(i => i.type === 'MF');

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fade-in flex flex-col h-[calc(100vh-100px)] min-h-[800px]">
      <div className="flex items-center justify-between pb-4 border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Settings size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Configure Watchlist</h1>
              <p className="text-gray-500 text-sm">Manage the entities, indices, and ignored items in your dashboard.</p>
            </div>
        </div>
        <button
            onClick={handleOpenSettings}
            className="flex items-center gap-2 p-2 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200"
            title="Configure API Key"
        >
            <Key size={18} />
            <span className="text-sm font-medium hidden sm:inline">API Settings</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 flex-1 min-h-0">
        
        {/* Column 1: Tracked Stocks */}
        <div className="h-full min-h-0">
            <EntityList 
              title="Tracked Stocks" 
              items={stockItems} 
              type="STOCK" 
              onRemove={(id) => handleRemove(id, 'STOCK')}
              onItemClick={handleItemClick}
            />
        </div>
        
        {/* Column 2: Tracked Mutual Funds */}
        <div className="h-full min-h-0">
            <EntityList 
              title="Tracked Mutual Funds" 
              items={mfItems} 
              type="MF" 
              onRemove={(id) => handleRemove(id, 'MF')} 
              onItemClick={handleItemClick}
            />
        </div>

        {/* Column 3: Ignored Stocks */}
        <div className="h-full min-h-0">
            <IgnoreList 
                items={ignoredItems}
                onRemove={handleRemoveIgnored}
                onItemClick={handleIgnoreClick}
            />
        </div>

        {/* Column 4: Tracked Indices */}
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

      {/* API Key Modal */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setShowApiKeyModal(false)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                        <Key size={18} className="text-indigo-600" />
                        Configure Gemini API
                    </h3>
                    <button onClick={() => setShowApiKeyModal(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-200 transition-colors">
                        <X size={20} />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                            Enter your Google Gemini API Key below. This key is stored securely in your browser's local storage and is used to generate AI insights.
                        </p>
                        <p className="text-xs text-gray-400">
                            Leave empty to revert to the default demo key (Rate limited).
                        </p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wider">API Key</label>
                        <input 
                            type="password" 
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-mono transition-shadow"
                            placeholder="AIza..."
                            autoFocus
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button 
                            onClick={() => setShowApiKeyModal(false)}
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSaveApiKey}
                            className="px-4 py-2 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-all hover:shadow"
                        >
                            <Save size={16} /> Save Settings
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default ConfigurationView;
