import { FundSnapshot, StockHolding, StockMFAnalysis, MutualFundHolding, MFHoldingHistory, StockPriceData, FundPortfolioHolding, FundSearchResult, FundPortfolioData, FundMeta, SectorDistribution, HoldingHistoryItem } from '../types';
import { extractStockDataFromHtml } from './geminiService';
import * as XLSX from 'xlsx';

const PROXY_BASE_URL = "https://app-to-extract-holdings--shubhamgroverda.replit.app/api/extract-data";

interface ProxyOptions {
  attribute?: string;
  attributeValue?: string;
  tagName?: string;
}

/**
 * Helper function to fetch data via the proxy service.
 * Constructs the URL with query parameters automatically.
 * Handles both JSON and raw text responses.
 */
const fetchFromProxy = async (targetUrl: string, options: ProxyOptions = {}) => {
  const url = new URL(PROXY_BASE_URL);
  url.searchParams.append('url', targetUrl);
  
  if (options.attribute) url.searchParams.append('attribute', options.attribute);
  if (options.attributeValue) url.searchParams.append('attributeValue', options.attributeValue);
  if (options.tagName) url.searchParams.append('tagName', options.tagName);

  console.log(`Fetching from proxy: ${url.toString()}`);
  
  const response = await fetch(url.toString());
  if (!response.ok) {
      throw new Error(`Proxy request failed with status ${response.status}: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  } else {
    // Fallback for raw string/html responses
    return await response.text();
  }
};





// Excel Parsing Logic
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

// --- Master Stock List Search Logic ---

interface StockApiItem {
  compname: string;
  s_name: string;
  fincode: number;
  stock_search: string;
}

// Module-level cache
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

// --- Master Mutual Fund List Search Logic ---

let fundListCache: FundSearchResult[] | null = null;
let fundListPromise: Promise<void> | null = null;

const ensureFundListLoaded = async () => {
  if (fundListCache) return;
  
  if (!fundListPromise) {
    fundListPromise = (async () => {
      const url = "https://trendlyne.com/mutual-fund/getMFdata/?category=Multi+%26+Flexi-Cap&category=Mid-Cap&category=Large-Cap&category=Small-Cap&category=ELSS&category=Large+%26+Mid-Cap&category=Focused+Fund&category=Equity+-+Sectoral&category=Value&plan=Direct";
      try {
        let data = await fetchFromProxy(url);
        
        // Ensure data is parsed if it came back as a string
        if (typeof data === 'string') {
            try {
                data = JSON.parse(data);
            } catch (e) {
                console.error("Error parsing fund list JSON string", e);
                // Continue, maybe it's not JSON
            }
        }

        let list: any[] = [];
        
        // Handle new structure: { body: { tableData: [ [ {name, url, pk}, ... ], ... ] } }
        if (data && data.body && Array.isArray(data.body.tableData)) {
            // Map the first element of each row which contains the fund info object
            list = data.body.tableData.map((row: any[]) => row[0]);
        } else if (Array.isArray(data)) {
            // Fallback for flat structure
            list = data;
        } else if (data && typeof data === 'object' && Array.isArray(data.data)) {
            // Fallback for data.data structure
            list = data.data;
        }

        fundListCache = list.map((item: any) => ({
          name: item.name || item.fname || item.s_name || "Unknown Fund",
          url: item.url || item.link || item.scheme_url || "",
          pk: item.pk || item.id || item.scheme_code || 0,
          type: "Equity Fund" // Default type as API response groups mixed categories
        })).filter(f => f.name !== "Unknown Fund" && f.url);

        console.log(`Loaded ${fundListCache.length} funds into cache.`);

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
  // Filter by name and return top 20
  return fundListCache.filter(f => f.name.toLowerCase().includes(lowerQ)).slice(0, 20);
};


// --- Fund Portfolio Fetcher ---

export const fetchFundPortfolio = async (fundUrl: string): Promise<FundPortfolioData | null> => {
  try {
    // We need to fetch 3 things: Holdings, Fund Meta (Description), Sector Distribution
    // 1. Holdings: attribute 'data-holdings'
    // 2. Meta: attribute 'data-mfobj'
    // 3. Sectors: attribute 'data-distributiongraphdataequity'

    const [holdingsRes, metaRes, sectorRes] = await Promise.all([
        fetchFromProxy(fundUrl, { attribute: 'data-holdings' }),
        fetchFromProxy(fundUrl, { attribute: 'data-mfobj' }),
        fetchFromProxy(fundUrl, { attribute: 'data-distributiongraphdataequity' })
    ]);

    // --- Parse Holdings ---
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
            // Scores
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

    // --- Parse Meta ---
    let meta: FundMeta | null = null;
    let metaObj: any = null;
    if (typeof metaRes === 'string') {
         try { metaObj = JSON.parse(metaRes); } catch (e) { console.error("Error parsing meta", e); }
    } else if (typeof metaRes === 'object') {
        metaObj = metaRes;
    }
    
    // Check if proxy returned { rawValue: string } or raw JSON
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

    // --- Parse Sector Distribution ---
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

    return {
        holdings,
        meta,
        sectorDistribution
    };

  } catch (error) {
    console.error("Error fetching fund portfolio data:", error);
    return null;
  }
};

export const fetchFundHoldingHistory = async (historyUrl: string): Promise<HoldingHistoryItem[]> => {
    try {
        const url = `${historyUrl}`;
        const data = await fetchFromProxy(url, { tagName: 'table', attribute: 'class', attributeValue: 'table fs09rem tl-dataTable' });
        
        // Data should be an array of objects if proxy works as expected for tables
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

// --- Live Stock Price Fetcher ---

export const fetchLiveStockPrice = async (symbol: string): Promise<StockPriceData | null> => {
  try {
    const targetUrl = `https://trendlyne.com/equity/${symbol}/stock-page/`;
    
    const htmlData = await fetchFromProxy(targetUrl, {
      attribute: 'class',
      attributeValue: ' stock_price_and_tools_container '
    });
    
    // Handle Proxy Response format (might be string, array, or object with rawValue)
    let htmlContent = "";
    if (typeof htmlData === 'string') {
        htmlContent = htmlData;
    } else if (Array.isArray(htmlData)) {
        htmlContent = htmlData.join(" ");
    } else if (htmlData && typeof htmlData === 'object') {
        htmlContent = htmlData.rawValue || JSON.stringify(htmlData);
    }

    if (!htmlContent) throw new Error("No HTML content received for Price");

    // Pass to Gemini for Parsing
    return await extractStockDataFromHtml(htmlContent);

  } catch (error) {
    console.error("Error fetching Live Stock Price:", error);
    return null;
  }
};

// --- Real-time Mutual Fund Holdings Fetcher ---

export const fetchMutualFundHoldingsForStock = async (symbol: string): Promise<StockMFAnalysis | null> => {
  try {
    const pkUrl = `https://trendlyne.com/equity/${symbol}/stock-page/`;
    
    // 1. Get Stock PK
    const pkData = await fetchFromProxy(pkUrl, { attribute: 'data-stock-pk' });
    console.log("Stock PK Response:", pkData);

    let stockPk = pkData;
    if (typeof pkData === 'object' && pkData !== null) {
       stockPk = pkData.rawValue || (Array.isArray(pkData) ? pkData[0] : null);
    }
    if (!stockPk) throw new Error("Could not fetch Stock PK");

    // 2. Get Stock Slug
    const slugData = await fetchFromProxy(pkUrl, { attribute: 'data-stockslugname' });
    console.log("Stock Slug Response:", slugData);

    let stockSlug = slugData;
    if (typeof slugData === 'object' && slugData !== null) {
        stockSlug = slugData.rawValue || (Array.isArray(slugData) ? slugData[0] : null);
    }
    if (!stockSlug) throw new Error("Could not fetch Stock Slug");

    // 3. Get Holdings Table
    const holdingsUrl = `https://trendlyne.com/equity/monthly-mutual-fund-share-holding/${stockPk}/${symbol}/latest/${stockSlug}/prune-etf/`;
    
    const rawHoldingsData = await fetchFromProxy(holdingsUrl, {
      attribute: 'class',
      attributeValue: 'table tl-dataTable JS_autoDataTables JS_export_btn full-width',
      tagName: 'table'
    });
    
    console.log("Raw Holdings Response:", rawHoldingsData);

    // Robust check for response structure
    let dataToParse = rawHoldingsData;
    if (!Array.isArray(rawHoldingsData)) {
         if (rawHoldingsData && Array.isArray(rawHoldingsData.data)) {
             dataToParse = rawHoldingsData.data;
         } else {
             // It might be that the proxy returns HTML string for table instead of JSON array. 
             // We can check if dataToParse is string. If so, we can't parse it easily without Gemini or Cheerio.
             // But for now, let's assume if it fails array check, it's null.
             console.warn("Expected array for holdings data but got:", rawHoldingsData);
             return null;
         }
    }

    // 4. Parse Data
    const mfHoldings: MutualFundHolding[] = dataToParse.map((item: any) => {
      const mfTotal = item["MF_Total:"];
      const fundName = mfTotal?.text || "Unknown Fund";
      const fundUrl = mfTotal?.href || "";

      // Extract dynamic month keys
      const history: MFHoldingHistory[] = [];
      const keys = Object.keys(item);
      
      const monthMap = new Map<string, Partial<MFHoldingHistory>>();

      keys.forEach(key => {
        // Regex to match "Dec-2025" pattern at start of key
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
        history: historyArr
      };
    });

    // 5. Aggregate History for Graph
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