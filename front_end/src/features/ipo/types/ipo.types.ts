export interface IpoData {
  id: string;
  status: string;
  title: string;
  company: string;
  bank: string[];
  subscriptiondate?: string;
  listingdate?: string;
  refunddate?: string;
  date: string;
  confirmedprice?: string;
  desiredprice?: string;
  code_id: string;
}

export interface BrokerRanking {
  rank: number;
  broker: string;
  count: number;
  avg_return_rate: number;
  max_return_rate: number;
  min_return_rate: number;
  minus_count: number;
}

export interface BrokerRankingResponse {
  topByCount: BrokerRanking[];
  topByAvg: BrokerRanking[];
  topByMax: BrokerRanking[];
}

export type RankingType = 'topByCount' | 'topByAvg' | 'topByMax';
