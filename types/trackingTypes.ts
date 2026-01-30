
export type EntityType = 'STOCK' | 'MF';
export type Sentiment = 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';

export type InsightsConfig = {
  updateType: string;
  indicatorName: string;
  url: string;
  attribute: string;
  attributeValue: string;
  tagName: string;
  geminiParsingReq: boolean;
  geminiPrompt: string;
  filterReq: boolean;
 
};

export interface TrackedItem {
  id: string; // Symbol for Stocks, PK for MFs
  name: string;
  symbol?: string; // Optional for MFs
  type: EntityType;
  url?: string; // For navigation (e.g. Fund URL)
}

export interface TrackedEntity {
  id: string;
  name: string;
  symbol: string;
  type: EntityType;
  holdings?: number; // Mock user holdings
}

export interface Insight {
  id: string;
  entityId: string;
  title: string;
  content: string;
  date: string;
  sentiment: Sentiment;
  source: string;
  sourceUrl?: string;
}

// --- Bulk API Types ---

export interface StockDataRequestItem {
  Symbol: string;
  data: InsightsConfig[];
}

export interface BulkExtractResponse {
  requestId: string;
  status: string;
  totalStocks: number;
}

export interface InsightResultItem {
  updateType: string;
  indicatorName: string;
  geminiParsingReq: boolean;
  geminiPrompt: string;
  filterReq: boolean;
  url: string;
  success: boolean;
  type: string; // "html" | "json"
  data: string | any; // Raw HTML string or JSON object
  error?: string;
  // Augmented field for frontend state
  processedContent?: string | any; 
}

export interface PollStatusResponse {
  status: 'pending' | 'resolved';
  results: Record<string, InsightResultItem[]>; // Keyed by Symbol
  completedStocks: number;
  totalStocks: number;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

// State for Intelligent Tracking Persistence
export interface IntelligentState {
    selectedIndex: string;
    symbols: string[];
    filter: string;
    page: number;
    pageSize: number;
}

// Market Overview Data Structure
export interface MarketIndexData {
    index: string;
    last: number;
    variation: number;
    percentChange: number;
    open: number;
    high: number;
    low: number;
    previousClose: number;
    yearHigh: number;
    yearLow: number;
    pe: string;
    pb: string;
    dy: string;
    declines: string;
    advances: string;
    unchanged: string;
    perChange365d: number;
    perChange30d: number;
    oneWeekAgoVal?: number;
    oneMonthAgoVal?: number;
    oneYearAgoVal?: number;
}

// FII DII Data Types
export interface FiiDiiMetric {
    period: string; // "Daily", "1 Week", "2 Weeks", "30 Days"
    fiiNet: number;
    diiNet: number;
}

export interface FiiDiiData {
    latest: FiiDiiMetric | null;
    history: FiiDiiMetric[];
    lastUpdated: number;
}
