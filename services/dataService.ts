
import { FundSnapshot, StockHolding, StockMFAnalysis, MutualFundHolding, MFHoldingHistory, StockPriceData, FundPortfolioHolding, FundSearchResult, FundPortfolioData, FundMeta, SectorDistribution, HoldingHistoryItem } from '../types';
import { StockDataRequestItem, BulkExtractResponse, PollStatusResponse, MarketIndexData, FiiDiiData, FiiDiiMetric, IndexInsightCategory, IndexInsightItem, SectoralData, SectorPulseItem, SectorInsightItem } from '../types/trackingTypes';
import { generateInsightConfig } from './trackingStorage';
import { extractStockDataFromHtml } from './geminiService';
import { extractMultipleAttributes } from './helper';
import { INDEX_INSIGHTS_CONFIG } from '../types/constants';
import * as XLSX from 'xlsx';

const PROXY_BASE_URL = "https://stockmarketdata.linkpc.net/api/extract-data";
const BULK_API_URL = "https://stockmarketdata.linkpc.net/api/extractinsight";

export interface ProxyOptions {
  attribute?: string;
  attributeValue?: string;
  tagName?: string;
}

/**
 * Helper function to fetch data via the proxy service.
 * Constructs the URL with query parameters automatically.
 * Handles both JSON and raw text responses.
 */
export const fetchFromProxy = async (targetUrl: string, options: ProxyOptions = {}) => {
  const url = new URL(PROXY_BASE_URL);
  url.searchParams.append('url', targetUrl);
  
  if (options.attribute) url.searchParams.append('attribute', options.attribute);
  if (options.attributeValue) url.searchParams.append('attributeValue', options.attributeValue);
  if (options.tagName) url.searchParams.append('tagName', options.tagName);

  const response = await fetch(url.toString());
  if (!response.ok) {
      throw new Error(`Proxy request failed with status ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  let data;
  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    // Fallback for raw string/html responses
    data = await response.text();
  }

  // Handle multi-attribute response or single attribute unwrapping
  if (options.attribute && typeof data === 'object' && data !== null && !Array.isArray(data)) {
      // If asking for multiple attributes (comma-separated), return the whole object
      if (options.attribute.includes(',')) {
          return data;
      }
      
      // Backward compatibility: If single attribute request returns keyed object, unwrap it
      if (Object.prototype.hasOwnProperty.call(data, options.attribute)) {
          return data[options.attribute];
      }
  }

  return data;
};

// ... (Existing Bulk Insight Logic: getStockMetadata, initiateBulkInsightExtraction, pollBulkInsightStatus) ...

// Helper to get Stock PK and Slug using the optimized multi-attribute fetch
const getStockMetadata = async (symbol: string): Promise<{ pk: string, slug: string } | null> => {
  try {
    const targetUrl = `https://trendlyne.com/equity/${symbol}/stock-page/`;
    
    // Fetch both attributes in a single request
    const data = await fetchFromProxy(targetUrl, { attribute: 'data-stock-pk,data-stockslugname' });

    let pk = data?.['pk'];
    let slug = data?.['slug'];

    // Handle case where proxy might wrap result differently (fallback)
    if (!pk || !slug) {
         // Fallback to array if response is array
         if (Array.isArray(data)) {
             // Assuming order or structure if array is returned (less reliable)
             console.warn("Received array for metadata, structure might differ");
         }
    }

    if (pk && slug) {
        return { pk: String(pk), slug: String(slug) };
    }
    
    // Retry with individual fetches if bulk failed (Fallback mechanism)
    console.warn(`Bulk metadata fetch unclear for ${symbol}, retrying individually`);
    const [pkRes, slugRes] = await Promise.all([
        fetchFromProxy(targetUrl, { attribute: 'data-stock-pk' }),
        fetchFromProxy(targetUrl, { attribute: 'data-stockslugname' })
    ]);
    
    // Extract raw value if it comes in { rawValue: ... } format
    pk = typeof pkRes === 'object' && pkRes ? pkRes.rawValue || pkRes : pkRes;
    slug = typeof slugRes === 'object' && slugRes ? slugRes.rawValue || slugRes : slugRes;

    if (pk && slug) {
        return { pk: String(pk), slug: String(slug) };
    }

    return null;
  } catch (e) {
    console.error(`Failed to fetch metadata for ${symbol}`, e);
    return null;
  }
};

export const initiateBulkInsightExtraction = async (symbols: string[], invalidateCache: boolean = false): Promise<BulkExtractResponse | null> => {
  try {
    // 1. Resolve Metadata for all stocks
    const requestPayload: StockDataRequestItem[] = [];
    
    // Fetch metadata for all symbols in parallel
    const metadataResults = await Promise.all(
        symbols.map(async (sym) => {
            const meta = await getStockMetadata(sym);
            if (meta) return { symbol: sym, ...meta };
            return null;
        })
    );

    // 2. Build Payload
    metadataResults.forEach(item => {
        if (item) {
            requestPayload.push({
                Symbol: item.symbol,
                data: generateInsightConfig(item.symbol, item.pk, item.slug)
            });
        }
    });

    if (requestPayload.length === 0) return null;

    // 3. Send POST Request
    const url = new URL(BULK_API_URL);
    url.searchParams.append('BulkStocks', 'true');
    url.searchParams.append('invalidateCache', String(invalidateCache));
    url.searchParams.append('mode','standalone'); //use standalone always

    const response = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
    });

    if (!response.ok) throw new Error("Bulk API initiation failed");
    return await response.json();

  } catch (e) {
    console.error("Bulk extraction init error", e);
    return null;
  }
};

