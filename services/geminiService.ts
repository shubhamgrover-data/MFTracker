
import { GoogleGenAI, Type } from "@google/genai";
import { StockPriceData } from "../types";
import { Insight } from "../types/trackingTypes";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const GEMINI_MODEL_NAME = "gemini-2.5-flash-lite";

// New function to parse HTML for Stock Data
export const extractStockDataFromHtml = async (html: string): Promise<StockPriceData | null> => {
  try {
    const prompt = `
      Analyze the following HTML content which contains stock market data from a financial website.
      Extract the following information and return it strictly as a JSON object.
      
      Fields required:
      - "current_price": The current trading price (e.g., "1,234.50").
      - "last_updated": The time/date it was last updated (e.g., "Nov 24, 4:00 PM").
      - "todays_change_direction": "up" if the price increased, "down" if decreased, or "neutral".
      - "todays_change_number": The absolute value change (e.g., "12.50").
      - "todays_change_percentage": The percentage change (e.g., "1.2%").
      - "volume": The trading volume.

      HTML Content:
      ${html}
    `;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            current_price: { type: Type.STRING },
            last_updated: { type: Type.STRING },
            todays_change_direction: { type: Type.STRING },
            todays_change_number: { type: Type.STRING },
            todays_change_percentage: { type: Type.STRING },
            volume: { type: Type.STRING }
          },
          required: ['current_price', 'last_updated', 'todays_change_direction', 'todays_change_number', 'todays_change_percentage', 'volume']
        }
      },
    });

    const text = response.text;
    if (!text) return null;
    return JSON.parse(text) as StockPriceData;

  } catch (error: any) {
    if (error.message?.includes('429') || error.status === 'RESOURCE_EXHAUSTED') {
        console.warn("Gemini Quota Exceeded for Stock Price. Returning null.");
    } else {
        console.error("Gemini HTML Parsing Error:", error);
    }
    return null;
  }
};

export const searchFunds = async (query: string): Promise<Array<{ name: string; type: string }>> => {
  try {
    const prompt = `Identify up to 5 Indian Mutual Funds that match the search query "${query}". 
    Return the result as a strictly formatted JSON array of objects, where each object has "name" (e.g., SBI Bluechip Fund) and "type" (e.g., Large Cap).`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              type: { type: Type.STRING },
            },
            required: ['name', 'type'],
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Fund Search Error:", error);
    return [];
  }
};

export const fetchMarketInsights = async (entities: { id: string, name: string }[]): Promise<Insight[]> => {
  if (entities.length === 0) return [];

  try {
    const names = entities.map(e => e.name).join(", ");
    const prompt = `
      You are a senior financial analyst. Generate 10 high-quality, actionable market insights or news summaries specifically for the following Indian entities: ${names}.
      
      Guidelines:
      1. Focus on recent quarterly results, major announcements, sector trends (e.g., IT slowdown, Banking liquidity), or regulatory changes.
      2. If specific recent news is unavailable for a specific entity, provide an intelligent analysis of its sector's current outlook that would affect it.
      3. Do NOT invent specific numbers or fake dates. Use general accurate trends if exact recent data is missing.
      4. Sentiment should reflect the likely market reaction.
      5. Provide the URL of the source from where you got the info. 
      
      Return a JSON array where each object has:
      - title: Headline string (professional style).
      - content: concise summary (max 40 words).
      - sentiment: 'POSITIVE', 'NEGATIVE', or 'NEUTRAL'.
      - entityId: The ID of the entity this insight relates to (choose from: ${entities.map(e => e.id).join(', ')}).
      - source: A plausible source name (e.g., "MoneyControl", "Economic Times", "LiveMint", "CNBC-TV18").
      - sourceUrl: Provide a specific real URL if you know one, otherwise return an empty string.
      - date: ISO date string (use today's date).
    `;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              sentiment: { type: Type.STRING },
              entityId: { type: Type.STRING },
              source: { type: Type.STRING },
              sourceUrl: { type: Type.STRING },
              date: { type: Type.STRING }
            },
            required: ['title', 'content', 'sentiment', 'entityId', 'source', 'date']
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    
    const rawInsights = JSON.parse(text);
    return rawInsights.map((insight: any, index: number) => ({
      ...insight,
      id: `gen-${Date.now()}-${index}`,
      sourceUrl: insight.sourceUrl || `https://www.google.com/search?q=${encodeURIComponent(insight.title + ' ' + insight.source)}`
    }));

  } catch (error) {
    console.error("Gemini Insight Generation Error:", error);
    return [];
  }
};

// --- Manual Parsers to avoid Gemini Quota Exhaustion ---

const parsePE = (doc: Document) => {
  const tiles = Array.from(doc.querySelectorAll('.stock-indicator-tile')).map(el => ({
    title: el.getAttribute('data-title') || '',
    label: el.querySelector('.tile-data')?.textContent?.trim() || '',
    value: el.querySelector('.value')?.textContent?.trim() || '',
    message: el.querySelector('.tile-msg')?.textContent?.trim() || ''
  }));
  return { tiles };
};

