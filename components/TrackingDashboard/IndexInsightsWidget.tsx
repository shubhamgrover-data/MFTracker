
import React, { useState, useEffect } from 'react';
import { Lightbulb, Loader2, X, TrendingUp, TrendingDown, Minus, ExternalLink, RefreshCw, Search, CheckSquare, Square, Plus, Check } from 'lucide-react';
import { fetchIndexInsights } from '../../services/dataService';
import { IndexInsightCategory } from '../../types/trackingTypes';
import { getTrackedItems, addTrackedItem, removeTrackedItem } from '../../services/trackingStorage';

interface IndexInsightsWidgetProps {
  indexName: string;
  onAddToMover: (symbol: string) => void;
  onNavigateStock?: (symbol: string, name: string) => void;
  addedSymbols?: string[];
}

const IndexInsightsWidget: React.FC<IndexInsightsWidgetProps> = ({ 
    indexName, 
    onAddToMover,
    onNavigateStock,
    addedSymbols = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<IndexInsightCategory[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [trackedSet, setTrackedSet] = useState<Set<string>>(new Set());

  // Load tracked items and listen for updates
  useEffect(() => {
      const updateTracked = () => {
          const items = getTrackedItems().filter(i => i.type === 'STOCK');
          setTrackedSet(new Set(items.map(i => i.id)));
      };
      
      updateTracked();
      
      // Listen for global tracking updates
      window.addEventListener('fundflow_tracking_update', updateTracked);
      return () => window.removeEventListener('fundflow_tracking_update', updateTracked);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const loadData = async () => {
      setIsLoading(true);
      try {
          const insights = await fetchIndexInsights(indexName);
          // Store all insights to allow searching
          setData(insights);
          setHasFetched(true);
      } catch (error) {
          console.error("Failed to fetch insights", error);
      } finally {
          setIsLoading(false);
      }
  };

  const handleToggle = async (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsOpen(true);
      if (!hasFetched) {
          await loadData();
      }
  };

  const handleRefresh = async () => {
      await loadData();
  };

  const handleTrackToggle = (e: React.MouseEvent, symbol: string) => {
      e.stopPropagation();
      if (trackedSet.has(symbol)) {
          removeTrackedItem(symbol, 'STOCK');
      } else {
          addTrackedItem({ id: symbol, name: symbol, symbol, type: 'STOCK' });
      }
  };

  const handleAddToMoverClick = (e: React.MouseEvent, symbol: string) => {
      e.stopPropagation();
      onAddToMover(symbol);
      // Keep dialog open as per request
  };

  const handleNavigate = (e: React.MouseEvent, symbol: string) => {
      e.stopPropagation();
      if (onNavigateStock) {
          onNavigateStock(symbol, symbol);
          setIsOpen(false);
      }
  };

  // Filter data based on search query OR tracking status
  const filteredData = data.map(category => ({
      ...category,
      items: category.items.filter(item => {
          // If searching, search EVERYTHING
          if (searchQuery.trim()) {
              return item.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                     item.insightText.toLowerCase().includes(searchQuery.toLowerCase());
          }
          // If not searching, show ONLY tracked items
          return trackedSet.has(item.symbol);
      })
  })).filter(cat => cat.items.length > 0);

  const activeCategoriesCount = filteredData.length;

  const getIcon = (type: string) => {
      if (type === 'positive') return <TrendingUp size={16} className="text-green-600" />;
      if (type === 'negative') return <TrendingDown size={16} className="text-red-600" />;
      return <Minus size={16} className="text-gray-400" />;
  };

  return (
    <>
        <button 
            onClick={handleToggle}
            disabled={isLoading && !isOpen}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold transition-all shadow-sm ${
                isOpen 
                ? 'bg-indigo-600 text-white' 
                : hasFetched 
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200'
                    : 'bg-gray-50 text-gray-400 border border-gray-100 hover:bg-gray-100'
            }`}
            title={`View Insights for ${indexName}`}
        >
            {isLoading && !isOpen ? (
                <Loader2 size={10} className="animate-spin" />
            ) : (
                <Lightbulb size={10} className={hasFetched ? "fill-indigo-700" : ""} />
            )}
            
            {hasFetched && !isLoading ? activeCategoriesCount : ''}
        </button>

        {isOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in" onClick={() => setIsOpen(false)}>
                <div 
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-scale-in border border-gray-200"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
                                <Lightbulb size={20} />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 leading-tight">Index Insights</h2>
                                <p className="text-xs text-gray-500">{indexName}</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                             <button 
                                onClick={handleRefresh}
                                disabled={isLoading}
                                className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors border border-transparent hover:border-gray-200"
                                title="Refresh Data"
                            >
                                <RefreshCw size={18} className={isLoading ? "animate-spin" : ""} />
                            </button>
                            <button 
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text"
                                placeholder="Search symbol in this index..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto p-4 custom-scrollbar bg-gray-50/50 flex-1">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                                <Loader2 size={32} className="animate-spin text-indigo-500" />
                                <span className="text-sm font-medium">Analyzing Index Constituents...</span>
                            </div>
                        ) : filteredData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2 text-center">
                                <Search size={32} className="opacity-20" />
                                {searchQuery ? (
                                    <p className="text-sm">No insights found matching "{searchQuery}"</p>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium text-gray-600">No tracked stocks found in current insights.</p>
                                        <p className="text-xs text-gray-400">Search above to find and track specific index constituents.</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredData.map(category => (
                                    <div key={category.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm flex flex-col">
                                        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                            <h5 className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                                {category.title}
                                            </h5>
                                            <span className="text-[10px] font-medium bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                                                {category.items.length}
                                            </span>
                                        </div>
                                        <div className="divide-y divide-gray-50">
                                            {category.items.map((item, idx) => {
                                                const isTracked = trackedSet.has(item.symbol);
                                                const isAdded = addedSymbols.includes(item.symbol);

                                                return (
                                                    <div 
                                                        key={`${category.id}-${idx}`}
                                                        className={`group p-3 transition-colors flex gap-3 items-start ${isTracked ? 'bg-indigo-50/30 hover:bg-indigo-50' : 'hover:bg-gray-50'}`}
                                                    >
                                                        {/* Checkbox for Tracking */}
                                                        <button 
                                                            onClick={(e) => handleTrackToggle(e, item.symbol)}
                                                            className={`mt-0.5 shrink-0 transition-colors ${isTracked ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-500'}`}
                                                            title={isTracked ? "Remove from Watchlist" : "Add to Watchlist"}
                                                        >
                                                            {isTracked ? <CheckSquare size={18} /> : <Square size={18} />}
                                                        </button>

                                                        {/* Category Icon */}
                                                        <div className="mt-0.5 p-1.5 bg-gray-50 rounded-lg border border-gray-100 shrink-0">
                                                            {getIcon(item.type)}
                                                        </div>

                                                        {/* Content Area */}
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between mb-1">
                                                                <button 
                                                                    onClick={(e) => handleNavigate(e, item.symbol)}
                                                                    className={`font-bold text-sm ${isTracked ? 'text-indigo-700' : 'text-gray-800'} hover:text-indigo-600 hover:underline flex items-center gap-1.5 transition-colors`}
                                                                >
                                                                    {item.symbol}
                                                                    <ExternalLink size={10} className="text-gray-400" />
                                                                </button>
                                                                
                                                                {isAdded ? (
                                                                    <span className="text-green-600 text-[10px] font-medium flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                                                        <Check size={10} /> Added
                                                                    </span>
                                                                ) : (
                                                                    <button 
                                                                        onClick={(e) => handleAddToMoverClick(e, item.symbol)}
                                                                        className="opacity-0 group-hover:opacity-100 transition-opacity text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded text-[10px] flex items-center gap-1 border border-indigo-100"
                                                                        title="Add to Portfolio Movers"
                                                                    >
                                                                        <Plus size={12} /> Add
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-gray-600 leading-relaxed whitespace-normal break-words">
                                                                {item.insightText}
                                                            </p>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Footer */}
                    <div className="p-3 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-400">
                        Showing {filteredData.reduce((acc, cat) => acc + cat.items.length, 0)} {searchQuery ? 'results' : 'tracked records'} across {filteredData.length} categories
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default IndexInsightsWidget;
