
import React from 'react';
import { Activity, Tag } from 'lucide-react';
import { getTrackedIndices } from '../../../services/trackingStorage';

interface Tile {
  title: string;
  label: string;
  value: string;
  message: string;
}

interface SecInfo {
    macro?: string;
    sector?: string;
    industryInfo?: string;
    indexList?: string[];
    basicIndustry?: string;
    pdSectorPe?: string;
    pdSectorInd?: string;
}

interface PECardProps {
  data: { 
      tiles: Tile[]; 
      secInfo?: SecInfo; 
  } | null;
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

  // Logic to clean the value string
  const cleanValue = (val: string | undefined) => {
      if (!val) return '-';
      return val.replace(/\n/g, ' ').replace(/[a-zA-Z]/g, '').replace(/%/g, '').trim();
  };

  // Determine Valuation Zone Status
  const valuationMessage = daysBelow?.message || "";
  const valuationValue = daysBelow?.value || "";
  
  let zoneClass = "bg-gray-100 text-gray-600 border-gray-200";
  const lowerMsg = (valuationMessage + " " + valuationValue).toLowerCase();

  if (lowerMsg.includes("buy") || lowerMsg.includes("undervalued")) {
      zoneClass = "bg-green-50 text-green-700 border-green-200";
  } else if (lowerMsg.includes("sell") || lowerMsg.includes("expensive") || lowerMsg.includes("overvalued")) {
      zoneClass = "bg-red-50 text-red-700 border-red-200";
  } else if (lowerMsg.includes("neutral")) {
      zoneClass = "bg-yellow-50 text-yellow-700 border-yellow-200";
  }

  const daysBelowPercent = cleanValue(daysBelow?.value);

  // --- NSE Data Logic ---
  const trackedIndices = getTrackedIndices().map(i => i.toLowerCase().trim());
  const indexList = data.secInfo?.indexList || [];
  
  // Filter indexList to only show those that are in trackedIndices (Case Insensitive)
  const relevantIndices = indexList.filter(idx => trackedIndices.includes(idx.toLowerCase().trim()));
  const { macro, sector, industryInfo, basicIndustry, pdSectorPe, pdSectorInd } = data.secInfo || {};

  const sectorIndex = pdSectorInd ? pdSectorInd.trim() : null;
  const hasSecInfo = relevantIndices.length > 0 || macro || sector || industryInfo || basicIndustry || sectorIndex;

  return (
    <div className="h-full flex flex-col justify-between gap-3 overflow-y-auto custom-scrollbar p-1">
      {/* NSE SecInfo Footer (Subtle) : Moved and positioned it here intentionally. Keep it here: Changed to basic industry*/}
      {hasSecInfo && (
          <div className="flex flex-col gap-2 pt-2 border-t border-gray-50 animate-fade-in">
              <div className="flex items-center justify-between gap-2">
                 {(macro || sector || industryInfo || basicIndustry) && (
                     <div className="flex items-center gap-1.5 text-[9px] text-gray-500 overflow-hidden">
                         <Tag size={10} className="shrink-0 text-gray-400" />
                         <span className="truncate" title={`${macro || ''} > ${sector || ''} > ${industryInfo || ''}`}>
                             {[macro, sector, basicIndustry].filter(Boolean).join(" • ")}
                         </span>
                     </div>
                 )}
                 {sectorIndex && (
                     <div className="text-[9px] font-medium text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded whitespace-nowrap shrink-0 border border-gray-200" title="Sector Index">
                         {sectorIndex}
                     </div>
                 )}
              </div>
          </div>
      )}

      {/* Top Status Banner */}
      {valuationMessage && (
         <div className={`px-3 py-1.5 rounded-lg text-xs font-bold border text-center truncate shrink-0 ${zoneClass}`}>
            {valuationMessage}
         </div>
      )}

      {/* Main Metrics Grid */}
      <div className={`grid ${pdSectorPe ? 'grid-cols-3' : 'grid-cols-2'} gap-2 shrink-0 items-center`}>
        {/* Current PE */}
        <div className="flex flex-col p-2 bg-indigo-50/50 rounded-lg border border-indigo-100/50 relative overflow-hidden group min-h-[50px] justify-center">
            <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider z-10 leading-none mb-1">Current PE</span>
            <span className="text-lg font-bold text-gray-900 z-10 leading-none">
                {cleanValue(currentPE?.value)}
            </span>
            <div className="absolute right-[-10px] bottom-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
                <Activity size={48} className="text-indigo-600" />
            </div>
        </div>

        {/* Average PE */}
        <div className="flex flex-col p-2 bg-white rounded-lg border border-gray-100 min-h-[50px] justify-center">
            <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider leading-none mb-1">Avg PE</span>
            <span className="text-base font-semibold text-gray-700 leading-none">
                {cleanValue(averagePE?.value)}
            </span>
        </div>

        {/* Sector PE */}
        {pdSectorPe && (
            <div className="flex flex-col p-2 bg-gray-50 rounded-lg border border-gray-100 min-h-[50px] justify-center">
                <span className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider leading-none mb-1">Sec PE</span>
                <span className="text-base font-semibold text-gray-700 leading-none">
                    {pdSectorPe}
                </span>
            </div>
        )}
      </div>

      <div className="flex flex-col gap-2 pt-2 border-t border-gray-50 animate-fade-in">
        {relevantIndices.length > 0 && (
            <div className="flex flex-wrap gap-1">
                {relevantIndices.map(idx => (
                    <span key={idx} className="text-[9px] font-medium px-1.5 py-0.5 bg-orange-50 text-orange-700 border border-orange-100 rounded">
                        {idx}
                    </span>
                ))}
            </div>
        )}
      </div>

      {/* Footer Metrics */}
      <div className="flex items-center justify-between pt-1 mt-auto">
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
