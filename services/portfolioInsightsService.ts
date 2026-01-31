
import { fetchFromProxy } from "./dataService";
import { NseActiveApiResponse, PortfolioInsightCategory, PortfolioInsightItem } from "../types/portfolioInsightsTypes";

// API Configurations
const INSIGHT_APIS = [
  {
    id: 'active_eq',
    title: 'Most Active Equities',
    url: 'https://www.nseindia.com/api/live-analysis-most-active-securities?index=value',
    type: 'VALUE'
  },
  {
    id: 'price_spurts',
    title: 'Price Spurts (>20%)',
    url: 'https://www.nseindia.com/api/live-analysis-variations?index=gainers&key=SecGtr20',
    type: 'PRICE'
  },
  {
    id: 'vol_spurts',
    title: 'Volume Spurts',
    url: 'https://www.nseindia.com/api/live-analysis-volume-gainers',
    type: 'VOLUME'
  },
  {
    id: 'band_hitters',
    title: 'Price Band Hitters',
    url: 'https://www.nseindia.com/api/live-analysis-price-band-hitter',
    type: 'PRICE'
  },
  {
    id: 'high_52',
    title: '52 Week High',
    url: 'https://www.nseindia.com/api/live-analysis-data-52weekhighstock',
    type: 'PRICE'
  },
  {
    id: 'low_52',
    title: '52 Week Low',
    url: 'https://www.nseindia.com/api/live-analysis-data-52weeklowstock',
    type: 'PRICE'
  },
  {
    id: 'large_deals',
    title: 'Large Deals',
    url: 'https://www.nseindia.com/api/snapshot-capital-market-largedeal',
    type: 'VALUE'
  },
  {
    id: 'active_sme',
    title: 'Most Active SME',
    url: 'https://www.nseindia.com/api/live-analysis-most-active-sme?index=value',
    type: 'VALUE'
  }
];

const formatValue = (val: number) => {
    if (!val) return '0';
    if (val >= 10000000) return (val / 10000000).toFixed(2) + 'Cr';
    if (val >= 100000) return (val / 100000).toFixed(2) + 'L';
    return val.toLocaleString();
};

