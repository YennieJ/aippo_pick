import { api } from '../../../shared/api/client';

export const getTodayIpo = async () => {
  const response = await api.get('/data_ipo/today');
  return response.data;
};

export const getIpoCalendar = async (startDate: string, endDate: string) => {
  // 날짜 형식 yyyy.mm.dd
  const response = await api.get(`/data_ipo/range/${startDate}/${endDate}`);
  return response.data;
};

export const getBrokerRanking = async (startDate: string, endDate: string) => {
  // 날짜 형식 yyyy.mm.dd
  const response = await api.get(
    `/data_ipo/broker/ranking/${startDate}/${endDate}`
  );
  return response.data;
};

export const getAllBrokers = async () => {
  const response = await api.get('/master_broker/all');
  return response.data;
};

export const getIpoByCodeId = async (codeId: string) => {
  // 코드 ID로 IPO 상세 정보 조회
  const response = await api.get(`/data_ipo/code/${codeId}`);
  return response.data;
};
