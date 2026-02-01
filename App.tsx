
import React, { useState } from 'react';
import Layout from './components/Layout';
import FundView from './components/FundView';
import StockDashboard from './components/StockDashboard';
import StockSearch from './components/StockSearch';
import TrackingDashboard from './components/TrackingDashboard/TrackingDashboard';
import ConfigurationView from './components/Configuration/ConfigurationView';
import { FundSnapshot, FundSearchResult } from './types';
import { InsightResultItem, IntelligentState, MarketIndexData, SectoralData } from './types/trackingTypes';
import { useInsightExtraction } from './hooks/useInsightExtraction';
import { getTrackedIndices } from './services/trackingStorage';

function App() {
  const [activeTab, setActiveTab] = useState<string>('DASHBOARD');
  const [funds, setFunds] = useState<FundSnapshot[]>();
  const [selectedStock, setSelectedStock] = useState<{symbol: string, name: string} | null>(null);
  const [selectedFund, setSelectedFund] = useState<FundSearchResult | null>(null);

  // --- Lifted State for Persistent Market Data ---
  const [marketIndices, setMarketIndices] = useState<MarketIndexData[]>([]);
  const [moversData, setMoversData] = useState<any[]>([]);
  const [sectoralData, setSectoralData] = useState<SectoralData | null>(null);

  // --- Lifted State for Bulk Insights (Deep Dive) ---
  const [bulkResults, setBulkResults] = useState<Record<string, InsightResultItem[]>>({});
  const [bulkStatus, setBulkStatus] = useState<'idle' | 'initializing' | 'polling' | 'completed' | 'error'>('idle');
  const [bulkProgress, setBulkProgress] = useState({ completed: 0, total: 0 });
  const [requestId, setRequestId] = useState<string | null>(null);

  // --- Lifted State for Intelligent Tracking ---
  const intelligentExtraction = useInsightExtraction();
  const [intelligentState, setIntelligentState] = useState<IntelligentState>({
      selectedIndex: getTrackedIndices()[0] || "NIFTY 50",
      symbols: [],
      filter: "All",
      page: 1,
      pageSize: 50
  });

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
            // Pass lifted Market Data state
            marketIndices={marketIndices}
            setMarketIndices={setMarketIndices}
            moversData={moversData}
            setMoversData={setMoversData}
            sectoralData={sectoralData}
            setSectoralData={setSectoralData}
            // Pass lifted state for Deep Dive
            bulkResults={bulkResults}
            setBulkResults={setBulkResults}
            bulkStatus={bulkStatus}
            setBulkStatus={setBulkStatus}
            bulkProgress={bulkProgress}
            setBulkProgress={setBulkProgress}
            requestId={requestId}
            setRequestId={setRequestId}
            // Pass lifted state for Intelligent Tracking
            intelligentExtraction={intelligentExtraction}
            intelligentState={intelligentState}
            setIntelligentState={setIntelligentState}
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
            marketIndices={marketIndices}
            setMarketIndices={setMarketIndices}
            moversData={moversData}
            setMoversData={setMoversData}
            sectoralData={sectoralData}
            setSectoralData={setSectoralData}
            bulkResults={bulkResults}
            setBulkResults={setBulkResults}
            bulkStatus={bulkStatus}
            setBulkStatus={setBulkStatus}
            bulkProgress={bulkProgress}
            setBulkProgress={setBulkProgress}
            requestId={requestId}
            setRequestId={setRequestId}
            intelligentExtraction={intelligentExtraction}
            intelligentState={intelligentState}
            setIntelligentState={setIntelligentState}
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
