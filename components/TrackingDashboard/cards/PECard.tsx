
import React from 'react';
import { Activity } from 'lucide-react';

interface Tile {
  title: string;
  label: string;
  value: string;
  message: string;
}

interface PECardProps {
  data: { tiles: Tile[] } | null;
}

const PECard: React.FC<PECardProps> = ({ data }) => {
  if (!data || !Array.isArray(data.tiles) || data.tiles.length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
          No PE Data Available
        </div>
      );
  }

  // Helper to find specific metrics loosely by label text
  const getTile = (labelPart: string) => data.tiles.find(t => t.label?.toLowerCase()===(labelPart.toLowerCase()));

  const currentPE = getTile("Current PE");
  const averagePE = getTile("Average PE");
  const daysBelow = getTile("% Days traded below current PE"); 
  const forwardPE = getTile("Forward PE");

  // Logic to clean the value string (remove newlines and extra text often found in scraped data)
  const cleanValue = (val: string | undefined) => {
      if (!val) return '-';
      // Remove text like "Strong Buy Zone" that might be appended to the value string in some parsers
      return val.replace(/\n/g, ' ').replace(/[a-zA-Z]/g, '').replace(/%/g, '').trim();
  };

  // Determine Valuation Zone Status
  const valuationMessage = daysBelow?.message || "";
  const valuationValue = daysBelow?.value || "";
  
  // Determine color based on explicit message or heuristic
  let zoneClass = "bg-gray-100 text-gray-600 border-gray-200";
  let statusText = valuationMessage || "Neutral";

  const lowerMsg = (valuationMessage + " " + valuationValue).toLowerCase();

  if (lowerMsg.includes("buy") || lowerMsg.includes("undervalued")) {
      zoneClass = "bg-green-50 text-green-700 border-green-200";
  } else if (lowerMsg.includes("sell") || lowerMsg.includes("expensive") || lowerMsg.includes("overvalued")) {
      zoneClass = "bg-red-50 text-red-700 border-red-200";
  } else if (lowerMsg.includes("neutral")) {
      zoneClass = "bg-yellow-50 text-yellow-700 border-yellow-200";
  }

  // Extract numeric percentage for display
  const daysBelowPercent = cleanValue(daysBelow?.value);

  return (
    <div className="h-full flex flex-col justify-between gap-3">
      {/* Top Status Banner */}
      {valuationMessage && (
         <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border text-center truncate ${zoneClass}`}>
            {valuationMessage}
         </div>
      )}

      {/* Main Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 flex-1 items-center">
        {/* Current PE */}
        <div className="flex flex-col p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100/50 relative overflow-hidden group">
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider z-10">Current PE</span>
            <span className="text-xl md:text-2xl font-bold text-gray-900 z-10 mt-0.5">
                {cleanValue(currentPE?.value)}
            </span>
            <div className="absolute right-[-10px] bottom-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
                <Activity size={48} className="text-indigo-600" />
            </div>
        </div>

        {/* Average PE */}
        <div className="flex flex-col p-2.5 bg-white rounded-lg border border-gray-100">
            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Average PE</span>
            <span className="text-lg font-semibold text-gray-700 mt-0.5">
                {cleanValue(averagePE?.value)}
            </span>
        </div>
      </div>

      {/* Footer Metrics */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-50 mt-1">
         <div className="flex flex-col">
            <span className="text-[10px] text-gray-400">Traded Below Current</span>
            <div className="flex items-center gap-1.5 mt-0.5">
               <div className="h-1.5 w-16 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${lowerMsg.includes("buy") ? 'bg-green-500' : 'bg-gray-400'}`} 
                    style={{ width: `${Math.min(Number(daysBelowPercent), 100)}%` }}
                  ></div>
               </div>
               <span className="text-xs font-medium text-gray-700">{daysBelowPercent}%</span>
            </div>
         </div>

         {forwardPE && (
             <div className="flex flex-col text-right">
                <span className="text-[10px] text-gray-400">Forward PE</span>
                <span className="text-xs font-medium text-gray-700">{cleanValue(forwardPE?.value)}</span>
             </div>
         )}
      </div>
    </div>
  );
};

export default PECard;
