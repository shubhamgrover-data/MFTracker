
import React, { useState, useEffect, useRef } from 'react';
import { Layers, Trash2, Search, Plus, Check, Loader2 } from 'lucide-react';
import { fetchMasterIndicesList } from '../../services/dataService';
import { getTrackedIndices, addTrackedIndex, removeTrackedIndex } from '../../services/trackingStorage';

interface IndexItem {
  name: string;
  category: string;
}

const IndexWatchlist: React.FC = () => {
  const [trackedIndices, setTrackedIndices] = useState<string[]>([]);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [masterList, setMasterList] = useState<IndexItem[]>([]);
  const [searchResults, setSearchResults] = useState<IndexItem[]>([]);
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Load tracked indices on mount
  useEffect(() => {
    refreshIndices();
    const handleUpdate = () => refreshIndices();
    window.addEventListener('fundflow_tracking_update', handleUpdate);
    return () => window.removeEventListener('fundflow_tracking_update', handleUpdate);
  }, []);

  const refreshIndices = () => {
    setTrackedIndices(getTrackedIndices());
  };

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Master List once when search is focused
  const handleSearchFocus = async () => {
    setShowDropdown(true);
    if (masterList.length === 0 && !loadingMaster) {
       setLoadingMaster(true);
       const indices = await fetchMasterIndicesList();
       setMasterList(indices);
       setLoadingMaster(false);
    }
  };

  // Filter Logic
  useEffect(() => {
    if (!searchQuery) {
        setSearchResults([]);
        return;
    }
    const lowerQ = searchQuery.toLowerCase();
    const filtered = masterList.filter(idx => 
        idx.name.toLowerCase().includes(lowerQ) ||
        idx.category.toLowerCase().includes(lowerQ) // Optional: Search by category too
    );
    setSearchResults(filtered);
  }, [searchQuery, masterList]);

  const handleToggleIndex = (e: React.MouseEvent, indexName: string) => {
      e.stopPropagation();
      if (trackedIndices.includes(indexName)) {
          // No-op for add only context usually, or implement remove
      } else {
          addTrackedIndex(indexName);
      }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-2">
         <div className="flex items-center gap-2">
            <Layers size={18} className="text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Tracked Indices</h3>
            <span className="bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {trackedIndices.length}
            </span>
         </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-gray-100 relative" ref={searchContainerRef}>
          <div className="relative">
             <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search size={14} className="text-gray-400" />
             </div>
             <input 
                type="text"
                className="w-full bg-gray-50 border border-gray-200 text-gray-800 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block pl-9 p-2"
                placeholder="Add Index (e.g. NIFTY MIDCAP)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={handleSearchFocus}
             />
             {loadingMaster && (
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <Loader2 size={14} className="animate-spin text-indigo-500" />
                </div>
             )}
          </div>

          {/* Dropdown */}
          {showDropdown && searchQuery.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 mx-3 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto z-50">
                  {searchResults.length > 0 ? (
                      searchResults.map(idx => {
                          const isAdded = trackedIndices.includes(idx.name);
                          return (
                              <div 
                                key={idx.name}
                                onClick={(e) => handleToggleIndex(e, idx.name)}
                                className={`px-4 py-2 text-sm cursor-pointer flex items-center justify-between hover:bg-gray-50 border-b border-gray-50 last:border-0 ${isAdded ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700'}`}
                              >
                                  <div className="flex flex-col">
                                      <span className="font-medium">{idx.name}</span>
                                      <span className="text-[10px] text-gray-400 uppercase tracking-wide">{idx.category}</span>
                                  </div>
                                  {isAdded ? <Check size={14} className="shrink-0" /> : <Plus size={14} className="text-gray-400 shrink-0"/>}
                              </div>
                          );
                      })
                  ) : (
                      <div className="p-3 text-xs text-gray-400 text-center">
                          {loadingMaster ? "Loading indices..." : "No matching indices found"}
                      </div>
                  )}
              </div>
          )}
      </div>

      {/* List */}
      <div className="overflow-y-auto flex-1 p-2 space-y-2 max-h-[500px]">
        {trackedIndices.length > 0 ? (
          trackedIndices.map((indexName) => (
            <div 
              key={indexName} 
              className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-indigo-300 hover:shadow-sm hover:bg-white transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold shrink-0">
                  {indexName.charAt(0)}
                </div>
                <div className="text-sm font-medium text-gray-900">
                   {indexName}
                </div>
              </div>

              <button
                 onClick={() => removeTrackedIndex(indexName)}
                 className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                 title="Remove Index"
               >
                 <Trash2 size={16} />
              </button>
            </div>
          ))
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-gray-400 text-sm gap-2">
             <div className="p-3 bg-gray-50 rounded-full">
               <Layers size={24} className="opacity-20"/>
             </div>
             <p>No indices tracked.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default IndexWatchlist;