export const pollBulkInsightStatus = async (requestId: string): Promise<PollStatusResponse | null> => {
    try {
        const url = `${BULK_API_URL}/status/${requestId}`;
        const response = await fetch(url);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        console.error("Polling error", e);
        return null;
    }
};

// Standalone function as requested, accepting multiple attributes
export const fetchMultipleAttributes = async (targetUrl: string, attributes: string[]) => {
    const url = new URL(PROXY_BASE_URL);
    url.searchParams.append('url', targetUrl);
    url.searchParams.append('attribute', attributes.join(','));
    
    const response = await fetch(url.toString());
    if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
    }
    return await response.json();
};


// ... (Existing Excel Parsing Logic) ...
export const parseExcelFile = async (file: File): Promise<FundSnapshot | null> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        
        const holdings: StockHolding[] = jsonData.map((row: any) => ({
          name: row['Stock Name'] || row['Name'] || 'Unknown',
          symbol: row['Symbol'] || row['Ticker'] || 'UNKNOWN',
          quantity: Number(row['Quantity'] || row['Qty'] || 0),
          percentage: Number(row['Percentage'] || row['% Assets'] || 0),
        })).filter(h => h.symbol !== 'UNKNOWN');

        const fileNameParts = file.name.split('.')[0].split('_');
        const fundName = fileNameParts[0] ? fileNameParts[0] + " Uploaded Fund" : "Uploaded Fund";
        const month = new Date().toISOString().slice(0, 7); // Default to current month

        const snapshot: FundSnapshot = {
          id: `${fundName}-${Date.now()}`,
          fundName: fundName,
          month: month,
          holdings: holdings
        };
        
        resolve(snapshot);

      } catch (error) {
        console.error("Excel parse error", error);
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

// ... (Existing Stock/Fund Search Logic) ...
let stockListCache: Array<{ symbol: string; name: string }> | null = null;
let stockListPromise: Promise<void> | null = null;

const ensureStockListLoaded = async () => {
  if (stockListCache) return;
  
  if (!stockListPromise) {
    stockListPromise = (async () => {
        try {
            const targetUrl = "https://www.rupeevest.com/mf_stock_portfolio/get_search_data_stock";
            const data = await fetchFromProxy(targetUrl);
            
            if (data && Array.isArray(data.stock_data_search)) {
                 stockListCache = data.stock_data_search.map((item: StockApiItem) => {
                    const parts = item.stock_search.split('|');
                    const symbol = parts.length >= 3 ? parts[2].trim() : '';
                    return {
                        name: item.compname || item.s_name,
                        symbol: symbol
                    };
                 }).filter((s: {symbol: string, name: string}) => s.symbol && s.symbol.length > 0);
            } else {
                stockListCache = [];
            }
        } catch (err) {
            console.error("Error fetching stock list:", err);
            stockListCache = [];
        }
    })();
  }
  await stockListPromise;
};

export const searchStocksFromMasterList = async (query: string): Promise<Array<{ symbol: string; name: string }>> => {
    await ensureStockListLoaded();
    
    if (!stockListCache) return [];
    if (!query) return [];

    const lowerQ = query.toLowerCase();
    return stockListCache.filter(s => 
        s.symbol.toLowerCase().startsWith(lowerQ) || 
        s.name.toLowerCase().includes(lowerQ)
    ).slice(0, 20);
};

interface StockApiItem {
  compname: string;
  s_name: string;
  fincode: number;
  stock_search: string;
}

let fundListCache: FundSearchResult[] | null = null;
let fundListPromise: Promise<void> | null = null;

const ensureFundListLoaded = async () => {
  if (fundListCache) return;
  
  if (!fundListPromise) {
    fundListPromise = (async () => {
      const url = "https://trendlyne.com/mutual-fund/getMFdata/?category=Multi+%26+Flexi-Cap&category=Mid-Cap&category=Large-Cap&category=Small-Cap&category=ELSS&category=Large+%26+Mid-Cap&category=Focused+Fund&category=Equity+-+Sectoral&category=Value&plan=Direct";
      try {
        let data = await fetchFromProxy(url);
        
        if (typeof data === 'string') {
            try { data = JSON.parse(data); } catch (e) {}
        }

        let list: any[] = [];
        if (data && data.body && Array.isArray(data.body.tableData)) {
            list = data.body.tableData.map((row: any[]) => row[0]);
        } else if (Array.isArray(data)) {
            list = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
            list = data.data;
        }

        fundListCache = list.map((item: any) => ({
          name: item.name || item.fname || item.s_name || "Unknown Fund",
          url: item.url || item.link || item.scheme_url || "",
          pk: item.pk || item.id || item.scheme_code || 0,
          type: "Equity Fund" 
        })).filter(f => f.name !== "Unknown Fund" && f.url);

      } catch (e) {
        console.error("Error fetching MF Master List", e);
        fundListCache = [];
      }
    })();
  }
  await fundListPromise;
};

export const searchFundsFromMasterList = async (query: string): Promise<FundSearchResult[]> => {
  await ensureFundListLoaded();
  if (!fundListCache) return [];
  if (!query) return [];

  const lowerQ = query.toLowerCase();
  return fundListCache.filter(f => f.name.toLowerCase().includes(lowerQ)).slice(0, 20);
};

export const reloadFundMasterList = async () => {
    fundListCache = null;
    fundListPromise = null;
    await ensureFundListLoaded();
};

// ... (Existing Master Index List Fetcher) ...
export const fetchMasterIndicesList = async (): Promise<Array<{ name: string; category: string }>> => {
    try {
        const url = "https://www.nseindia.com/api/equity-master";
        const data = await fetchFromProxy(url);
        
        let jsonData = data;
        if (typeof data === 'string') {
            try { jsonData = JSON.parse(data); } catch (e) { return []; }
        }

        const allowedCategories = ["Indices Eligible In Derivatives", "Broad Market Indices", "Sectoral Market Indices", "Thematic Market Indices", "Strategy Market Indices"];
        let allIndices: Array<{ name: string; category: string }> = [];
        
        allowedCategories.forEach(cat => {
            if (jsonData[cat] && Array.isArray(jsonData[cat])) {
                jsonData[cat].forEach((indexName: string) => {
                    allIndices.push({ name: indexName, category: cat });
                });
            }
        });

        return allIndices;

    } catch (e) {
        console.error("Error fetching Master Indices List", e);
        return [];
    }
};

export const fetchMarketIndices = async (): Promise<MarketIndexData[]> => {
    try {
        const url = "https://www.nseindia.com/api/allIndices";
        const data = await fetchFromProxy(url);
        
        let jsonData = data;
        if (typeof data === 'string') {
            try { jsonData = JSON.parse(data); } catch (e) { return []; }
        }

        if (jsonData && Array.isArray(jsonData.data)) {
            return jsonData.data as MarketIndexData[];
        }
        return [];
    } catch (e) {
        console.error("Error fetching Market Indices", e);
        return [];
    }
};

// ... (Existing Fund Portfolio Fetcher & other helpers) ...
export const fetchFundPortfolio = async (fundUrl: string): Promise<FundPortfolioData | null> => {
  try {
    const [holdingsRes, metaRes, sectorRes] = await Promise.all([
        fetchFromProxy(fundUrl, { attribute: 'data-holdings' }),
        fetchFromProxy(fundUrl, { attribute: 'data-mfobj' }),
        fetchFromProxy(fundUrl, { attribute: 'data-distributiongraphdataequity' })
    ]);

    let holdingsArray: any[] = [];
    if (typeof holdingsRes === 'string') {
       try { holdingsArray = JSON.parse(holdingsRes); } catch (e) { console.error("Error parsing holdings", e); }
    } else if (Array.isArray(holdingsRes)) {
       holdingsArray = holdingsRes;
    }

    const holdings: FundPortfolioHolding[] = Array.isArray(holdingsArray) 
      ? holdingsArray.map((item: any[]) => {
          const stockInfo = item[0] || {};
          return {
            stockName: stockInfo.name || "Unknown",
            stockSymbol: stockInfo.nseCode || "UNKNOWN",
            stockUrl: stockInfo.url || "",
            sector: item[1] || "",
            value: Number(item[2]) || 0,
            percentage: Number(item[4]) || 0,
            quantity: Number(item[5]) || 0,
            changeQuantity: Number(item[6]) || 0,
            changePercentage: Number(item[7]) || 0,
            historyUrl: item[8] || "",
            d: stockInfo.D,
            dColor: stockInfo.dcolor,
            v: stockInfo.V,
            vColor: stockInfo.vcolor,
            m: stockInfo.M,
            mColor: stockInfo.mcolor,
            stockPk: stockInfo.id || stockInfo.pk || stockInfo.stock_id
          };
      })
      : [];

    let meta: FundMeta | null = null;
    let metaObj: any = null;
    if (typeof metaRes === 'string') {
         try { metaObj = JSON.parse(metaRes); } catch (e) { console.error("Error parsing meta", e); }
    } else if (typeof metaRes === 'object') {
        metaObj = metaRes;
    }
    
    if (metaObj && metaObj.rawValue) {
        try { metaObj = JSON.parse(metaObj.rawValue); } catch(e) {}
    }

    if (metaObj) {
        meta = {
            category: metaObj.category || "Unknown Category",
            description: metaObj.category_description || "No description available.",
            fundPk: metaObj.pk || metaObj.id || metaObj.scheme_code
        };
    }

    let sectorDistribution: SectorDistribution[] = [];
    let sectorRaw: any = sectorRes;
     if (typeof sectorRes === 'string') {
         try { sectorRaw = JSON.parse(sectorRes); } catch (e) { console.error("Error parsing sectors", e); }
    }
    
    if (Array.isArray(sectorRaw)) {
        sectorDistribution = sectorRaw.map((item: any) => ({
            name: item.name || "Unknown",
            value: Number(item.value) || 0
        }));
    }

    return { holdings, meta, sectorDistribution };

  } catch (error) {
    console.error("Error fetching fund portfolio data:", error);
    return null;
  }
};

export const fetchFundHoldingHistory = async (historyUrl: string): Promise<HoldingHistoryItem[]> => {
    try {
        const url = `${historyUrl}`;
        const data = await fetchFromProxy(url, { tagName: 'table', attribute: 'class', attributeValue: 'table fs09rem tl-dataTable' });
        
        if (Array.isArray(data)) {
            return data as HoldingHistoryItem[];
        }
        if (data && data.data && Array.isArray(data.data)) {
             return data.data as HoldingHistoryItem[];
        }
        return [];
    } catch (e) {
        console.error("Error fetching history", e);
        return [];
    }
};

export const fetchLiveStockPrice = async (symbol: string): Promise<StockPriceData | null> => {
  try {
    const targetUrl = `https://trendlyne.com/equity/${symbol}/stock-page/`;
    const htmlData = await fetchFromProxy(targetUrl, {
      attribute: 'class',
      attributeValue: ' stock_price_and_tools_container '
    });
    
    let htmlContent = "";
    if (typeof htmlData === 'string') {
        htmlContent = htmlData;
    } else if (Array.isArray(htmlData)) {
        htmlContent = htmlData.join(" ");
    } else if (htmlData && typeof htmlData === 'object') {
        htmlContent = htmlData.rawValue || JSON.stringify(htmlData);
    }

    if (!htmlContent) throw new Error("No HTML content received for Price");
    return await extractStockDataFromHtml(htmlContent);

  } catch (error) {
    console.error("Error fetching Live Stock Price:", error);
    return null;
  }
};

export const fetchStockQuote = async (symbol: string): Promise<any | null> => {
    try {
        const encodedSymbol = encodeURIComponent(symbol);
        const url = `https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getSymbolData&marketType=N&series=EQ&symbol=${encodedSymbol}`;
        const data = await fetchFromProxy(url);
        
        let jsonData = data;
        if (typeof data === 'string') {
            try { jsonData = JSON.parse(data); } catch (e) { return null; }
        }
        
        if (jsonData && typeof jsonData === 'object' && !jsonData.equityResponse) {
             if (jsonData.rawValue) {
                 try { jsonData = JSON.parse(jsonData.rawValue); } catch(e) {}
             }
        }

        if (jsonData && jsonData.equityResponse && Array.isArray(jsonData.equityResponse) && jsonData.equityResponse.length > 0) {
            return jsonData.equityResponse[0];
        }
        return null;
    } catch (e) {
        console.error(`Error fetching NSE Quote for ${symbol}`, e);
        return null;
    }
};

export const fetchMutualFundHoldingsForStock = async (symbol: string): Promise<StockMFAnalysis | null> => {
  try {
    const pkUrl = `https://trendlyne.com/equity/${symbol}/stock-page/`;
    
    const pkData = await fetchFromProxy(pkUrl, { attribute: 'data-stock-pk' });
    let stockPk = pkData;
    if (typeof pkData === 'object' && pkData !== null) {
       stockPk = pkData.rawValue || (Array.isArray(pkData) ? pkData[0] : null);
    }
    if (!stockPk) throw new Error("Could not fetch Stock PK");

    const slugData = await fetchFromProxy(pkUrl, { attribute: 'data-stockslugname' });
    let stockSlug = slugData;
    if (typeof slugData === 'object' && slugData !== null) {
        stockSlug = slugData.rawValue || (Array.isArray(slugData) ? slugData[0] : null);
    }
    if (!stockSlug) throw new Error("Could not fetch Stock Slug");

    const holdingsUrl = `https://trendlyne.com/equity/monthly-mutual-fund-share-holding/${stockPk}/${symbol}/latest/${stockSlug}/prune-etf/`;
    const rawHoldingsData = await fetchFromProxy(holdingsUrl, {
      attribute: 'class',
      attributeValue: 'table tl-dataTable JS_autoDataTables JS_export_btn full-width',
      tagName: 'table'
    });
    
    let dataToParse = rawHoldingsData;
    if (!Array.isArray(rawHoldingsData)) {
         if (rawHoldingsData && Array.isArray(rawHoldingsData.data)) {
             dataToParse = rawHoldingsData.data;
         } else {
             return null;
         }
    }

    const mfHoldings: MutualFundHolding[] = dataToParse.map((item: any) => {
      const mfTotal = item["MF_Total:"];
      const fundName = mfTotal?.text || "Unknown Fund";
      const fundUrl = mfTotal?.href || "";
      const matches = fundUrl.match(/\d+/g);
      const mfPk = matches ? Number(matches[matches.length - 1]) : null;
      const historyUrl = `https://trendlyne.com/mutual-fund/holding-history/${mfPk}/${stockPk}`;
      
      const history: MFHoldingHistory[] = [];
      const keys = Object.keys(item);
      const monthMap = new Map<string, Partial<MFHoldingHistory>>();

      keys.forEach(key => {
        const match = key.match(/^([A-Za-z]{3}-\d{4})_(.+)$/);
        if (match) {
          const month = match[1];
          const type = match[2]; 
          
          if (!monthMap.has(month)) {
            monthMap.set(month, { month });
          }
          const entry = monthMap.get(month)!;

          if (type.includes("Shares Held")) {
            entry.sharesHeld = parseInt(String(item[key]).replace(/,/g, ''), 10) || 0;
          } else if (type.includes("AUM (Cr)")) {
            entry.aum = parseFloat(String(item[key])) || 0;
          } else if (type.includes("Month Change %")) {
            entry.changePercent = parseFloat(String(item[key]).replace('%', '')) || 0;
          } else if (type.includes("Month Change")) {
             entry.change = parseInt(String(item[key]).replace(/,/g, ''), 10) || 0;
          } else if (type.includes("Hold %") || type.includes("AUM %")) {
             entry.aumPercent = parseFloat(String(item[key]).replace('%', '')) || 0;
          }
        }
      });

      const historyArr = Array.from(monthMap.values()) as MFHoldingHistory[];
      historyArr.sort((a, b) => new Date(b.month).getTime() - new Date(a.month).getTime());

      return {
        fundName,
        fundUrl,
        latest: historyArr[0] || null,
        history: historyArr,
        historyUrl
      };
    });

    const aggMap = new Map<string, number>();
    mfHoldings.forEach(fund => {
      fund.history.forEach(h => {
        const current = aggMap.get(h.month) || 0;
        const shares = isNaN(h.sharesHeld) ? 0 : h.sharesHeld;
        aggMap.set(h.month, current + shares);
      });
    });

    const aggregateHistory = Array.from(aggMap.entries())
      .map(([month, totalShares]) => ({ month, totalShares }))
      .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime());

    return {
      stockSymbol: symbol,
      holdings: mfHoldings,
      aggregateHistory,
      sourceUrl: holdingsUrl
    };

  } catch (error) {
    console.error("Error fetching MF Holdings:", error);
    return null;
  }
};

