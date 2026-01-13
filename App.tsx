import React, { useState } from 'react';
import Layout from './components/Layout';
import FundView from './components/FundView';
import StockDashboard from './components/StockDashboard';
import StockSearch from './components/StockSearch';
import { FundSnapshot, FundSearchResult } from './types';


// Simple Dashboard Overview Component
const DashboardOverview: React.FC = () => (
  <div className="space-y-6">
    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-8 text-white shadow-lg">
      <h1 className="text-3xl font-bold mb-2">Market Intelligence</h1>
      <p className="opacity-90 max-w-2xl">
        Track institutional money flow in real-time. Analyze mutual fund portfolios, detect buying trends, and get live insights powered by Gemini.
      </p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
         <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Top Sector</h3>
         <p className="text-2xl font-bold text-gray-900">Banking & Finance</p>
         <div className="mt-2 text-green-600 text-sm font-medium flex items-center gap-1">
           <span>+2.4% inflow</span>
         </div>
      </div>
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
         <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Top Stock</h3>
         <p className="text-2xl font-bold text-gray-900">HDFC Bank</p>
         <div className="mt-2 text-indigo-600 text-sm font-medium flex items-center gap-1">
           <span>Held by 12 Funds</span>
         </div>
      </div>
       <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
         <h3 className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Market Sentiment</h3>
         <p className="text-2xl font-bold text-gray-900">Bullish</p>
         <div className="mt-2 text-gray-400 text-sm">
           Based on monthly accumulation
         </div>
      </div>
    </div>

    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 text-sm">
      <strong>Note:</strong> This application uses mock data for demonstration. Upload actual fund portfolios (Excel) in the 'Fund Tracker' tab to see real analysis. 
      Live prices are fetched via Gemini Grounding (Google Search).
    </div>
  </div>
);

function App() {
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');
  const [funds, setFunds] = useState<FundSnapshot[]>();
  const [selectedStock, setSelectedStock] = useState<{symbol: string, name: string} | null>(null);
  
  // Update state to hold full object or null
  const [selectedFund, setSelectedFund] = useState<FundSearchResult | null>(null);

  // Handle Navigation
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'STOCK_DETAIL') {
      setSelectedStock(null);
    }
  };

  const handleFundDataAdded = (newData: FundSnapshot) => {
    setFunds(prev => {
       // Avoid duplicates based on ID
       if (prev.find(f => f.id === newData.id)) return prev;
       return [...prev, newData];
    });
  };

  const handleSelectStock = (symbol: string, name: string) => {
    setSelectedStock({ symbol, name });
    setActiveTab('STOCK_DETAIL');
  };
  
  const handleSelectFundFromDashboard = (fund: FundSearchResult) => {
    console.log("Navigating to fund:", fund.name);
    setSelectedFund(fund);
    setActiveTab('FUND_DETAIL');
  };

  // Handler for search component (name + url)
  const handleSelectFundFromSearch = (fund: FundSearchResult) => {
     setSelectedFund(fund);
     setActiveTab('FUND_DETAIL');
  };

  const renderContent = () => {
    if (activeTab === 'STOCK_DETAIL' && selectedStock) {
      return (
        <StockDashboard 
          symbol={selectedStock.symbol} 
          stockName={selectedStock.name}
          onBack={() => handleTabChange('STOCK_SEARCH')}
          onSelectFund={handleSelectFundFromDashboard}
        />
      );
    }

    switch (activeTab) {
      case 'DASHBOARD':
        return <DashboardOverview />;
      case 'FUND_DETAIL':
        return (
          <FundView 
            funds={funds} 
            onFundDataAdded={handleFundDataAdded} 
            onSelectStock={handleSelectStock}
            initialSelectedFund={selectedFund}
          />
        );
      case 'STOCK_SEARCH':
        return (
          <StockSearch onSelectStock={handleSelectStock} />
        );
      default:
        return <DashboardOverview />;
    }
  };

  return (
    <Layout activeTab={activeTab === 'STOCK_DETAIL' ? 'STOCK_SEARCH' : activeTab} onTabChange={handleTabChange}>
      {renderContent()}
    </Layout>
  );
}

export default App;