export const fetchPortfolioInsights = async (): Promise<PortfolioInsightCategory[]> => {
  const promises = INSIGHT_APIS.map(async (config) => {
    try {
      const rawData = await fetchFromProxy(config.url);
      
      let jsonData: any;
      if (typeof rawData === 'string') {
        try {
          jsonData = JSON.parse(rawData);
        } catch (e) {
          console.error(`Failed to parse JSON for ${config.id}`, e);
          return { id: config.id, title: config.title, items: [] };
        }
      } else {
        jsonData = rawData;
      }

      let dataList: any[] = [];

      // Special handling for Price Band Hitters (Nested Structure)
      if (config.id === 'band_hitters') {
          const upper = jsonData?.upper?.AllSec?.data || [];
          const lower = jsonData?.lower?.AllSec?.data || [];
          const both = jsonData?.both?.AllSec?.data || [];
          
          // Flatten and tag
          dataList = [
              ...upper.map((i: any) => ({...i, _bandType: 'Upper Band'})),
              ...lower.map((i: any) => ({...i, _bandType: 'Lower Band'})),
              ...both.map((i: any) => ({...i, _bandType: 'Both Bands'}))
          ];
      } 
      // Special handling for Deals (Bulk, Block, Short)
      else if (config.id === 'large_deals') {
          const bulk = jsonData?.BULK_DEALS_DATA || [];
          const block = jsonData?.BLOCK_DEALS_DATA || [];
          const short = jsonData?.SHORT_DEALS_DATA || [];

          dataList = [
              ...bulk.map((i: any) => ({...i, _dealType: 'Bulk'})),
              ...block.map((i: any) => ({...i, _dealType: 'Block'})),
              ...short.map((i: any) => ({...i, _dealType: 'Short'}))
          ];
      }
      // Standard Structure
      else if (jsonData && (jsonData.data || Array.isArray(jsonData))) {
          dataList = Array.isArray(jsonData) ? jsonData : jsonData.data;
      }

      if (!dataList || !Array.isArray(dataList)) {
        return { id: config.id, title: config.title, items: [] };
      }

      const items: PortfolioInsightItem[] = dataList.map(item => {
        // Normalize fields across different NSE APIs
        
        // Price can be number or string "503"
        let price = item.lastPrice || item.ltp || item.watp || 0;
        if (typeof price === 'string') price = parseFloat(price.replace(/,/g, ''));

        // Change can be number or string " 17.48"
        let change = item.pChange || item.perChange || item.change || 0;
        if (typeof change === 'string') change = parseFloat(change.replace(/,/g, ''));

        // Volume can be number or string "27.58" (Lakhs)
        let volume = item.totalTradedVolume || item.quantityTraded || item.trade_quantity || item.qty || 0;
        if (typeof volume === 'string') volume = parseFloat(volume.replace(/,/g, ''));
        
        // Band Hitters specific volume logic (Data is often in Lakhs if totalTradedVol is present)
        if (config.id === 'band_hitters' && item.totalTradedVol) {
             const rawVol = typeof item.totalTradedVol === 'string' ? parseFloat(item.totalTradedVol.replace(/,/g, '')) : item.totalTradedVol;
             volume = rawVol * 100000; // Convert Lakhs to Absolute
        }
        
        // Normalize Value
        let value = item.totalTradedValue || 0;
        
        // Turnover usually in Lakhs for Spurts, but Crores for Band Hitters sometimes.
        if (config.id === 'price_spurts' || config.id === 'vol_spurts') {
            if (item.turnover) value = Number(item.turnover) * 100000; // Lakhs to Abs
        } else if (config.id === 'band_hitters') {
            if (item.turnover) value = Number(item.turnover) * 10000000; // Crores to Abs (Based on NSE usually)
        } else {
            // Fallback for others
            if (item.turnover) value = Number(item.turnover) * 100000;
        }

        const isPos = change >= 0;
        let type: 'positive' | 'negative' | 'neutral' = Math.abs(change) < 0.5 ? 'neutral' : (isPos ? 'positive' : 'negative');
        
        let text = '';
        
        // Custom text based on category type
        if (config.type === 'VOLUME') {
             text = `${item.symbol} volume spike: ${formatValue(volume)} shares traded. `;
        } else if (config.id === 'band_hitters') {
             text = `${item.symbol} hit ${item._bandType} Circuit. `;
        } else if (config.id === 'high_52') {
             text = `${item.symbol} hit new 52-week high of ${item.new52WHL}. `;
        } else if (config.id === 'low_52') {
             text = `${item.symbol} hit new 52-week low of ${item.new52WHL}. `;
        } else if (config.id === 'large_deals') {
             if (item._dealType === 'Short') {
                 text = `Short Selling: ${Number(volume).toLocaleString()} shares.`;
                 type = 'negative';
             } else {
                 const action = item.buySell || 'Trade';
                 const client = item.clientName ? `by ${item.clientName}` : '';
                 text = `${item._dealType} Deal: ${action} ${Number(volume).toLocaleString()} shares @ ₹${price} ${client}.`;
                 type = action === 'BUY' ? 'positive' : 'negative';
             }
        } else if (config.type === 'PRICE') {
             text = `${item.symbol} moved ${Math.abs(change).toFixed(2)}% today. `;
        } else {
             text = `${item.symbol} traded value ₹${formatValue(value)}. `;
        }

        // Additional Context Append
        if (config.id === 'band_hitters') {
             text += `Locked at ₹${price.toLocaleString()}.`;
        } else if (config.id !== 'high_52' && config.id !== 'low_52' && config.id !== 'large_deals') {
            if (isPos) {
               text += `Up ${change}% from prev close.`;
            } else {
               text += `Down ${Math.abs(change)}% from prev close.`;
            }
        }

        return {
          symbol: item.symbol,
          value: price,
          change: change,
          insightText: text,
          type: type,
          category: config.title
        };
      });

      // Filter out invalid items
      const validItems = items.filter(i => i.symbol);

      return {
        id: config.id,
        title: config.title,
        items: validItems
      };

    } catch (e) {
      console.error(`Error fetching portfolio insight ${config.id}`, e);
      return { id: config.id, title: config.title, items: [] };
    }
  });

  return Promise.all(promises);
};
