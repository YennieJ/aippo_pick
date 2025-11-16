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
