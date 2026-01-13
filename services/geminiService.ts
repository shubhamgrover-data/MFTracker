import { GoogleGenAI, Type } from "@google/genai";
import { StockPriceData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
      model: 'gemini-3-flash-preview',
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
    console.log("Gemini live price from html:",text);
    if (!text) return null;
    return JSON.parse(text) as StockPriceData;

  } catch (error) {
    console.error("Gemini HTML Parsing Error:", error);
    return null;
  }
};

export const searchFunds = async (query: string): Promise<Array<{ name: string; type: string }>> => {
  try {
    const prompt = `Identify up to 5 Indian Mutual Funds that match the search query "${query}". 
    Return the result as a strictly formatted JSON array of objects, where each object has "name" (e.g., SBI Bluechip Fund) and "type" (e.g., Large Cap).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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