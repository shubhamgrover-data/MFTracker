
// JSON formats
export const JSONFORMAT = [
  {
    id: "stock_indicator_tiles",
    format: `{
      tiles: [
        {
          title: "",
          label: "",
          value: "",
          message: ""
        }
      ]
    }`
  },
  {
    id: "mf_share_change",
    format: `{
      title: "",
      summary: "",
      charts: [
        {
          heading: "",
          chart_options: {},
          chart_data: []
        }
      ],
      insights: [
        {
          type: "",
          message: ""
        }
      ]
    }`
  },
  {
    id: "simple_insights",
    format: `{
      insights: [
        {
          type: "",
          message: ""
        }
      ]
    }`
  },
  {
    id: "bulk_block_deals",
    format: `{
      title: "",
      summary: "",
      description: ""
    }`
  },
  {
    id: "insider_trading",
    format: `{
      title: "",
      summaries: [],
      description: "",
      table: {
        id: "",
        class: ""
      }
    }
  }`
];


// Prompts (each refers to its JSON format by id)
export const PROMPTS = [
  {
    id: "stock_indicator_tiles",
    prompt: `
You are an HTML data extraction engine.
Extract all tiles with class "stock-indicator-tile" and return the result in the JSON format below:".

${JSONFORMAT[0].format}

Rules:
- title -> data-title attribute
- label -> text inside <p class="tile-data">
- value -> text inside <div class="value">
- message -> text inside <p class="tile-msg"> if present
- Omit message if not present
- Output only valid JSON, no extra text.
`
  },
  {
    id: "mf_share_change",
    prompt: `
You are an HTML data extraction engine.
Extract all information and return the result in the JSON format below:".

${JSONFORMAT[1].format}

Rules:
- title -> <h1>
- summary -> <h2>
- charts -> each .tl_stacked_chart
  - heading -> previous <p> header
  - chart_options & chart_data -> parse from data-chartdata
- insights -> elements with class positive/negative Msg
- Output only valid JSON, no extra text.
`
  },
  {
    id: "simple_insights",
    prompt: `
You are an HTML data extraction engine.
Extract all messages and return the result in the JSON format below:".

${JSONFORMAT[2].format}

Rules:
- type -> class name (positive/negative/neutral)
- message -> <h3> text
- Output only valid JSON, no extra text.
`
  },
  {
    id: "bulk_block_deals",
    prompt: `
You are an HTML data extraction engine.
Extract all information and  return the result in the JSON format below:".

${JSONFORMAT[3].format}

Rules:
- title -> <h1>
- summary -> <h2> (including nested spans)
- description -> <h4>
- Output only valid JSON, no extra text.
`
  },
  {
    id: "insider_trading",
    prompt: `
You are an HTML data extraction engine.
Extract all information and  return the result in the JSON format below:".

${JSONFORMAT[4].format}

Rules:
- title -> <h1 class="page-title">
- summaries -> all <h2 class="page-description">
- description -> <h4 class="page-description">
- table.class -> <table> class attribute
- table.id -> "insider_trading_table"
- Output only valid JSON, no extra text.
`
  }
];

// Thresholds for Indicator Logic
export const INDICATOR_THRESHOLDS = {
  // Valuation
  PE_DISCOUNT_PERCENT: 10, // Check if Current PE is 10% lower than Average
  
  // Volume
  VOLUME_SPIKE_PERCENT: 60, // Check if Day Vol is 60% higher than average
  DELIVERY_INCREASE_PERCENT: 20, // Check if Delivery % is 20% higher than average
  
  // Price Action
  LOW_52W_THRESHOLD: 10, // Check if price is within 10% of 52W Low
  
  // Returns (Underperformance checks)
  RETURN_1Y_MAX: 5,   // If 1Y return <= 5%
  RETURN_2Y_MAX: 10,  // If 2Y return <= 10%
  RETURN_5Y_MAX: 20   // If 5Y return <= 20%
};

// Insight Text Templates
export const INSIGHT_TEXT_TEMPLATES = {
  VALUATION_ATTRACTIVE: "{symbol} is trading at an attractive valuation. Current PE ({current}) is {diff}% below the historical average ({average}).",
  VOLUME_SPIKE: "High buying interest detected for {symbol}. Daily volume ({day}) is {percent}% higher than the {period} average.",
  DELIVERY_SPIKE: "Strong accumulation in {symbol}. Delivery percentage ({day}%) is higher than the {period} average ({avg}%).",
  NEAR_52W_LOW: "{symbol} is trading near support levels, currently {percent}% from its 52-week low.",
  LOW_RETURNS_1Y: "{symbol} has underperformed with only {value}% returns over the last 1 year.",
  LOW_RETURNS_2Y: "Long-term consolidation detected in {symbol}. 2-year returns are {value}%, below the {threshold}% threshold.",
  LOW_RETURNS_5Y: "Significant long-term underperformance for {symbol}. 5-year returns are {value}%, below the {threshold}% threshold.",
  TRADING_BELOW_DMA: "Bearish Trend: {symbol} is trading below its {period} ({value}).",
  TRADING_ABOVE_DMA: "Bullish Trend: {symbol} is trading above its {period} ({value}).",
  MF_STAKE_INCREASE: "Institutional Accumulation: Mutual Funds have increased their stake in {symbol} by {diff} shares ({percent}%) over the last 3 months.",
  QUARTERLY_STAKE_RISE: "Rising Stake: {entity} have increased their shareholding in {symbol} to {current}% from {old}% over the last 2 quarters.",
  PRICE_MOVEMENT_ALERT: "Significant Price Action: {symbol} is {direction} {percent}% in the last {period}, crossing the {threshold}% threshold. It is currently trading in the {period} range of {low} - {high}.",
  RECENT_BULK_DEAL: "Big Money Movement: Recent bulk/block deal detected for {symbol} this month. {details}",
  RECENT_INSIDER_DEAL: "Insider Action: Recent insider trading activity reported for {symbol} this month. {details}"
};

// Market Overview Configuration, changed to see relevant info
export const MARKET_OVERVIEW_INDICES = [
  "NIFTY 50", 
  "NIFTY NEXT 50", 
  "NIFTY MIDCAP 150", 
  "NIFTY SMALLCAP 250",
  "NIFTY 500", 
  "NIFTY TOTAL MARKET"
  //"INDIA VIX" no need removed intentionally
];

export const HEADER_INDICES = [
  "NIFTY 50",
  "NIFTY BANK"
];