export const fetchIndexConstituents = async (indexName: string): Promise<string[]> => {
  try {
    const encodedIndex = encodeURIComponent(indexName);
    const nseUrl = `https://www.nseindia.com/api/equity-stockIndices?index=${encodedIndex}`;
    
    const data = await fetchFromProxy(nseUrl);
    
    if (indexName === "NIFTY 50" && !data) {
        return [
            "RELIANCE", "TCS", "HDFCBANK", "INFY", "BHARTIARTL", "ICICIBANK", "ITC", 
            "SBIN", "LICI", "HINDUNILVR", "TATAMOTORS", "LT", "HCLTECH", "AXISBANK", 
            "ASIANPAINT", "MARUTI", "SUNPHARMA", "TITAN", "BAJFINANCE", "ULTRACEMCO",
            "WIPRO", "ADANIENT", "ONGC", "NTPC", "POWERGRID", "TATASTEEL", "JSWSTEEL",
            "COALINDIA", "ADANIPORTS", "M&M"
        ];
    }

    if (data && typeof data === 'object' && Array.isArray(data.data)) {
        return data.data
            .filter((item: any) => item.priority !== 1 && item.symbol !== indexName)
            .map((item: any) => item.symbol)
            .filter((sym: string) => sym);
    }
    
    return [];

  } catch (error) {
    console.error(`Failed to fetch index constituents for ${indexName}:`, error);
    return [];
  }
};

