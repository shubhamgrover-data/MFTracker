
import { INDICATOR_THRESHOLDS, INSIGHT_TEXT_TEMPLATES } from "../types/constants";
import {fetchFromProxy} from "./dataService";
import {EXTRA_REQUEST} from "./trackingStorage";

// --- Types based on provided JSON structures ---

interface PETile {
  title: string;
  label: string;
  value: string;
  message: string;
}

interface PEJsonData {
  tiles: PETile[];
}

interface TechnicalParameter {
  name: string;
  value: number;
  insight: string | null;
  color: string;
  description: string | null;
}

// New Structure for Volume/Delivery provided by user
interface VolumeDeliveryJson {
  volumes: number[]; // [Day, Week, Month]
  delivery: [number, number][]; // [[Vol, %], [Vol, %], [Vol, %]]
  period: string[]; // ["Date", "Week", "Month"]
}

// Structure for Quarterly Holdings (Promoter, MF, FII, DII)
interface QuarterlyHoldingsJson {
  "data-piechartdata"?: any[];
  "data-promoterbarchart"?: any[][];
  "data-mfbarchart"?: any[][];
  "data-fiibarchart"?: any[][];
  "data-diibarchart"?: any[][];
}

// Deal Structures
interface BulkDealsJson {
  title: string;
  summary: string;
  description: string;
}

interface InsiderDealsJson {
  title: string;
  summaries: string[];
  description: string;
}

interface PriceAnalysisItem {
  name: string; // "1 Day", "1 Year", etc.
  changePercent: number;
  changePercentSafe?: number;
  low?: number;
  high?: number;
  startPrice?: number;
  change?: number;
  color?: string;
  startPriceSafe?: number;
  changeSafe?: number;
  colorSafe?: string;
}

interface TechnicalJsonData {
  body: {
    parameters: {
      current_price: number;
      price_insight?: Array<{
          param: string; // "year_low"
          value: number;
      }>;
      price_analysis?: PriceAnalysisItem[];
      sma_parameters?: TechnicalParameter[];
      ema_parameters?: TechnicalParameter[];
    };
  };
}

interface ChartOption {
  type: string;
  x_labels: string[];
  y_labels: string;
  series_names: string[];
}

interface MFChartData {
  heading: string;
  chart_options: ChartOption;
  chart_data: number[][];
}

interface MFShareChangeJson {
  title: string;
  summary: string;
  charts: MFChartData[];
}

export interface ProcessedInsight {
  status: 'triggered' | 'ignored';
  text?: string;
  type?: 'Valuation' | 'Technicals' | 'Holdings' | 'Performance' | 'Deals';
  data?: any; // Must include symbol
}

// --- Helper: Clean Number String ---
const parseNumber = (str: string): number => {
  if (!str) return 0;
  // Remove commas, text, newlines, percentage signs
  const clean = str.replace(/,/g, '').replace(/[^\d.-]/g, '');
  return parseFloat(clean) || 0;
};

// --- Helper: Parse Date from Deal Summary ---
const parseDealDate = (text: string): Date | null => {
    // Regex to find date pattern. Matches "Mmm. DD, YYYY" or "Mmm. D, YYYY"
    const dateRegex = /([A-Z][a-z]{2}\.?\s+\d{1,2},\s+\d{4})/;
    const match = text.match(dateRegex);
    
    if (match) {
        const cleanDateStr = match[1].replace('.', '');
        const date = new Date(cleanDateStr);
        if (!isNaN(date.getTime())) return date;
    }
    // Fallback: Check for "today" or "yesterday" logic if source provides it, or assume current if just extracted
    return null;
};

// --- 1. Valuation Analysis (PE) ---
export const evaluateValuation = (symbol: string, data: PEJsonData): ProcessedInsight => {
  if (!data?.tiles) return { status: 'ignored', data: { symbol } };

  const currentPeTile = data.tiles.find(t => t.label.toLowerCase() === "current pe");
  const averagePeTile = data.tiles.find(t => t.label.toLowerCase() === "average pe");

  if (!currentPeTile || !averagePeTile) return { status: 'ignored', data: { symbol } };

  const currentPE = parseNumber(currentPeTile.value);
  const averagePE = parseNumber(averagePeTile.value);

  if (averagePE === 0) return { status: 'ignored', data: { symbol } };

  const diffPercent = ((averagePE - currentPE) / averagePE) * 100;

  if (currentPE < averagePE && diffPercent >= INDICATOR_THRESHOLDS.PE_DISCOUNT_PERCENT) {
    const text = INSIGHT_TEXT_TEMPLATES.VALUATION_ATTRACTIVE
      .replace('{symbol}', symbol)
      .replace('{current}', currentPE.toFixed(1))
      .replace('{diff}', diffPercent.toFixed(1))
      .replace('{average}', averagePE.toFixed(1));

    return {
      status: 'triggered',
      text,
      type: 'Valuation',
      data: { symbol, currentPE, averagePE, diffPercent }
    };
  }

  return { status: 'ignored', data: { symbol } };
};

