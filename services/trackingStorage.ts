
import { EntityType, InsightsConfig, TrackedItem } from '../types/trackingTypes';
import {PROMPTS} from "../types/constants.ts"

export type { TrackedItem };


export const INSIGHTS_TEMPLATE: InsightsConfig[] = [
  { updateType:"Valuation",
    indicatorName:"PE",
    url: "https://trendlyne.com/tools/buy-sell-zone/stockpk/symbol/stockslugname/",
    attribute: "class",
    attributeValue: "scrolling-wrapper m-l-0 m-r-0 stock-indicator-tile-container",
    tagName: "",
    geminiParsingReq: true,
    filterReq: false,
    geminiPrompt: PROMPTS[0].prompt, 
  },
  { updateType:"Valuation",
    indicatorName:"DetailledPE",
    url: "https://trendlyne.com/equity/stockpk/symbol/", 
    attribute: "data-metrics",
    attributeValue: "",
    tagName: "",
    geminiParsingReq: false,
    filterReq: false,
    geminiPrompt: "",
  },
  { updateType:"Valuation",
    indicatorName:"Technical",
    url: "https://trendlyne.com/equity/api/stock/adv-technical-analysis/stockpk/24/",
    attribute: "",
    attributeValue: "",
    tagName: "",
    geminiParsingReq: false,
    filterReq: false,
    geminiPrompt: "",
  },
  { updateType:"Holdings",
    indicatorName:"MFHoldings",
    url: "https://trendlyne.com/equity/monthly-mutual-fund-share-holding/stockpk/symbol/latest/stockslugname/prune-etf/",
    attribute: "id",
    attributeValue: "share-change-analysis",
    tagName: "",
    geminiParsingReq: true,
    filterReq: false,
    geminiPrompt: PROMPTS[1].prompt,
  },
  { updateType:"Holdings",
    indicatorName:"QuaterlyHoldings",
    url: "https://trendlyne.com/equity/share-holding/stockpk/symbol/latest/stockslugname/",
    attribute: "class",
    attributeValue: "list-group list-group-mbdr gray666 fs09rem",
    tagName: "",
    geminiParsingReq: true,
    filterReq: false,
    geminiPrompt: PROMPTS[2].prompt,
  },
  { updateType:"Deals",
    indicatorName:"Bulk/Block Deals",
    url: "https://trendlyne.com/equity/bulk-block-deals/symbol/stockpk/stockslugname/",
    attribute: "class",
    attributeValue: "card-block",
    tagName: "",
    geminiParsingReq: true,
    filterReq: false,
    geminiPrompt: PROMPTS[3].prompt,
  },
  { updateType:"Deals",
    indicatorName:"Insider/SAST Deals",
    url: "https://trendlyne.com/equity/insider-trading-sast/all/symbol/stockpk/stockslugname/",
    attribute: "class",
    attributeValue: "tlcard p-a-1 m-b-2",
    tagName: "",
    geminiParsingReq: true,
    filterReq: false,
    geminiPrompt: PROMPTS[4].prompt,
  },
  { updateType:"Financials",
    indicatorName:"FinancialInsights",
    url: "https://trendlyne.com/fundamentals/financials/stockpk/symbol/stockslugname/",
    attribute: "data-stock-insight",
    attributeValue: "",
    tagName: "",
    geminiParsingReq: false,
    filterReq: false,
    geminiPrompt: "",
  }
];

export const EXTRA_REQUEST:InsightsConfig[] = [ { updateType:"Volume",
    indicatorName:"VolumeAnalysis",
    url: INSIGHTS_TEMPLATE[0].url,
    attribute: "data-chart-options,data-piechartdata,data-promoterbarchart,data-mfbarchart,data-fiibarchart",
    attributeValue: "",
    tagName: "",
    geminiParsingReq: false,
    filterReq: false,
    geminiPrompt: "",
  },
  { updateType:"Holdings",
    indicatorName:"Quaterly Holdings",
    url: INSIGHTS_TEMPLATE[4].url,
    attribute: "data-piechartdata,data-promoterbarchart,data-mfbarchart,data-fiibarchart",
    attributeValue: "",
    tagName: "",
    geminiParsingReq: false,
    filterReq: false,
    geminiPrompt: "",
  }];

const STORAGE_KEY = 'fundflow_tracked_items';
const IGNORED_KEY = 'fundflow_ignored_items';
const EVENT_KEY = 'fundflow_tracking_update';
const INDICES_KEY = 'fundflow_tracked_indices';

const DEFAULT_ITEMS: TrackedItem[] = [
  { id: 'RELIANCE', name: 'Reliance Industries Ltd', symbol: 'RELIANCE', type: 'STOCK' },
  { id: 'HDFCBANK', name: 'HDFC Bank Ltd', symbol: 'HDFCBANK', type: 'STOCK' },
  { id: 'ZOMATO', name: 'Zomato Ltd', symbol: 'ZOMATO', type: 'STOCK' },
  { id: 'PAYTM', name: 'One97 Communications Ltd', symbol: 'PAYTM', type: 'STOCK' },
  { id: 'RVNL', name: 'Rail Vikas Nigam Ltd', symbol: 'RVNL', type: 'STOCK' },
  { id: 'IRFC', name: 'Indian Railway Finance Corp', symbol: 'IRFC', type: 'STOCK' },
  { id: 'JIOFIN', name: 'Jio Financial Services', symbol: 'JIOFIN', type: 'STOCK' },
  { id: 'VBL', name: 'Varun Beverages Ltd', symbol: 'VBL', type: 'STOCK' },
  { id: 'HAL', name: 'Hindustan Aeronautics Ltd', symbol: 'HAL', type: 'STOCK' },
  { id: 'BEL', name: 'Bharat Electronics Ltd', symbol: 'BEL', type: 'STOCK' },
  { id: 'TRENT', name: 'Trent Ltd', symbol: 'TRENT', type: 'STOCK' },
  { id: 'MAZDOCK', name: 'Mazagon Dock Shipbuilders', symbol: 'MAZDOCK', type: 'STOCK' },
];

