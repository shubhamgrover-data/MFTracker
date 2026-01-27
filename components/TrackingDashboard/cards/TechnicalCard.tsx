
import React from 'react';
import { ArrowUp, ArrowDown, Minus, BarChart2, Activity, TrendingUp } from 'lucide-react';

interface TechnicalCardProps {
  data: any;
}

const TechnicalCard: React.FC<TechnicalCardProps> = ({ data }) => {
  // Safe access to nested data structure
  const params = data?.body?.parameters || data?.parameters || {};
  
  if (Object.keys(params).length === 0) {
      return (
        <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
          No Technical Data
        </div>
      );
  }

  // 1. Current Price & Insights
  const currentPrice = params.current_price;
  const insights = params.price_insight || [];
  
  let high52 = insights.find((i: any) => i.param === "year_high");
  let low52 = insights.find((i: any) => i.param === "year_low");

  // Fallback: If 52W High/Low not found in insights, try to get from price_analysis (1 Year)
  if (!high52 || !low52) {
      const priceAnalysis = params.price_analysis || [];
      const oneYearData = priceAnalysis.find((i: any) => i.name === "1 Year");
      
      if (oneYearData) {
          if (!high52 && oneYearData.high) {
              high52 = { title: "52 week high", value: oneYearData.high.toLocaleString() };
          }
          if (!low52 && oneYearData.low) {
              low52 = { title: "52 week low", value: oneYearData.low.toLocaleString() };
          }
      }
  }

  // 2. SMA & EMA Parameters (Filtering for 50D and 200D)
  const smas = params.sma_parameters || [];
  const emas = params.ema_parameters || [];

  const getMa = (list: any[], period: string) => list.find((s: any) => s.name === period);
  
  const maData = {
      sma50: getMa(smas, "50 Day"),
      sma200: getMa(smas, "200 Day"),
      ema50: getMa(emas, "50 Day"),
      ema200: getMa(emas, "200 Day")
  };

  // 3. Price Analysis (Returns)
  const returns = params.price_analysis || [];
  // Sorting order mapping
  const orderMap: Record<string, number> = { "1 Day": 1, "1 Week": 2, "1 Month": 3, "3 Months": 4, "6 Months": 5, "1 Year": 6, "2 Year": 7, "3 Year": 8, "5 Year": 9 };
  
  const targetReturns = ["1 Day", "6 Months", "1 Year", "2 Year", "5 Year"];
  const displayReturns = returns
    .filter((r: any) => targetReturns.includes(r.name))
    .sort((a: any, b: any) => (orderMap[a.name] || 99) - (orderMap[b.name] || 99));

  // 4. Volume (Day)
  const volumeTable = params.volume_analysis?.tableData || [];
  const dayVolumeRow = volumeTable.find((row: any[]) => row[0] === "Day");
  const dayTotalVol = dayVolumeRow ? dayVolumeRow[1] : 0;
  const dayDeliveryVol = dayVolumeRow ? dayVolumeRow[3] : 0;
  const deliveryPct = dayVolumeRow ? dayVolumeRow[2] : 0;

  const getColorClass = (color: string) => {
      if (color === 'positive') return 'text-green-600 bg-green-50 border-green-200';
      if (color === 'negative') return 'text-red-600 bg-red-50 border-red-200';
      return 'text-gray-600 bg-gray-50 border-gray-200';
  };
  
  const getTrendIcon = (color: string) => {
      if (color === 'positive') return <ArrowUp size={10} />;
      if (color === 'negative') return <ArrowDown size={10} />;
      return <Minus size={10} />;
  };

  const formatNum = (num: number) => {
      if(!num) return '-';
      if (num >= 10000000) return (num / 10000000).toFixed(2) + 'Cr';
      if (num >= 100000) return (num / 100000).toFixed(2) + 'L';
      return num.toLocaleString();
  };

  const getInsightTooltip = (item: any) => {
      if (!item) return "";
      return `${item.shorttext || ''}\n${item.longtext || ''}`.trim();
  };

  const getReturnTooltip = (r: any) => {
      return `Period: ${r.name}\nRange: ${r.low} - ${r.high}\nStart Price: ${r.startPrice}\nAbs Change: ${r.change}`;
  };

  return (
    <div className="flex flex-col h-full gap-3 overflow-y-auto custom-scrollbar p-1">
      
      {/* Price Insights Section - Compact 3-Column Grid */}
      <div className="grid grid-cols-3 gap-2">
          {/* Current Price */}
          <div className="flex flex-col p-2 rounded bg-indigo-50 border border-indigo-100 relative overflow-hidden">
             <span className="text-[9px] text-indigo-500 uppercase font-bold truncate">Price</span>
             <span className="text-sm font-bold text-indigo-900">₹{currentPrice?.toLocaleString() || '-'}</span>
          </div>

          {/* 52W Low/High */}
          {[low52, high52].map((item: any, i: number) => (
             item ? (
                 <div 
                    key={i} 
                    className="flex flex-col p-2 rounded bg-gray-50 border border-gray-100 relative overflow-hidden cursor-help group"
                    title={getInsightTooltip(item)}
                 >
                    <span className="text-[9px] text-gray-500 uppercase font-medium truncate">{item.title.replace('52 week', '52W')}</span>
                    <span className="text-sm font-bold text-gray-800">{item.value}</span>
                    {/* Visual indicator bar at bottom */}
                    <div className={`absolute bottom-0 left-0 h-0.5 w-full ${i === 0 ? 'bg-red-300' : 'bg-green-300'}`}></div>
                 </div>
             ) : (
                 <div key={i} className="p-2 rounded bg-gray-50 border border-gray-100 text-[10px] text-gray-400">N/A</div>
             )
         ))}
      </div>

      {/* Moving Averages Section (50D & 200D) */}
      {(maData.sma50 || maData.sma200) && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
                <Activity size={12} className="text-indigo-500" />
                <span className="text-[10px] font-bold text-gray-700 uppercase">Moving Averages</span>
            </div>
            
            <div className="grid grid-cols-3 gap-1 text-center bg-gray-50 rounded border border-gray-100 p-1">
                {/* Headers */}
                <div className="text-[9px] font-bold text-gray-400 py-1">Type</div>
                <div className="text-[9px] font-bold text-gray-400 py-1">50 DMA</div>
                <div className="text-[9px] font-bold text-gray-400 py-1">200 DMA</div>

                {/* SMA Row */}
                <div className="text-[10px] font-bold text-gray-600 py-1 bg-white rounded-l border-y border-l border-gray-100">SMA</div>
                <div className={`py-1 bg-white border-y border-gray-100 font-medium text-xs ${maData.sma50?.color === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.round(maData.sma50?.value || 0).toLocaleString()}
                </div>
                <div className={`py-1 bg-white rounded-r border-y border-r border-gray-100 font-medium text-xs ${maData.sma200?.color === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.round(maData.sma200?.value || 0).toLocaleString()}
                </div>

                {/* EMA Row */}
                <div className="text-[10px] font-bold text-gray-600 py-1 bg-white rounded-l border-b border-l border-gray-100 mt-0.5">EMA</div>
                <div className={`py-1 bg-white border-b border-gray-100 font-medium text-xs mt-0.5 ${maData.ema50?.color === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.round(maData.ema50?.value || 0).toLocaleString()}
                </div>
                <div className={`py-1 bg-white rounded-r border-b border-r border-gray-100 font-medium text-xs mt-0.5 ${maData.ema200?.color === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.round(maData.ema200?.value || 0).toLocaleString()}
                </div>
            </div>
          </div>
      )}

      {/* Returns Section */}
      {displayReturns.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
                <BarChart2 size={12} className="text-indigo-500" />
                <span className="text-[10px] font-bold text-gray-700 uppercase">Returns</span>
            </div>
            <div className="grid grid-cols-5 gap-1">
                {displayReturns.map((ret: any, idx: number) => (
                    <div 
                        key={idx} 
                        className="flex flex-col items-center cursor-help group"
                        title={getReturnTooltip(ret)}
                    >
                         <div className={`w-full py-0.5 rounded-t flex justify-center transition-colors ${getColorClass(ret.color)}`}>
                            {getTrendIcon(ret.color)}
                         </div>
                         <div className="w-full bg-gray-50 border-x border-b border-gray-100 rounded-b text-center py-1 group-hover:bg-gray-100 transition-colors">
                            <div className={`text-[9px] font-bold ${ret.changePercentSafe > 0 ? 'text-green-600' : ret.changePercentSafe < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                                {Math.abs(ret.changePercentSafe || 0).toFixed(0)}%
                            </div>
                            <div className="text-[8px] text-gray-400 font-medium">{ret.name.replace(' Years','Y').replace(' Year','Y').replace(' Months','M').replace(' Day','D')}</div>
                         </div>
                    </div>
                ))}
            </div>
          </div>
      )}
      
      {/* Volume Section */}
      {dayVolumeRow && (
          <div className="mt-auto pt-2 border-t border-gray-100">
             <div className="flex justify-between items-center text-xs">
                 <span className="text-gray-500 font-medium">Day Volume</span>
                 <span className="font-bold text-gray-800">{formatNum(dayTotalVol)}</span>
             </div>
             <div className="flex justify-between items-center text-xs mt-1">
                 <span className="text-gray-500 font-medium">Delivery ({deliveryPct}%)</span>
                 <span className="font-bold text-indigo-600">{formatNum(dayDeliveryVol)}</span>
             </div>
             <div className="w-full bg-gray-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${Math.min(deliveryPct, 100)}%` }}></div>
             </div>
          </div>
      )}
    </div>
  );
};

export default TechnicalCard;