// --- 2. Volume Analysis ---
export const evaluateVolume = (symbol: string, rawData: any): ProcessedInsight => {
  let data: VolumeDeliveryJson | null = null;
  
  // 1. Direct JSON match
  if (rawData && Array.isArray(rawData.volumes) && Array.isArray(rawData.delivery)) {
      data = rawData as VolumeDeliveryJson;
  } 
  // 2. Attribute Map
  else if (rawData && typeof rawData === 'object') {
       const potentialKeys = ['data-chart-options', 'data-piechartdata', 'data-promoterbarchart', 'data-mfbarchart', 'data-fiibarchart'];
       for (const key of potentialKeys) {
           if (rawData[key]) {
               try {
                   const parsed = typeof rawData[key] === 'string' ? JSON.parse(rawData[key]) : rawData[key];
                   if (parsed && Array.isArray(parsed.volumes) && Array.isArray(parsed.delivery)) {
                       data = parsed as VolumeDeliveryJson;
                       break;
                   }
               } catch(e) {}
           }
       }
  }

  if (!data) return { status: 'ignored', data: { symbol } };

  const dayVolume = data.volumes[0] || 0;
  const weekVolume = data.volumes[1] || 0;
  const dayDeliveryPct = data.delivery[0] ? data.delivery[0][1] : 0;
  const weekDeliveryPct = data.delivery[1] ? data.delivery[1][1] : 0;

  const insights: string[] = [];

  // Check Volume Spike
  if (weekVolume > 0) {
      const volDiffPercent = ((dayVolume - weekVolume) / weekVolume) * 100;
      if (dayVolume > weekVolume && volDiffPercent >= INDICATOR_THRESHOLDS.VOLUME_SPIKE_PERCENT) {
          insights.push(
              INSIGHT_TEXT_TEMPLATES.VOLUME_SPIKE
                  .replace('{symbol}', symbol)
                  .replace('{day}', (dayVolume / 100000).toFixed(2) + 'L')
                  .replace('{percent}', volDiffPercent.toFixed(0))
                  .replace('{period}', 'weekly')
          );
      }
  }

  // Check Delivery Accumulation
  if (weekDeliveryPct > 0) {
      const deliveryDiffPercent = ((dayDeliveryPct - weekDeliveryPct) / weekDeliveryPct) * 100;
      if (dayDeliveryPct > weekDeliveryPct && deliveryDiffPercent >= INDICATOR_THRESHOLDS.DELIVERY_INCREASE_PERCENT) {
          insights.push(
              INSIGHT_TEXT_TEMPLATES.DELIVERY_SPIKE
                  .replace('{symbol}', symbol)
                  .replace('{day}', dayDeliveryPct.toFixed(1))
                  .replace('{period}', 'weekly')
                  .replace('{avg}', weekDeliveryPct.toFixed(1))
          );
      }
  }

  if (insights.length > 0) {
      return {
          status: 'triggered',
          type: 'Technicals', 
          text: insights.join(" "),
          data: { symbol, dayVolume, dayDeliveryPct, weekVolume, weekDeliveryPct, raw: data }
      };
  }

  return { status: 'ignored', data: { symbol, raw: data } };
};

// --- 3. 52 Week Low Analysis ---
export const evaluate52WeekLow = (symbol: string, data: TechnicalJsonData): ProcessedInsight => {
  const params = data?.body?.parameters;
  const currentPrice = params?.current_price;
  
  const lowInsight = params?.price_insight?.find(i => i.param === "year_low");
  let yearLowValue = lowInsight ? lowInsight.value : 0;

  if (!yearLowValue && params?.price_analysis) {
      const oneYear = params.price_analysis.find(i => i.name === "1 Year");
      // @ts-ignore
      if (oneYear && oneYear.low) yearLowValue = oneYear.low;
  }

  if (!currentPrice || !yearLowValue) return { status: 'ignored', data: { symbol } };

  const distanceFromLowPercent = ((currentPrice - yearLowValue) / yearLowValue) * 100;
  
  if (distanceFromLowPercent <= INDICATOR_THRESHOLDS.LOW_52W_THRESHOLD && distanceFromLowPercent >= 0) {
    const text = INSIGHT_TEXT_TEMPLATES.NEAR_52W_LOW
      .replace('{symbol}', symbol)
      .replace('{percent}', distanceFromLowPercent.toFixed(1));
      
    return { status: 'triggered', type: 'Technicals', text, data: { symbol, currentPrice, yearLowValue } };
  }

  return { status: 'ignored', data: { symbol } };
};