const DEFAULT_IGNORED_ITEMS: string[] = [
  "ADANIENSOL", "ADANIGREEN", "ADANITRANS", "POLICYBZR"
];

const DEFAULT_INDICES = ["NIFTY NEXT 50","NIFTY 50", "NIFTY BANK", "NIFTY IT"];

export const getTrackedItems = (): TrackedItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    } else {
      // Initialize with defaults if empty
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ITEMS));
      return DEFAULT_ITEMS;
    }
  } catch (e) {
    console.error("Error parsing tracked items", e);
    return [];
  }
};

export const addTrackedItem = (item: TrackedItem) => {
  const items = getTrackedItems();
  
  // Check limit for Stocks (Max 50)
  if (item.type === 'STOCK') {
      const stockCount = items.filter(i => i.type === 'STOCK').length;
      if (stockCount >= 50) {
          alert("Watchlist limit reached. You can track a maximum of 50 stocks.");
          return;
      }
  }

  // Prevent duplicates
  if (!items.find(i => i.id === item.id && i.type === item.type)) {
    const newItems = [...items, item];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
    // Dispatch event to notify listeners (like Dashboard) to auto-refresh
    window.dispatchEvent(new Event(EVENT_KEY));
  }
};

export const removeTrackedItem = (id: string, type: EntityType) => {
  const items = getTrackedItems();
  const newItems = items.filter(i => !(i.id === id && i.type === type));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newItems));
  // Dispatch event to notify listeners
  window.dispatchEvent(new Event(EVENT_KEY));
};

export const isTracked = (id: string, type: EntityType): boolean => {
  const items = getTrackedItems();
  return !!items.find(i => i.id === id && i.type === type);
};

// --- Ignore List Logic ---

export const getIgnoredItems = (): string[] => {
  try {
    const stored = localStorage.getItem(IGNORED_KEY);
    if (stored) {
      return JSON.parse(stored);
    } else {
      localStorage.setItem(IGNORED_KEY, JSON.stringify(DEFAULT_IGNORED_ITEMS));
      return DEFAULT_IGNORED_ITEMS;
    }
  } catch (e) {
    console.error("Error parsing ignored items", e);
    return DEFAULT_IGNORED_ITEMS;
  }
};

export const addIgnoredItem = (symbol: string) => {
  const items = getIgnoredItems();
  if (!items.includes(symbol)) {
    const newItems = [...items, symbol];
    localStorage.setItem(IGNORED_KEY, JSON.stringify(newItems));
    window.dispatchEvent(new Event(EVENT_KEY));
  }
};

export const removeIgnoredItem = (symbol: string) => {
  const items = getIgnoredItems();
  const newItems = items.filter(i => i !== symbol);
  localStorage.setItem(IGNORED_KEY, JSON.stringify(newItems));
  window.dispatchEvent(new Event(EVENT_KEY));
};

export const isIgnored = (symbol: string): boolean => {
  const items = getIgnoredItems();
  return items.includes(symbol);
};

// --- Index Tracking Logic ---

export const getTrackedIndices = (): string[] => {
  try {
    const stored = localStorage.getItem(INDICES_KEY);
    if (stored) {
      return JSON.parse(stored);
    } else {
      localStorage.setItem(INDICES_KEY, JSON.stringify(DEFAULT_INDICES));
      return DEFAULT_INDICES;
    }
  } catch (e) {
    console.error("Error parsing tracked indices", e);
    return DEFAULT_INDICES;
  }
};

export const addTrackedIndex = (indexName: string) => {
  const indices = getTrackedIndices();
  if (!indices.includes(indexName)) {
    const newIndices = [...indices, indexName].sort();
    localStorage.setItem(INDICES_KEY, JSON.stringify(newIndices));
    window.dispatchEvent(new Event(EVENT_KEY));
  }
};

export const removeTrackedIndex = (indexName: string) => {
  const indices = getTrackedIndices();
  const newIndices = indices.filter(i => i !== indexName);
  localStorage.setItem(INDICES_KEY, JSON.stringify(newIndices));
  window.dispatchEvent(new Event(EVENT_KEY));
};

// Helper to generate the specific config for a stock
export const generateInsightConfig = (symbol: string, pk: string, slug: string): InsightsConfig[] => {
  return INSIGHTS_TEMPLATE.map(t => {
    let finalUrl = t.url
      .replace(/stockpk/g, pk)
      .replace(/symbol/g, symbol)
      .replace(/stockslugname/g, slug);

    return {
      ...t,
      url: finalUrl,
    };
  });
};
