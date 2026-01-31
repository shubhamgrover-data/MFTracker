

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
    indexSymbol:string;
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

// Sectoral Pulse Data Types
export interface SectorPulseItem {
    name: string;
    type: 'SECTOR' | 'INDUSTRY' | 'INDEX';
    currentVal?: number;
    changePercent: number;
    advances: number;
    declines: number;
    pe?: number;
    pb?: number;
    oneWeekChange?: number;
    oneMonthChange?: number;
    oneYearChange?: number;
    url?: string;
    // For Indices specifically
    yearHigh?: number;
    yearLow?: number;
}

export interface SectoralData {
    sectors: SectorPulseItem[];
    industries: SectorPulseItem[];
    indices: SectorPulseItem[];
    lastUpdated: number;
}

export interface SectorInsightItem {
    id: number | string;
    name: string; // Symbol
    tooltip_stock_name: string; // Company Name
    cell_url: string;
    value: number; // Change value (positive/negative)
    param_value: number; 
    disp_value: string; // Display string e.g. "4.6%"
    color: string;
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

// Index Insights Types
export interface IndexInsightItem {
    symbol: string;
    value?: number; // Generic value field (price, volume, points)
    change?: number;
    insightText: string;
    type: 'positive' | 'negative' | 'neutral';
}

export interface IndexInsightCategory {
    id: string;
    title: string;
    items: IndexInsightItem[];
}
