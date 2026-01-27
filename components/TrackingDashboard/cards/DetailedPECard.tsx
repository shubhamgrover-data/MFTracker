
import React from 'react';
import { TrendingUp, TrendingDown, Minus, Building2, Wallet } from 'lucide-react';

interface MetricItem {
  shorttext: string;
  longtext: string;
  title: string;
  value: number;
  color: string; // "positive" | "negative" | "neutral"
  unit: string;
  param_name: string;
}

interface DetailedPECardProps {
  data: MetricItem[] | null;
}

const DetailedPECard: React.FC<DetailedPECardProps> = ({ data }) => {
  if (!data || !Array.isArray(data)) {
    return (
      <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
        No Detailed Data
      </div>
    );
  }

  const findMetric = (param: string) => data.find(item => item.param_name === param);

  const mcap = findMetric('MCAP_Q');
  const pe = findMetric('PE_TTM');
  const peg = findMetric('PEG_TTM');
  const pb = findMetric('PBV_A');
  const instHold = findMetric('INSTIHOLD');

  const getColorClass = (color: string) => {
    switch (color) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200';
      case 'negative': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    }
  };
  
  const getTextClass = (color: string) => {
      switch (color) {
        case 'positive': return 'text-green-600';
        case 'negative': return 'text-red-600';
        default: return 'text-yellow-600';
      }
  };

  const getIcon = (color: string) => {
      switch (color) {
        case 'positive': return <TrendingUp size={12} />;
        case 'negative': return <TrendingDown size={12} />;
        default: return <Minus size={12} />;
      }
  };

  const formatCurrency = (val: number) => {
      if(val >= 1000) return (val/1000).toLocaleString('en-IN', { maximumFractionDigits: 2 }) + 'T';
      return val.toLocaleString('en-IN');
  };

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Top: Market Cap */}
      {mcap && (
        <div className="flex flex-col gap-1 p-2 rounded-lg bg-gray-50 border border-gray-100">
           <div className="flex justify-between items-start">
               <div className="flex flex-col">
                   <span className="text-[10px] uppercase font-semibold text-gray-500">Market Cap</span>
                   <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-gray-900">
                            {formatCurrency(mcap.value)}
                        </span>
                        <span className="text-xs text-gray-500">{mcap.unit}</span>
                   </div>
               </div>
               <div className="p-1.5 bg-white rounded-md shadow-sm text-indigo-500">
                   <Wallet size={16} />
               </div>
           </div>
           {mcap.shorttext && (
               <div className={`text-[10px] font-medium px-1.5 py-0.5 rounded w-fit flex items-center gap-1 ${getColorClass(mcap.color)}`}>
                   {getIcon(mcap.color)}
                   {mcap.shorttext}
               </div>
           )}
        </div>
      )}

      {/* Middle: Valuation Ratios Grid */}
      <div className="grid grid-cols-3 gap-2 flex-1">
         {[pe, peg, pb].map((item, idx) => {
             if(!item) return null;
             return (
                 <div key={idx} className="flex flex-col justify-between p-2 rounded border border-gray-100 bg-white">
                     <span className="text-[9px] text-gray-400 font-semibold truncate" title={item.title}>{item.title.replace(' TTM','').replace(' to','/')}</span>
                     <div>
                        <div className="text-sm font-bold text-gray-800">{item.value}</div>
                        <div className={`text-[9px] truncate ${getTextClass(item.color)}`} title={item.shorttext}>
                            {item.shorttext}
                        </div>
                     </div>
                 </div>
             )
         })}
      </div>

      {/* Bottom: Institutional Holdings */}
      {instHold && (
        <div className="pt-2 border-t border-gray-100">
             <div className="flex justify-between items-end mb-1">
                 <div className="flex items-center gap-1.5 text-gray-600">
                    <Building2 size={12} />
                    <span className="text-[10px] font-semibold uppercase">Inst. Holding</span>
                 </div>
                 <span className="text-xs font-bold text-gray-800">{instHold.value}%</span>
             </div>
             <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                 <div 
                    className={`h-full rounded-full ${instHold.color === 'positive' ? 'bg-indigo-500' : instHold.color === 'negative' ? 'bg-orange-400' : 'bg-gray-400'}`} 
                    style={{ width: `${Math.min(instHold.value, 100)}%` }}
                 ></div>
             </div>
             <div className="mt-1 text-right">
                <span className={`text-[9px] ${getTextClass(instHold.color)}`}>
                    {instHold.shorttext}
                </span>
             </div>
        </div>
      )}
    </div>
  );
};

export default DetailedPECard;