export const fetchStockSecInfo = async (symbol: string) => {
    try {
        const encodedSymbol = encodeURIComponent(symbol);
        const url = `https://www.nseindia.com/api/NextApi/apiClient/GetQuoteApi?functionName=getSymbolData&marketType=N&series=EQ&symbol=${encodedSymbol}`;
        const data = await fetchFromProxy(url);
        
        let jsonData = data;
        if (typeof data === 'string') {
            try { jsonData = JSON.parse(data); } catch (e) { return null; }
        }
        
        if (jsonData && typeof jsonData === 'object' && !jsonData.equityResponse) {
             if (jsonData.rawValue) {
                 try { jsonData = JSON.parse(jsonData.rawValue); } catch(e) {}
             }
        }

        if (jsonData && jsonData.equityResponse && Array.isArray(jsonData.equityResponse) && jsonData.equityResponse.length > 0) {
            return jsonData.equityResponse[0].secInfo;
        }
        return null;
    } catch (e) {
        console.error(`Error fetching NSE Sec Info for ${symbol}`, e);
        return null;
    }
}

// ... (FII/DII Fetcher) ...
const FII_DII_STORAGE_KEY = 'fundflow_fii_dii_data';
export const fetchFiiDiiActivity = async (forceRefresh: boolean = false): Promise<FiiDiiData | null> => {
    try {
        if (!forceRefresh) {
            const stored = localStorage.getItem(FII_DII_STORAGE_KEY);
            if (stored) {
                return JSON.parse(stored);
            }
        }

        const targetUrl = "https://trendlyne.com/macro-data/fii-dii/latest/cash-pastmonth/";
        const htmlContent = await fetchFromProxy(targetUrl);
        
        if (!htmlContent || typeof htmlContent !== 'string') throw new Error("Invalid HTML content for FII/DII");

        const extracted = extractMultipleAttributes(htmlContent, ['data-jsondata']);
        const jsonDataEntries = extracted['data-jsondata'];
        const targetElement = jsonDataEntries.find(e => e.elementId === 'cash-table-main-pastmonth');
        
        if (!targetElement || !targetElement.attributeValue) throw new Error("Target element for FII/DII not found");

        const innerJson = JSON.parse(targetElement.attributeValue);
        const rows = innerJson.data as any[][];
        const history: FiiDiiMetric[] = [];
        let latestMetric: FiiDiiMetric | null = null;

        rows.forEach(row => {
            const label = String(row[0]);
            const fiiNet = parseFloat(String(row[3])) || 0;
            const diiNet = parseFloat(String(row[4])) || 0;
            const isDate = label.match(/\d{4}/) || label.match(/[A-Z][a-z]{2}\s\d{1,2}/);
            
            if (isDate && !latestMetric) {
                 latestMetric = { period: label, fiiNet, diiNet };
            }
            if (label.includes("Last 1 Week") || label.includes("Last 2 Weeks") || label.includes("Last 30 Days")) {
                history.push({ period: label, fiiNet, diiNet });
            }
        });
        
        if (!latestMetric && rows.length > 0 && !String(rows[0][0]).includes("Last")) {
             const r = rows[0];
             latestMetric = { period: String(r[0]), fiiNet: parseFloat(String(r[3])) || 0, diiNet: parseFloat(String(r[4])) || 0 };
        }

        const result: FiiDiiData = { latest: latestMetric, history: history, lastUpdated: Date.now() };
        localStorage.setItem(FII_DII_STORAGE_KEY, JSON.stringify(result));
        return result;

    } catch (e) {
        console.error("Error fetching FII/DII Activity", e);
        const stored = localStorage.getItem(FII_DII_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
        return null;
    }
};

// ... (Index Insights Fetcher) ...
export const fetchIndexInsights = async (indexName: string): Promise<IndexInsightCategory[]> => {
    const encodedIndex = encodeURIComponent(indexName);
    const promises = INDEX_INSIGHTS_CONFIG.map(async (config) => {
        try {
            const url = config.url.replace('{INDEX}', encodedIndex);
            const rawData = await fetchFromProxy(url);
            
            let data: any = rawData;
            if (typeof rawData === 'string') {
                try { data = JSON.parse(rawData); } catch(e) {}
            }
            
            let items: any[] = [];
            if (data && typeof data === 'object') {
                const root = data.data || data;
                if (config.isContribution && Array.isArray(root)) {
                    items = root;
                } else if (root && root[config.jsonKey] && Array.isArray(root[config.jsonKey])) {
                    items = root[config.jsonKey];
                }
            }

            if (config.id === 'movers') {
                items = items.filter((i: any) => (i.changePoints || 0) > 0);
            } else if (config.id === 'draggers') {
                items = items.filter((i: any) => (i.changePoints || 0) < 0);
            }

            const insights: IndexInsightItem[] = items.map((item: any) => ({
                symbol: item.symbol || item.icSymbol,
                value: item.lastPrice || item.lastTradedPrice,
                change: item.pchange || item.changePer,
                insightText: config.template(item),
                type: config.type as 'positive' | 'negative' | 'neutral'
            }));

            return { id: config.id, title: config.title, items: insights };

        } catch (e) {
            console.error(`Error fetching ${config.title} for ${indexName}`, e);
            return { id: config.id, title: config.title, items: [] };
        }
    });

    const results = await Promise.all(promises);
    return results;
};

// --- Sectoral Pulse Fetcher ---

const DURATION_MAP: Record<string, { urlPart: string, keyPrefix: string }> = {
    '1D': { urlPart: 'day-changeP', keyPrefix: 'day' },
    '1W': { urlPart: 'week-changeP', keyPrefix: 'week' },
    '1M': { urlPart: 'month-changeP', keyPrefix: 'month' },
    '3M': { urlPart: 'qtr-changeP', keyPrefix: 'qtr' },
    '1Y': { urlPart: 'full-yr-changeP', keyPrefix: 'year' }, //changed to full-yr to fetch from right url
    '3Y': {urlPart:'three-yr-changeP', keyPrefix:'3 years'}
};

export const fetchSectoralAnalysis = async (duration: string = '1D'): Promise<SectoralData | null> => {
    try {
        const config = DURATION_MAP[duration] || DURATION_MAP['1D'];
        const url = `https://trendlyne.com/equity/sector-industry-analysis/overall/${config.urlPart}/`;
        
        const rawData = await fetchFromProxy(url);
        
        let data: any = rawData;
        if (typeof rawData === 'string') {
            try { data = JSON.parse(rawData); } catch(e) { return null; }
        }
        
        if (!data || !data.body) return null;

        const processItems = (tableData: any[], type: 'SECTOR' | 'INDUSTRY' | 'INDEX'): SectorPulseItem[] => {
            if (!Array.isArray(tableData)) return [];
            
            return tableData.map(item => {
                 const name = item.stock_column?.stockName || item.stock_column?.get_full_name || "Unknown";
                 
                 // Dynamic Key Extraction
                 let change = 0;
                 const keyPrefix = config.keyPrefix;
                 if (type === 'INDUSTRY') change = item[`${keyPrefix}_changeP_mcapw_ind`];
                 else if (type === 'SECTOR') change = item[`${keyPrefix}_changeP_mcapw_sec`];
                 else change = item[`${keyPrefix}_changeP`];

                 // Ensure we extract the Last Traded Price correctly
                 const currentVal = item.currentPrice || item.yearHighLow?.ltp;

                 return {
                     name,
                     type,
                     changePercent: change || 0,
                     currentVal,
                     advances: item.advance?.value || 0,
                     declines: item.decline?.value || 0,
                     pe: item.pe_ttm_mcapw_ind || item.pe_ttm_mcapw_sec || item.live_pe,
                     pb: item.pbv_ttm_mcapw_ind || item.pbv_ttm_mcapw_sec || item.PB,
                     // We keep generic names but populate them if available in the source JSON under any timeframe
                     oneWeekChange: item.week_changeP_mcapw_ind || item.week_changeP_mcapw_sec || item.week_changeP,
                     oneMonthChange: item.month_changeP_mcapw_ind || item.month_changeP_mcapw_sec || item.month_changeP,
                     oneYearChange: item.year_changeP_mcapw_ind || item.year_changeP_mcapw_sec || item.year_changeP,
                     url: item.stock_column?.url || item.stock_column?.absolute_url || "",
                     // Index specific
                     yearHigh: item.yearHighLow?.high,
                     yearLow: item.yearHighLow?.low
                 };
            });
        };

        const sectors = processItems(data.body.sector?.tableData, 'SECTOR');
        const industries = processItems(data.body.industry?.tableData, 'INDUSTRY');
        const indices = processItems(data.body.index?.tableData, 'INDEX');

        return {
            sectors,
            industries,
            indices,
            lastUpdated: Date.now()
        };

    } catch (e) {
        console.error("Error fetching Sectoral Analysis", e);
        return null;
    }
};

export const fetchSectorInsights = async (url: string): Promise<SectorInsightItem[]> => {
    try {
        const rawData = await fetchFromProxy(url, { attribute: 'data-treemapdict' });
        let data: any = rawData;
        if (typeof rawData === 'string') {
            try { data = JSON.parse(rawData); } catch(e) {}
        }
        
        if (data && Array.isArray(data.chart)) {
             // Filter out container items (id is string like "pstv-container")
             return data.chart.filter((item: any) => typeof item.id === 'number');
        }
        return [];
    } catch (e) {
        console.error("Error fetching sector insights", e);
        return [];
    }
}
