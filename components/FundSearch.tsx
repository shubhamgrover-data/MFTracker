
import React, { useState, useEffect } from 'react';
import { Search, PieChart, ArrowRight, Loader2, Building2, Plus, Check, RefreshCw } from 'lucide-react';
import { searchFundsFromMasterList, reloadFundMasterList } from '../services/dataService';
import { addTrackedItem, isTracked } from '../services/trackingStorage';
import { FundSearchResult } from '../types';

interface FundSearchProps {
  onSelectFund: (fund: FundSearchResult) => void;
}

const POPULAR_SEARCH_TERMS = [
  "SBI Large Cap",
  "HDFC Mid Cap",
  "Parag Parikh Flexi",
  "Nippon India Small",
  "Axis Small Cap",
  "Quant Small Cap"
];

const FundSearch: React.FC<FundSearchProps> = ({ onSelectFund }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<FundSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setIsLoading(true);
        setShowDropdown(true);
        try {
          const results = await searchFundsFromMasterList(query);
          setSuggestions(results);
        } catch (error) {
          console.error("Fund Search failed", error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setShowDropdown(false);
        setSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handlePopularClick = (term: string) => {
    setQuery(term);
  };

  const handleTrack = (e: React.MouseEvent, fund: FundSearchResult) => {
    e.stopPropagation();
    // Use PK if available, otherwise name as ID
    const id = fund.pk ? String(fund.pk) : fund.name;
    addTrackedItem({ 
      id, 
      name: fund.name, 
      type: 'MF',
      url: fund.url 
    });
    setTick(tick + 1);
  };

  const handleRefreshDb = async () => {
      setIsLoading(true);
      try {
          await reloadFundMasterList();
          // Retry search
          if (query.trim().length >= 2) {
              const results = await searchFundsFromMasterList(query);
              setSuggestions(results);
          }
      } catch (e) {
          console.error("Failed to refresh fund DB", e);
      } finally {
          setIsLoading(false);
      }
  };

  const TrackButton = ({ fund }: { fund: FundSearchResult }) => {
    const id = fund.pk ? String(fund.pk) : fund.name;
    const tracked = isTracked(id, 'MF');
    return (
      <button
        onClick={(e) => handleTrack(e, fund)}
        className={`p-2 rounded-lg transition-all ${
           tracked 
           ? 'bg-green-50 text-green-600 cursor-default' 
           : 'bg-gray-100 text-gray-400 hover:bg-indigo-600 hover:text-white'
        }`}
        title={tracked ? "Added to Watchlist" : "Add to Watchlist"}
        disabled={tracked}
      >
        {tracked ? <Check size={16} /> : <Plus size={16} />}
      </button>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative">
      <div className="text-center space-y-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900">Track Mutual Fund Portfolios</h1>
        <p className="text-gray-500 max-w-lg mx-auto">
          Search for any Indian Mutual Fund to analyze their latest monthly holdings, buying trends, and sector allocation.
        </p>
      </div>

      <div className="relative max-w-2xl mx-auto z-20">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        <input 
          type="text" 
          className="block w-full p-4 pl-12 text-sm text-gray-900 border border-gray-200 rounded-2xl bg-white shadow-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none focus:ring-2 transition-shadow" 
          placeholder="Search Mutual Funds (e.g., SBI Bluechip)..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (suggestions.length > 0 || isLoading) setShowDropdown(true);
          }}
          autoFocus
        />

        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 flex items-center justify-center text-gray-500 gap-2 text-sm">
                <Loader2 className="animate-spin text-indigo-600" size={18} />
                Searching funds database...
              </div>
            ) : suggestions.length > 0 ? (
              <div className="divide-y divide-gray-50">
                {suggestions.map((fund, idx) => (
                  <div
                    key={`${fund.name}-${idx}`}
                    onClick={() => onSelectFund(fund)}
                    className="w-full flex items-center justify-between p-3 hover:bg-indigo-50 transition-colors text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <PieChart size={16} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 text-sm line-clamp-1">{fund.name}</div>
                        <div className="text-xs text-gray-500">{fund.type || "Mutual Fund"}</div> 
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <TrackButton fund={fund} />
                      <div className="p-2 text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ArrowRight size={16} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-gray-400 text-sm flex flex-col items-center gap-2">
                <p>No funds found matching "{query}"</p>
                <button 
                    onClick={handleRefreshDb}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-xs text-gray-700 transition-colors"
                >
                    <RefreshCw size={12} /> Refresh Database
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden z-10">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="font-semibold text-gray-700 flex items-center gap-2">
            <Building2 size={16} className="text-indigo-500"/>
            Popular Searches
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 gap-px bg-gray-100">
          {POPULAR_SEARCH_TERMS.map((term) => (
            <button 
              key={term}
              onClick={() => handlePopularClick(term)}
              className="bg-white p-4 hover:bg-gray-50 transition-colors text-left flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                  {term.substring(0, 1)}
                </div>
                <div className="font-medium text-gray-900 text-sm">{term}</div>
              </div>
              <div className="text-xs text-indigo-500 opacity-0 group-hover:opacity-100">Search</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FundSearch;