// --- 4. Returns Analysis ---
export const evaluateReturns = (symbol: string, data: TechnicalJsonData): ProcessedInsight => {
  const analysis = data?.body?.parameters?.price_analysis;
  if (!analysis || !Array.isArray(analysis)) return { status: 'ignored', data: { symbol } };

  const getReturn = (period: string) => analysis.find(i => i.name === period);

  const r1y = getReturn("1 Year");
  const r2y = getReturn("2 Year") || getReturn("2 Years");
  const r5y = getReturn("5 Year") || getReturn("5 Years");

  const insights: string[] = [];

  if (r1y) {
    const val = r1y.changePercentSafe ?? r1y.changePercent;
    // Fix: check val != null to prevent crash on null.toFixed()
    if (val !== undefined && val !== null && val <= INDICATOR_THRESHOLDS.RETURN_1Y_MAX) {
       insights.push(INSIGHT_TEXT_TEMPLATES.LOW_RETURNS_1Y.replace('{symbol}', symbol).replace('{value}', val.toFixed(1)));
    }
  }

  if (r2y) {
    const val = r2y.changePercentSafe ?? r2y.changePercent;
    if (val !== undefined && val !== null && val <= INDICATOR_THRESHOLDS.RETURN_2Y_MAX) {
       insights.push(INSIGHT_TEXT_TEMPLATES.LOW_RETURNS_2Y
         .replace('{symbol}', symbol)
         .replace('{value}', val.toFixed(1))
         .replace('{threshold}', String(INDICATOR_THRESHOLDS.RETURN_2Y_MAX))
       );
    }
  }

  if (r5y) {
    const val = r5y.changePercentSafe ?? r5y.changePercent;
    if (val !== undefined && val !== null && val <= INDICATOR_THRESHOLDS.RETURN_5Y_MAX) {
       insights.push(INSIGHT_TEXT_TEMPLATES.LOW_RETURNS_5Y
         .replace('{symbol}', symbol)
         .replace('{value}', val.toFixed(1))
         .replace('{threshold}', String(INDICATOR_THRESHOLDS.RETURN_5Y_MAX))
       );
    }
  }

  if (insights.length > 0) {
    return {
      status: 'triggered',
      type: 'Performance',
      text: insights.join(" "),
      data: { symbol, analysis }
    };
  }

  return { status: 'ignored', data: { symbol } };
};

// --- 5. Technical Indicators (DMA) ---
export const evaluateDMA = (symbol: string, data: TechnicalJsonData): ProcessedInsight => {
  const params = data?.body?.parameters;
  if (!params) return { status: 'ignored', data: { symbol } };

  const currentPrice = params.current_price;
  const smas = params.sma_parameters;

  if (!currentPrice || !smas) return { status: 'ignored', data: { symbol } };

  const getSMA = (name: string) => smas.find(s => s.name === name);
  const sma50 = getSMA("50 Day");
  const sma200 = getSMA("200 Day");

  const insights: string[] = [];

  if (sma50 && currentPrice < sma50.value) {
    insights.push(INSIGHT_TEXT_TEMPLATES.TRADING_BELOW_DMA
        .replace('{symbol}', symbol)
        .replace('{period}', '50 DMA')
        .replace('{value}', sma50.value.toFixed(1))
    );
  }

  if (sma200 && currentPrice < sma200.value) {
    insights.push(INSIGHT_TEXT_TEMPLATES.TRADING_BELOW_DMA
        .replace('{symbol}', symbol)
        .replace('{period}', '200 DMA')
        .replace('{value}', sma200.value.toFixed(1))
    );
  }

  if (insights.length > 0) {
    return {
      status: 'triggered',
      type: 'Technicals',
      text: insights.join(" "),
      data: { symbol, currentPrice, sma50, sma200 }
    };
  }

  return { status: 'ignored', data: { symbol } };
};

