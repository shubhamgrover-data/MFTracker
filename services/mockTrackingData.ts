
import { TrackedEntity, Insight } from '../types/trackingTypes';

export const MOCK_ENTITIES: TrackedEntity[] = [
  { id: '1', name: 'HDFC Bank', symbol: 'HDFCBANK', type: 'STOCK' },
  { id: '2', name: 'Reliance Industries', symbol: 'RELIANCE', type: 'STOCK' },
  { id: '3', name: 'Tata Motors', symbol: 'TATAMOTORS', type: 'STOCK' },
  { id: '4', name: 'SBI Bluechip Fund', symbol: 'SBI-BLUE', type: 'MF' },
  { id: '5', name: 'Parag Parikh Flexi Cap', symbol: 'PPFAS', type: 'MF' },
  { id: '6', name: 'Nippon India Small Cap', symbol: 'NIPPON', type: 'MF' },
];

export const MOCK_INSIGHTS: Insight[] = [
  {
    id: '101',
    entityId: '1',
    title: 'HDFC Bank Q3 Results Exceed Expectations',
    content: 'Net profit rose by 19% YoY driven by strong loan growth and stable asset quality. Analysts maintain a buy rating.',
    date: '2023-11-24T10:00:00Z',
    sentiment: 'POSITIVE',
    source: 'MarketWire'
  },
  {
    id: '102',
    entityId: '1',
    title: 'FIIs reduce stake in Banking Sector',
    content: 'Recent data shows a slight sell-off by Foreign Institutional Investors in the banking sector, affecting HDFC Bank slightly.',
    date: '2023-11-23T14:30:00Z',
    sentiment: 'NEGATIVE',
    source: 'Trendlyne'
  },
  {
    id: '103',
    entityId: '2',
    title: 'Reliance Retail expansion plans announced',
    content: 'The conglomerate plans to open 500 new stores in Tier 2 cities next quarter, signaling robust retail demand.',
    date: '2023-11-22T09:15:00Z',
    sentiment: 'POSITIVE',
    source: 'Business Today'
  },
  {
    id: '104',
    entityId: '4',
    title: 'SBI Bluechip Fund increases allocation in IT',
    content: 'The fund manager has increased weightage in large-cap IT stocks, betting on a sector turnaround.',
    date: '2023-11-20T11:00:00Z',
    sentiment: 'NEUTRAL',
    source: 'FundFlow Analytics'
  },
  {
    id: '105',
    entityId: '5',
    title: 'PPFAS reduces cash holdings',
    content: 'Parag Parikh Flexi Cap has deployed significant cash reserves into overseas equity markets following valuation corrections.',
    date: '2023-11-19T16:45:00Z',
    sentiment: 'POSITIVE',
    source: 'Value Research'
  },
  {
    id: '106',
    entityId: '3',
    title: 'Supply chain issues impact Tata Motors',
    content: 'Global semiconductor shortages continue to plague JLR division, potentially impacting production targets for Q4.',
    date: '2023-11-24T08:00:00Z',
    sentiment: 'NEGATIVE',
    source: 'AutoCar Professional'
  },
  {
    id: '107',
    entityId: '6',
    title: 'Small Cap volatility warning',
    content: 'Fund managers advise caution in the small-cap space due to overheated valuations. SIP route recommended.',
    date: '2023-11-21T13:20:00Z',
    sentiment: 'NEUTRAL',
    source: 'Mint'
  }
];

export const getInsights = (entityId: string | 'ALL', typeFilter: 'ALL' | 'STOCK' | 'MF', query: string) => {
  let filtered = MOCK_INSIGHTS;

  // Filter by specific Entity ID
  if (entityId !== 'ALL') {
    filtered = filtered.filter(i => i.entityId === entityId);
  } 
  // Or Filter by Type if no specific entity selected
  else if (typeFilter !== 'ALL') {
    const validIds = MOCK_ENTITIES.filter(e => e.type === typeFilter).map(e => e.id);
    filtered = filtered.filter(i => validIds.includes(i.entityId));
  }

  // Filter by Search Query
  if (query) {
    const lowerQ = query.toLowerCase();
    filtered = filtered.filter(i => 
      i.title.toLowerCase().includes(lowerQ) || 
      i.content.toLowerCase().includes(lowerQ)
    );
  }

  // Enrich with Entity Data
  return filtered.map(item => {
    const entity = MOCK_ENTITIES.find(e => e.id === item.entityId);
    return { ...item, entityName: entity?.name || 'Unknown', entitySymbol: entity?.symbol };
  }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
