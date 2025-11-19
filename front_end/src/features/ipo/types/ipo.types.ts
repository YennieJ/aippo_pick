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
