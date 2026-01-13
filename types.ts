export interface StockHolding {
  symbol: string;
  name: string;
  quantity: number;
  percentage: number; // % of AUM
  value?: number; // Total value in portfolio (mock)
}

export interface FundSnapshot {
  id: string;
  fundName: string;
  month: string; // "YYYY-MM"
  holdings: StockHolding[];
}

export interface StockPriceData {
  current_price: string;
  last_updated: string;
  todays_change_direction: string;
  todays_change_number: string;
  todays_change_percentage: string;
  volume: string;
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  FUND_DETAIL = 'FUND_DETAIL',
  STOCK_SEARCH = 'STOCK_SEARCH',
  STOCK_DETAIL = 'STOCK_DETAIL',
}

// New Types for Mutual Fund Holdings Feature
export interface MFHoldingHistory {
  month: string;
  sharesHeld: number;
  aum: number;
  changePercent: number;
  change?: number; // Absolute change in shares
  aumPercent?: number; // % of AUM of the fund
}

export interface MutualFundHolding {
  fundName: string;
  fundUrl: string;
  latest: MFHoldingHistory | null;
  history: MFHoldingHistory[];
}

export interface StockMFAnalysis {
  stockSymbol: string;
  holdings: MutualFundHolding[];
  aggregateHistory: { month: string; totalShares: number }[];
  sourceUrl?: string; // URL to the source data (Trendlyne)
}

// --- New Types for Fund Portfolio Feature ---

export interface FundSearchResult {
  name: string;
  url: string;
  pk?: number | string;
  type?: string; // e.g. "Large Cap" if available, or generic
}

export interface FundMeta {
  category: string;
  description: string;
  fundPk?: number | string;
}

export interface SectorDistribution {
  name: string;
  value: number;
  [key: string]: any;
}

export interface FundPortfolioData {
  holdings: FundPortfolioHolding[];
  meta: FundMeta | null;
  sectorDistribution: SectorDistribution[];
}

export interface FundPortfolioHolding {
  stockName: string;
  stockSymbol: string;
  stockUrl: string;
  sector: string;
  value: number; // Market Value
  percentage: number; // % of Total Holding
  quantity: number;
  changeQuantity: number;
  changePercentage: number;
  historyUrl: string;
  // Trendlyne Scores
  d: number;
  dColor: string;
  v: number;
  vColor: string;
  m: number;
  mColor: string;
  stockPk?: number | string;
}

export interface HoldingHistoryItem {
  "Holding Date": string;
  "1M Change %": string;
  [key: string]: any;
}