// --- 6. Mutual Fund Holdings Analysis (Monthly) ---
export const evaluateMFHoldings = (symbol: string, data: MFShareChangeJson): ProcessedInsight => {
    if (!data || !data.charts) return { status: 'ignored', data: { symbol } };

    const shareholdingChart = data.charts.find(c => 
        c.heading.includes("Shareholding") || 
        c.chart_options.series_names.includes("MF share holdings")
    );

    if (!shareholdingChart || !shareholdingChart.chart_data || shareholdingChart.chart_data.length === 0) {
        return { status: 'ignored', data: { symbol } };
    }

    const totalHoldingsArr = shareholdingChart.chart_data[0];
    const dataLength = totalHoldingsArr.length;

    if (dataLength < 4) return { status: 'ignored', data: { symbol } };

    const currentHoldings = totalHoldingsArr[dataLength - 1];
    const threeMonthsAgoHoldings = totalHoldingsArr[dataLength - 4];

    if (currentHoldings > threeMonthsAgoHoldings) {
        const diff = currentHoldings - threeMonthsAgoHoldings;
        const percentChange = ((diff / threeMonthsAgoHoldings) * 100).toFixed(1);

        const text = INSIGHT_TEXT_TEMPLATES.MF_STAKE_INCREASE
            .replace('{symbol}', symbol)
            .replace('{diff}', (diff / 100000).toFixed(2) + "L")
            .replace('{percent}', percentChange);

        return {
            status: 'triggered',
            type: 'Holdings',
            text,
            data: { symbol, currentHoldings, threeMonthsAgoHoldings, diff, percentChange }
        };
    }

    return { status: 'ignored', data: { symbol } };
};

// --- 7. Quarterly Holdings Analysis ---
export const evaluateQuarterlyHoldings = (symbol: string, rawData: any): ProcessedInsight => {
    let data: QuarterlyHoldingsJson | null = null;
    
    if (rawData && typeof rawData === 'object') {
        const keys = ['data-promoterbarchart', 'data-mfbarchart', 'data-fiibarchart', 'data-diibarchart'];
        const parsedObj: any = {};
        let hasValidData = false;
        keys.forEach(key => {
            if (rawData[key]) {
                try {
                    const parsed = typeof rawData[key] === 'string' ? JSON.parse(rawData[key]) : rawData[key];
                    if (Array.isArray(parsed)) {
                        parsedObj[key] = parsed;
                        hasValidData = true;
                    }
                } catch(e) {}
            }
        });
        if (hasValidData) data = parsedObj;
    }

    if (!data) return { status: 'ignored', data: { symbol, raw: rawData } };

    const insights: string[] = [];

    const checkGrowth = (chartData: any[][] | undefined, entityName: string) => {
        if (!chartData || chartData.length < 4) return;
        const latestRow = chartData[1];
        const prev2Row = chartData[3];
        const latestVal = parseFloat(latestRow[1]);
        const prev2Val = parseFloat(prev2Row[1]);

        if (!isNaN(latestVal) && !isNaN(prev2Val)) {
            if (latestVal > prev2Val) {
                insights.push(
                    INSIGHT_TEXT_TEMPLATES.QUARTERLY_STAKE_RISE
                        .replace('{entity}', entityName)
                        .replace('{symbol}', symbol)
                        .replace('{current}', latestVal.toFixed(2))
                        .replace('{old}', prev2Val.toFixed(2))
                );
            }
        }
    };

    checkGrowth(data["data-mfbarchart"], "Mutual Funds");
    checkGrowth(data["data-fiibarchart"], "FIIs");
    checkGrowth(data["data-promoterbarchart"], "Promoters");
    checkGrowth(data["data-diibarchart"], "DIIs");

    if (insights.length > 0) {
        return {
            status: 'triggered',
            type: 'Holdings',
            text: insights.join("\n"),
            data: { symbol, insights }
        };
    }

    return { status: 'ignored', data: { symbol, raw: data } };
};

// --- 8. Price Trend Analysis ---
export const evaluatePriceTrend = (symbol: string, data: TechnicalJsonData): ProcessedInsight => {
    const analysis = data?.body?.parameters?.price_analysis;
    const currentPrice = data?.body?.parameters?.current_price;
    if (!analysis || !Array.isArray(analysis)) return { status: 'ignored', data: { symbol } };

    const thresholds: Record<string, number> = {
        "1 Month": 5,
        "6 Months": 10,
        "1 Year": 15
    };

    const insights: string[] = [];

    analysis.forEach(item => {
        if (thresholds[item.name]) {
            const threshold = thresholds[item.name];
            const changePct = item.changePercentSafe ?? item.changePercent;
            
            // Fix: check changePct != null
            if (changePct !== undefined && changePct !== null && Math.abs(changePct) >= threshold) {
                const direction = changePct > 0 ? "up" : "down";
                const low = item.low !== undefined && item.low !== null ? item.low : "N/A";
                const high = item.high !== undefined && item.high !== null ? item.high : "N/A";
                const inRange = (currentPrice && typeof low === 'number' && typeof high === 'number') 
                    ? (currentPrice >= low && currentPrice <= high) 
                    : true;

                if (inRange) {
                     insights.push(
                        INSIGHT_TEXT_TEMPLATES.PRICE_MOVEMENT_ALERT
                            .replace('{symbol}', symbol)
                            .replace('{direction}', direction)
                            .replace('{percent}', Math.abs(changePct).toFixed(1))
                            .replace('{period}', item.name)
                            .replace('{threshold}', String(threshold))
                            .replace('{low}', String(low))
                            .replace('{high}', String(high))
                    );
                }
            }
        }
    });

    if (insights.length > 0) {
        return {
            status: 'triggered',
            type: 'Performance',
            text: insights.join("\n"),
            data: { symbol, insights }
        };
    }

    return { status: 'ignored', data: { symbol } };
};

