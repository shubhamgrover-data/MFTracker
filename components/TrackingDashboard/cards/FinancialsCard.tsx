import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Minus, Coins, Scale, ArrowRightLeft, PieChart } from 'lucide-react';

interface InsightItem {
  key: string;
  parameter: string;
  insight_text: string;
  insight_color: string;
}

interface FinancialDataSection {
  QUARTER?: InsightItem[];
  ANNUAL?: InsightItem[];
  BALANCE_SHEET?: InsightItem[];
  FINANCIAL_RATIOS?: InsightItem[];
  CASH_FLOW?: InsightItem[];
}

interface FinancialsCardProps {
  data: {
    STANDALONE?: FinancialDataSection;
    CONSOLIDATED?: FinancialDataSection;
  } | null;
}

const FinancialsCard: React.FC<FinancialsCardProps> = ({ data }) => {
  const [view, setView] = useState<'CONSOLIDATED' | 'STANDALONE'>('CONSOLIDATED');
  const [activeTab, setActiveTab] = useState<'PL' | 'BS' | 'CF' | 'RATIO'>('PL');

  if (!data) return <div className="text-xs text-gray-400 p-4">No Data</div>;

  const activeData = (view === 'CONSOLIDATED' && data.CONSOLIDATED) ? data.CONSOLIDATED : (data.STANDALONE || data.CONSOLIDATED);
  const currentView = (view === 'CONSOLIDATED' && !data.CONSOLIDATED && data.STANDALONE) ? 'STANDALONE' : view;

  if (!activeData) {
     return (
        <div className="h-full flex items-center justify-center text-xs text-gray-400 italic">
          No Financial Data Available
        </div>
     );
  }

  const parseInsight = (text: string) => {
      const valueMatch = text.match(/(Rs\s+[\d,]+(?:\.\d+)?\s+Cr|[\d,]+\s+Rs|[\d,.]+%)/);
      const growthMatch = text.match(/growth of\s+([-\d\.]+%)/);
      return {
          value: valueMatch ? valueMatch[0] : '',
          growth: growthMatch ? growthMatch[1] : ''
      };
  };

  const getGrowthIcon = (growth: string, color: string) => {
      if (!growth) return null;
      if (color === 'positive') return <TrendingUp size={10} />;
      if (color === 'negative') return <TrendingDown size={10} />;
      return <Minus size={10} />;
  };

  const renderMetric = (item: InsightItem, idx: number) => {
      const { value, growth } = parseInsight(item.insight_text);
      const displayValue = value || "-";
      
      return (
          <div key={idx} className="bg-white p-2 rounded border border-gray-100 flex flex-col justify-between min-h-[55px]">
              <div className="text-[9px] text-gray-500 font-semibold uppercase truncate" title={item.parameter}>
                  {item.parameter.replace('Quarterly ', '').replace('Annual ', '')}
              </div>
              <div className="flex items-end justify-between mt-1">
                  <div className="text-sm font-bold text-gray-800 leading-none">{displayValue}</div>
                  {growth && (
                      <div className={`flex items-center gap-0.5 text-[9px] font-bold px-1 py-0.5 rounded ${
                          item.insight_color === 'positive' ? 'bg-green-50 text-green-700' : 
                          item.insight_color === 'negative' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
                      }`}>
                           {getGrowthIcon(growth, item.insight_color)}
                           {growth}
                      </div>
                  )}
              </div>
          </div>
      );
  };

  const renderContent = () => {
      let items: React.ReactNode[] = [];
      
      if (activeTab === 'PL') {
          // P&L combines Quarter and Annual
          const quarter = activeData.QUARTER || [];
          const annual = activeData.ANNUAL || [];
          
          return (
              <div className="space-y-3">
                  {quarter.length > 0 && (
                      <div>
                          <div className="text-[9px] font-bold text-gray-400 mb-1.5 uppercase">Quarterly</div>
                          <div className="grid grid-cols-2 gap-2">{quarter.map(renderMetric)}</div>
                      </div>
                  )}
                  {annual.length > 0 && (
                      <div>
                          <div className="text-[9px] font-bold text-gray-400 mb-1.5 uppercase">Annual</div>
                          <div className="grid grid-cols-2 gap-2">{annual.map(renderMetric)}</div>
                      </div>
                  )}
              </div>
          );
      } else if (activeTab === 'BS') {
          items = (activeData.BALANCE_SHEET || []).map(renderMetric);
      } else if (activeTab === 'CF') {
          items = (activeData.CASH_FLOW || []).map(renderMetric);
      } else if (activeTab === 'RATIO') {
          items = (activeData.FINANCIAL_RATIOS || []).map(renderMetric);
      }

      if (items.length === 0) {
          return <div className="text-center text-xs text-gray-400 italic py-4">No Data for this section</div>;
      }

      return <div className="grid grid-cols-2 gap-2">{items}</div>;
  };

  const TabButton = ({ id, label, icon: Icon }: { id: typeof activeTab, label: string, icon: any }) => (
      <button 
          onClick={() => setActiveTab(id)}
          className={`flex-1 py-1.5 flex flex-col items-center justify-center gap-1 text-[9px] font-medium transition-colors border-b-2 ${
              activeTab === id 
              ? 'border-indigo-500 text-indigo-700 bg-indigo-50/50' 
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
          }`}
      >
          <Icon size={14} />
          {label}
      </button>
  );

  return (
    <div className="h-full flex flex-col bg-white">
        {/* Top: Standalone/Consolidated Switch */}
        <div className="flex border border-gray-100 rounded-lg overflow-hidden mb-2 shrink-0 p-0.5 bg-gray-50">
            <button 
                onClick={() => setView('CONSOLIDATED')}
                className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all ${currentView === 'CONSOLIDATED' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                disabled={!data.CONSOLIDATED}
            >
                Consol.
            </button>
            <button 
                onClick={() => setView('STANDALONE')}
                className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all ${currentView === 'STANDALONE' ? 'bg-white text-indigo-700 shadow-sm ring-1 ring-black/5' : 'text-gray-400 hover:text-gray-600'}`}
                disabled={!data.STANDALONE}
            >
                Standalone
            </button>
        </div>

        {/* Middle: Category Tabs */}
        <div className="flex border-b border-gray-100 mb-2 shrink-0">
            <TabButton id="PL" label="P&L" icon={Coins} />
            <TabButton id="BS" label="B/S" icon={Scale} />
            <TabButton id="CF" label="Cash" icon={ArrowRightLeft} />
            <TabButton id="RATIO" label="Ratios" icon={PieChart} />
        </div>

        {/* Content Area */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-1">
            {renderContent()}
        </div>
    </div>
  );
};

export default FinancialsCard;