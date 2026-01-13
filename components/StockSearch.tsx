import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';
import { searchStocksFromMasterList } from '../services/dataService';

interface StockSearchProps {
  onSelectStock: (symbol: string, name: string) => void;
}

// Pre-defined list of popular Indian Stocks for "Real" feel search
const POPULAR_STOCKS = [
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd' },
  { symbol: 'TCS', name: 'Tata Consultancy Services' },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd' },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd' },
  { symbol: 'INFY', name: 'Infosys Ltd' },
  { symbol: 'SBIN', name: 'State Bank of India' },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd' },
  { symbol: 'ITC', name: 'ITC Ltd' },
  { symbol: 'LICI', name: 'LIC India' },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd' },
  { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd' },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd' },
  { symbol: 'HCLTECH', name: 'HCL Technologies' },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd' },
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd' },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India' },
  { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical' },
  { symbol: 'TITAN', name: 'Titan Company Ltd' },
  { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd' },
  { symbol: 'ULTRACEMCO', name: 'UltraTech Cement' },
  { symbol: 'WIPRO', name: 'Wipro Ltd' },
  { symbol: 'ADANIENT', name: 'Adani Enterprises Ltd' },
  { symbol: 'ONGC', name: 'Oil & Natural Gas Corp' },
  { symbol: 'NTPC', name: 'NTPC Ltd' },
  { symbol: 'POWERGRID', name: 'Power Grid Corp' },
  { symbol: 'TATASTEEL', name: 'Tata Steel Ltd' },
  { symbol: 'JSWSTEEL', name: 'JSW Steel Ltd' },
  { symbol: 'COALINDIA', name: 'Coal India Ltd' },
  { symbol: 'ADANIPORTS', name: 'Adani Ports' },
  { symbol: 'M&M', name: 'Mahindra & Mahindra' },
];

const StockSearch: React.FC<StockSearchProps> = ({ onSelectStock }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Array<{ symbol: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timeoutId = setTimeout(async () => {
      if (query.trim().length >= 2) {
        setIsLoading(true);
        setShowDropdown(true);
        try {
          const results = await searchStocksFromMasterList(query);
          setSuggestions(results);
        } catch (error) {
          console.error("Search failed", error);
          setSuggestions([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setShowDropdown(false);
        setSuggestions([]);
      }
    }, 300); // 300ms delay for local filtering is usually enough

    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in relative">
       <div className="text-center space-y-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900">Search Indian Markets</h1>
          <p className="text-gray-500 max-w-lg mx-auto">
            Analyze any stock to see live prices powered by Gemini and check which mutual funds are holding it in their portfolios.
          </p>
       </div>

       {/* Search Input Container */}
       <div className="relative max-w-2xl mx-auto z-20">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Search className="w-5 h-5 text-gray-400" />
          </div>
          <input 
            type="text" 
            className="block w-full p-4 pl-12 text-sm text-gray-900 border border-gray-200 rounded-2xl bg-white shadow-sm focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none focus:ring-2 transition-shadow" 
            placeholder="Search by Symbol (e.g., RELIANCE) or Company Name..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (suggestions.length > 0 || query.length >= 2) setShowDropdown(true);
            }}
            autoFocus
          />

          {/* Search Dropdown */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in max-h-80 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 flex items-center justify-center text-gray-500 gap-2 text-sm">
                  <Loader2 className="animate-spin text-indigo-600" size={18} />
                  Searching...
                </div>
              ) : suggestions.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {suggestions.map((stock, idx) => (
                    <button
                      key={`${stock.symbol}-${idx}`}
                      onClick={() => onSelectStock(stock.symbol, stock.name)}
                      className="w-full flex items-center justify-between p-3 hover:bg-indigo-50 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                            {stock.symbol.substring(0, 1)}
                         </div>
                         <div>
                            <div className="font-medium text-gray-900 text-sm">{stock.name}</div>
                            <div className="text-xs text-gray-500 font-mono">{stock.symbol}</div>
                         </div>
                      </div>
                      <ArrowRight className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity" size={16} />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-400 text-sm">
                  No matches found for "{query}"
                </div>
              )}
            </div>
          )}
       </div>

       {/* Popular Stocks Grid (Static) */}
       <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden z-10">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
               <TrendingUp size={16} className="text-indigo-500"/>
               Popular Stocks
            </h3>
            <span className="text-xs text-gray-500">Most tracked</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 gap-px bg-gray-100">
            {POPULAR_STOCKS.map((stock) => (
              <button 
                key={stock.symbol}
                onClick={() => onSelectStock(stock.symbol, stock.name)}
                className="bg-white p-4 hover:bg-gray-50 transition-colors text-left flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                   <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 font-bold text-xs group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                      {stock.symbol.substring(0, 1)}
                   </div>
                   <div>
                      <div className="font-medium text-gray-900 text-sm">{stock.name}</div>
                      <div className="text-xs text-gray-500 font-mono">{stock.symbol}</div>
                   </div>
                </div>
              </button>
            ))}
          </div>
       </div>
    </div>
  );
};

export default StockSearch;