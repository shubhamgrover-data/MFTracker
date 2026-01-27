
import React, { useState } from 'react';
import Layout from './components/Layout';
import FundView from './components/FundView';
import StockDashboard from './components/StockDashboard';
import StockSearch from './components/StockSearch';
import TrackingDashboard from './components/TrackingDashboard/TrackingDashboard';
import ConfigurationView from './components/Configuration/ConfigurationView';
import { FundSnapshot, FundSearchResult } from './types';
import { InsightResultItem } from './types/trackingTypes';

function App() {
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');
  const [funds, setFunds] = useState<FundSnapshot[]>();
  const [selectedStock, setSelectedStock] = useState<{symbol: string, name: string} | null>(null);
  const [selectedFund, setSelectedFund] = useState<FundSearchResult | null>(null);

  // --- Lifted State for Bulk Insights (Deep Dive) ---
  const [bulkResults, setBulkResults] = useState<Record<string, InsightResultItem[]>>({});
  const [bulkStatus, setBulkStatus] = useState<'idle' | 'initializing' | 'polling' | 'completed' | 'error'>('idle');
  const [bulkProgress, setBulkProgress] = useState({ completed: 0, total: 0 });
  const [requestId, setRequestId] = useState<string | null>(null);

  // Handle Navigation
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'STOCK_DETAIL') {
      setSelectedStock(null);
    }
  };

  const handleFundDataAdded = (newData: FundSnapshot) => {
    setFunds(prev => {
       if (prev && prev.find(f => f.id === newData.id)) return prev;
       return prev ? [...prev, newData] : [newData];
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
        return (
          <TrackingDashboard 
            onSelectStock={handleSelectStock}
            onSelectFund={handleSelectFundFromDashboard}
            // Pass lifted state
            bulkResults={bulkResults}
            setBulkResults={setBulkResults}
            bulkStatus={bulkStatus}
            setBulkStatus={setBulkStatus}
            bulkProgress={bulkProgress}
            setBulkProgress={setBulkProgress}
            requestId={requestId}
            setRequestId={setRequestId}
          />
        );
      case 'FUND_DETAIL':
        return (
          <FundView 
            funds={funds || []} 
            onFundDataAdded={handleFundDataAdded} 
            onSelectStock={handleSelectStock}
            initialSelectedFund={selectedFund}
          />
        );
      case 'STOCK_SEARCH':
        return (
          <StockSearch onSelectStock={handleSelectStock} />
        );
      case 'CONFIGURATION':
        return (
          <ConfigurationView 
             onSelectStock={handleSelectStock}
             onSelectFund={handleSelectFundFromDashboard}
          />
        );
      default:
        return (
          <TrackingDashboard 
            onSelectStock={handleSelectStock}
            onSelectFund={handleSelectFundFromDashboard}
            bulkResults={bulkResults}
            setBulkResults={setBulkResults}
            bulkStatus={bulkStatus}
            setBulkStatus={setBulkStatus}
            bulkProgress={bulkProgress}
            setBulkProgress={setBulkProgress}
            requestId={requestId}
            setRequestId={setRequestId}
          />
        );
    }
  };

  return (
    <Layout activeTab={activeTab === 'STOCK_DETAIL' ? 'STOCK_SEARCH' : activeTab} onTabChange={handleTabChange}>
      {renderContent()}
    </Layout>
  );
}

export default App;
