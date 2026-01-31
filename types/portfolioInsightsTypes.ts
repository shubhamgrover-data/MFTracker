
export interface NseActiveSecurity {
  symbol: string;
  identifier?: string;
  lastPrice?: number;
  ltp?: number; // Added for Spurts API
  pChange?: number;
  perChange?: number; // Added for Spurts API
  quantityTraded?: number;
  trade_quantity?: number; // Added for Spurts API
  totalTradedVolume?: number;
  totalTradedValue?: number;
  turnover?: number; // Added for Spurts API (usually in Lakhs)
  previousClose?: number;
  prev_price?: number; // Added for Spurts API
  yearHigh?: number;
  yearLow?: number;
  lastUpdateTime?: string;
  new52WHL?: number; // Added for 52 Week High/Low API
  _bandType?: string; // Internal field for Band Hitters
}

export interface NseActiveApiResponse {
  data: NseActiveSecurity[];
}

export interface PortfolioInsightItem {
  symbol: string;
  value: number; // Last Price
  change: number; // pChange
  insightText: string;
  type: 'positive' | 'negative' | 'neutral';
  category: string; // e.g., "Most Active", "Volume Spurt"
}

export interface PortfolioInsightCategory {
  id: string;
  title: string;
  items: PortfolioInsightItem[];
}