const parseMFHoldings = (doc: Document) => {
   const title = doc.querySelector('h1')?.textContent?.trim() || '';
   const summary = doc.querySelector('h2')?.textContent?.trim() || '';
   const charts = Array.from(doc.querySelectorAll('.tl_stacked_chart')).map(el => {
       // Find preceding P tag which often contains the heading
       let heading = '';
       let prev = el.previousElementSibling;
       while(prev) {
           if(prev.tagName === 'P') { heading = prev.textContent?.trim() || ''; break; }
           prev = prev.previousElementSibling;
       }
       const chartDataAttr = el.getAttribute('data-chartdata');
       let chart_data_obj = {};
       try { 
           if(chartDataAttr) {
                const parsed = JSON.parse(chartDataAttr);
                // Flatten the structure if needed
                chart_data_obj = parsed;
           }
       } catch(e){}
       
       return {
           heading,
           ...chart_data_obj // Spread chart_options and chart_data arrays to top level of this object
       };
   });

   // Improved selector for insights to handle multi-class scenarios (e.g. "positive Msg")
   const insights = Array.from(doc.querySelectorAll('.positiveMsg, .negativeMsg, .positive.Msg, .negative.Msg')).map(el => {
       let type = 'neutral';
       if (el.classList.contains('positive') || el.classList.contains('positiveMsg')) type = 'positive';
       if (el.classList.contains('negative') || el.classList.contains('negativeMsg')) type = 'negative';
       
       return {
           type,
           message: el.querySelector('h3')?.textContent?.trim() || el.textContent?.trim() || ''
       };
   });
   
   return { title, summary, charts, insights };
};

const parseQuarterlyHoldings = (doc: Document) => {
    const insights: any[] = [];
    // Try to find list items with positive/negative classes
    const items = doc.querySelectorAll('.list-group-item');
    
    const extractFromEl = (el: Element) => {
        let type = 'neutral';
        if (el.classList.contains('positive') || el.classList.contains('positiveMsg')) type = 'positive';
        if (el.classList.contains('negative') || el.classList.contains('negativeMsg')) type = 'negative';
        
        const message = el.querySelector('h3')?.textContent?.trim() || el.textContent?.trim() || '';
        if (message) insights.push({ type, message });
    };

    if (items.length > 0) {
        items.forEach(extractFromEl);
    } else {
        // Fallback: look for direct elements if list structure differs
        const directItems = doc.querySelectorAll('.positive, .negative, .neutral, .positiveMsg, .negativeMsg');
        directItems.forEach(extractFromEl);
    }
    return { insights };
};

const parseDeals = (doc: Document) => {
    return {
        title: doc.querySelector('h1')?.textContent?.trim() || '',
        summary: doc.querySelector('h2')?.textContent?.trim() || '',
        description: doc.querySelector('h4')?.textContent?.trim() || ''
    };
};

const parseInsiderDeals = (doc: Document) => {
    const summaries = Array.from(doc.querySelectorAll('h2.page-description')).map(e => e.textContent?.trim() || '');
    return {
        title: doc.querySelector('h1.page-title')?.textContent?.trim() || doc.querySelector('h1')?.textContent?.trim() || '',
        summaries,
        description: doc.querySelector('h4.page-description')?.textContent?.trim() || doc.querySelector('h4')?.textContent?.trim() || ''
    };
};


export const processRawInsightData = async (rawContent: string, instruction: string, indicator: string): Promise<string> => {
  try {
    // Client-side DOM parsing to replace Gemini API calls
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawContent, 'text/html');

    let result = null;

    if (indicator === 'PE') result = parsePE(doc);
    else if (indicator === 'MFHoldings') result = parseMFHoldings(doc);
    else if (indicator === 'QuaterlyHoldings') result = parseQuarterlyHoldings(doc);
    else if (indicator === 'Bulk/Block Deals') result = parseDeals(doc);
    else if (indicator === 'Insider/SAST Deals') result = parseInsiderDeals(doc);

    if (result) {
        return JSON.stringify(result);
    }

    // Fallback if no parser matched (should not happen for tracked indicators)
    return JSON.stringify({ error: "Parsing strategy not defined" });

  } catch (error) {
    console.error(`Error processing ${indicator}:`, error);
    return JSON.stringify({ error: "Processing failed" });
  }
};

// --- Chat Capability ---

export const getChatResponse = async (history: {role: string, parts: {text: string}[]}[], message: string) => {
    try {
        const chat = ai.chats.create({
            model: GEMINI_MODEL_NAME,
            history: history,
            config: {
                // Enforce formatting instructions here
                systemInstruction: "You are a senior financial assistant. Answer questions based on provided data context. \n\nIMPORTANT FORMATTING RULES:\n1. Use bullet points for lists.\n2. Use **bold** for key metrics or headers.\n3. Keep paragraphs short and readable.\n4. If data is missing, clearly state it."
            }
        });

        const result = await chat.sendMessage({ message });
        return result.text;
    } catch (e) {
        console.error("Chat error", e);
        return "I'm having trouble connecting to the analysis engine right now (Quota Exceeded).";
    }
}
