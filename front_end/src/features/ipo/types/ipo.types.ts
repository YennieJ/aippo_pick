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

// 상세 API 응답 타입
export interface IpoDetailData {
  company: string;
  code_id: string;
  competitionrate?: string;
  infourl?: string;
  underwriter?: string;
  totalnumber?: string;
  desiredprice?: string;
  confirmedprice?: string;
  subscriptiondate?: string;
  refunddate?: string;
  listingdate?: string;
  forecastdate?: string;
  mandatoryretention?: string;
  fluctuation_rate?: string;
  open_price?: string;
  open_ratio?: string;
  firstday_close?: string;
  exchange?: string;
  company_info?: string;
  industry?: string;
  listed_shares?: string;
  circulation_ratio?: string;
  institutional_competition_rate?: string;
  equal_allocation_shares?: string;
  price?: string;
  market_cap?: string;
  price_updatetime?: string;
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

export interface IpoScoreData {
  company: string;
  code_id: string;
  total_score: string;
  demand_score: string;
  market_score: string;
  value_score: string;
  inst_competition_score: string;
  retention_score: string;
  circulation_score: string;
  market_temp_score: string;
  theme_score: string;
  ipo_return_score: string;
  stability_score: string;
  band_score: string;
  confirmedprice: string;
  firstday_close: string;
  ai_adjusted_yn: boolean;
  listingdate: string;
  ai_report: string | null;
  ai_webtoon: string;
}