// --- 9. Deals Analysis ---
export const evaluateDeals = (symbol: string, indicatorType: string, data: any): ProcessedInsight => {
    const insights: string[] = [];
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    if (indicatorType === 'Bulk/Block Deals') {
        const d = data as BulkDealsJson;
        if (d.summary) {
            const dealDate = parseDealDate(d.summary);
            // Check if deal happened in current month and year (or recent)
            if (dealDate && dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear) {
                 insights.push(
                     INSIGHT_TEXT_TEMPLATES.RECENT_BULK_DEAL
                        .replace('{symbol}', symbol)
                        .replace('{details}', d.summary)
                 );
            }
        }
    } else if (indicatorType === 'Insider/SAST Deals') {
        const d = data as InsiderDealsJson;
        if (d.summaries && Array.isArray(d.summaries)) {
             d.summaries.forEach(summary => {
                 const dealDate = parseDealDate(summary);
                 if (dealDate && dealDate.getMonth() === currentMonth && dealDate.getFullYear() === currentYear) {
                      insights.push(
                          INSIGHT_TEXT_TEMPLATES.RECENT_INSIDER_DEAL
                            .replace('{symbol}', symbol)
                            .replace('{details}', summary)
                      );
                 }
             });
        }
    }

    if (insights.length > 0) {
        return {
            status: 'triggered',
            type: 'Deals',
            text: insights.join("\n"),
            data: { symbol, insights }
        };
    }

    return { status: 'ignored', data: { symbol } };
};


// --- Main Processor Entry Point ---
export const processIndicatorData = async (symbol: string, indicatorType: string, jsonData: any): Promise<ProcessedInsight> => {
  switch(indicatorType) {
    case 'PE':
    case 'DetailledPE': 
        return evaluateValuation(symbol, jsonData);
    
    // Process Volume/Delivery Analysis
    case 'VolumeAnalysis':
        const rawData = await fetchFromProxy(EXTRA_REQUEST[0].url.replace(/symbol/g, symbol), { attribute: EXTRA_REQUEST[0].attribute });
        return evaluateVolume(symbol, rawData);

    // Process MF Holdings Analysis (Monthly)
    case 'MFHoldings':
        return evaluateMFHoldings(symbol, jsonData);

    // Process Quarterly Holdings
    case 'Quaterly Holdings':
        const qData = await fetchFromProxy(EXTRA_REQUEST[1].url.replace(/symbol/g, symbol), { attribute: EXTRA_REQUEST[1].attribute });
        return evaluateQuarterlyHoldings(symbol, qData);
        
    case 'QuaterlyHoldings': // Mapping from API response name
         // If we get JSON directly
         return evaluateQuarterlyHoldings(symbol, jsonData);

    // Process Deals
    case 'Bulk/Block Deals':
    case 'Insider/SAST Deals':
        return evaluateDeals(symbol, indicatorType, jsonData);

    case 'Technical':
        const low52 = evaluate52WeekLow(symbol, jsonData);
        const returns = evaluateReturns(symbol, jsonData);
        const dma = evaluateDMA(symbol, jsonData);
        const priceTrends = evaluatePriceTrend(symbol, jsonData);

        const texts = [low52.text, returns.text, dma.text, priceTrends.text].filter(Boolean);
        
        // Prioritize returning Technical type if triggered
        if (low52.status === 'triggered' || dma.status === 'triggered') {
             return {
                 status: 'triggered',
                 type: 'Technicals',
                 text: texts.join("\n"),
                 data: { symbol }
             };
        } else if (returns.status === 'triggered' || priceTrends.status === 'triggered') {
             return {
                 status: 'triggered',
                 type: 'Performance',
                 text: texts.join("\n"),
                 data: { symbol }
             };
        }
        
        return { status: 'ignored', data: { symbol } };
        
    default:
        return { status: 'ignored', data: { symbol } };
  }
};
