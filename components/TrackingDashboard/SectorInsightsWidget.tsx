
import React, { useState, useEffect } from 'react';
import { Lightbulb, Loader2, X, TrendingUp, TrendingDown, ExternalLink, RefreshCw, Search, CheckSquare, Square, Plus, Check } from 'lucide-react';
import { fetchSectorInsights } from '../../services/dataService';
import { SectorInsightItem } from '../../types/trackingTypes';
import { getTrackedItems, addTrackedItem, removeTrackedItem } from '../../services/trackingStorage';

interface SectorInsightsWidgetProps {
  sectorName: string;
  sectorUrl: string;
  onAddToMover: (symbol: string) => void;
  onNavigateStock?: (symbol: string, name: string) => void;
  addedSymbols?: string[];
}

const SectorInsightsWidget: React.FC<SectorInsightsWidgetProps> = ({ 
    sectorName, 
    sectorUrl,
    onAddToMover,
    onNavigateStock,
    addedSymbols = []
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<SectorInsightItem[]>([]);
  const [hasFetched, setHasFetched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [trackedSet, setTrackedSet] = useState<Set<string>>(new Set());
  const [showAllStocks, setShowAllStocks] = useState(false);

  // Load tracked items and listen for updates
  useEffect(() => {
      const updateTracked = () => {
          const items = getTrackedItems().filter(i => i.type === 'STOCK');
          setTrackedSet(new Set(items.map(i => i.id)));
      };
      updateTracked();
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
          // Ensure URL is absolute for fetching
          const fetchUrl = sectorUrl.startsWith('http') ? sectorUrl : `https://trendlyne.com${sectorUrl}`;
          const insights = await fetchSectorInsights(fetchUrl);
          setData(insights);
          setHasFetched(true);
      } catch (error) {
          console.error("Failed to fetch sector insights", error);
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

  const handleTrackToggle = (e: React.MouseEvent, symbol: string, name: string) => {
      e.stopPropagation();
      if (trackedSet.has(symbol)) {
          removeTrackedItem(symbol, 'STOCK');
      } else {
          addTrackedItem({ id: symbol, name, symbol, type: 'STOCK' });
      }
  };

  const handleAddToMoverClick = (e: React.MouseEvent, symbol: string) => {
      e.stopPropagation();
      onAddToMover(symbol);
  };

  const handleNavigate = (e: React.MouseEvent, symbol: string, name: string) => {
      e.stopPropagation();
      if (onNavigateStock) {
          onNavigateStock(symbol, name);
          setIsOpen(false);
      }
  };

  // Filter Logic: Initially show only tracked items. Search overrides this to show all matching.
  const filteredData = data.filter(item => {
      if (searchQuery.trim()) {
          return item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                 item.tooltip_stock_name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      if (showAllStocks) return true;
      return trackedSet.has(item.name);
  });

  // Count tracked stocks in this sector (for badge)
  const trackedCount = data.filter(item => trackedSet.has(item.name)).length;

  return (
    <>
        <button 
            onClick={handleToggle}
            className={`p-1.5 rounded-full transition-all shadow-sm flex items-center gap-1 ${
                hasFetched 
                ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
            title={`View Stocks in ${sectorName}`}
        >
            <Lightbulb size={12} className={hasFetched ? "fill-indigo-700" : ""} />
            {hasFetched && trackedCount > 0 && (
                <span className="text-[9px] font-bold">{trackedCount}</span>
            )}
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
                                <h2 className="text-lg font-bold text-gray-900 leading-tight">{sectorName}</h2>
                                <p className="text-xs text-gray-500">Sector Analysis & Constituents</p>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                             <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer mr-2 select-none hover:text-indigo-600 font-medium bg-white px-2 py-1.5 rounded-lg border border-gray-200 hover:border-indigo-200 transition-all">
                                <input 
                                    type="checkbox" 
                                    checked={showAllStocks} 
                                    onChange={(e) => setShowAllStocks(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                />
                                Show Stocks
                             </label>

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
                                placeholder={`Search stocks in ${sectorName}...`}
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
                                <span className="text-sm font-medium">Fetching Sector Constituents...</span>
                            </div>
                        ) : filteredData.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2 text-center">
                                <Search size={32} className="opacity-20" />
                                {searchQuery ? (
                                    <p className="text-sm">No stocks found matching "{searchQuery}"</p>
                                ) : (
                                    <>
                                        <p className="text-sm font-medium text-gray-600">No tracked stocks in this sector.</p>
                                        <p className="text-xs text-gray-400">Check "Show Stocks" above to see all or search for a stock.</p>
                                    </>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {filteredData.map((item) => {
                                    const isTracked = trackedSet.has(item.name);
                                    const isAdded = addedSymbols.includes(item.name);
                                    const isPositive = item.value >= 0;

                                    return (
                                        <div 
                                            key={item.id}
                                            className={`group p-3 rounded-xl border transition-all flex gap-3 items-start ${
                                                isTracked 
                                                ? 'bg-indigo-50/40 border-indigo-200 shadow-sm' 
                                                : 'bg-white border-gray-200 hover:border-indigo-200 hover:shadow-sm'
                                            }`}
                                        >
                                            {/* Checkbox for Tracking */}
                                            <button 
                                                onClick={(e) => handleTrackToggle(e, item.name, item.tooltip_stock_name)}
                                                className={`mt-0.5 shrink-0 transition-colors ${isTracked ? 'text-indigo-600' : 'text-gray-300 hover:text-gray-500'}`}
                                                title={isTracked ? "Remove from Watchlist" : "Add to Watchlist"}
                                            >
                                                {isTracked ? <CheckSquare size={18} /> : <Square size={18} />}
                                            </button>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between mb-1">
                                                    <button 
                                                        onClick={(e) => handleNavigate(e, item.name, item.tooltip_stock_name)}
                                                        className="font-bold text-sm text-gray-900 hover:text-indigo-600 hover:underline flex items-center gap-1.5 transition-colors truncate"
                                                        title={item.tooltip_stock_name}
                                                    >
                                                        {item.name}
                                                    </button>
                                                    
                                                    {/* Change % */}
                                                    <span className={`text-xs font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                                                        {item.disp_value}
                                                    </span>
                                                </div>
                                                
                                                <div className="flex items-center justify-between mt-2">
                                                    <div className="flex items-center gap-2">
                                                        <a 
                                                            href={item.cell_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-gray-400 hover:text-indigo-600 transition-colors"
                                                            title="View on Trendlyne"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <ExternalLink size={12} />
                                                        </a>
                                                    </div>

                                                    {isAdded ? (
                                                        <span className="text-green-600 text-[10px] font-medium flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded border border-green-100">
                                                            <Check size={10} /> Added
                                                        </span>
                                                    ) : (
                                                        <button 
                                                            onClick={(e) => handleAddToMoverClick(e, item.name)}
                                                            className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded text-[10px] flex items-center gap-1 border border-indigo-100 transition-colors"
                                                            title="Add to Portfolio Updates"
                                                        >
                                                            <Plus size={12} /> Add
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    
                    {/* Footer */}
                    <div className="p-3 bg-gray-50 border-t border-gray-200 text-center text-xs text-gray-400">
                        {filteredData.length} visible stocks in {sectorName}
                    </div>
                </div>
            </div>
        )}
    </>
  );
};

export default SectorInsightsWidget;
