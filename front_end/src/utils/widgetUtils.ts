import { NativeModules, Platform } from 'react-native';
import type { IpoData } from '../features/ipo/types/ipo.types';

const { WidgetModule } = NativeModules;

interface WidgetTableData {
  row1_name?: string;
  row1_dday?: string;
  row1_price?: string;
  row1_securities?: string;
  row2_name?: string;
  row2_dday?: string;
  row2_price?: string;
  row2_securities?: string;
  row3_name?: string;
  row3_dday?: string;
  row3_price?: string;
  row3_securities?: string;
}

/**
 * 날짜로부터 디데이 계산
 */
const calculateDday = (dateString?: string): string => {
  if (!dateString) return '-';

  try {
    const targetDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) return `D-${diffDays}`;
    if (diffDays === 0) return 'D-Day';
    return `D+${Math.abs(diffDays)}`;
  } catch {
    return '-';
  }
};

/**
 * 증권사 배열을 콤마로 구분된 문자열로 변환
 */
const formatSecurities = (securities?: string[]): string => {
  if (!securities || securities.length === 0) return '-';
  return securities.join(', ');
};

/**
 * 위젯 데이터 업데이트
 */
export const updateWidget = async (data: WidgetTableData): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    console.log('Widget is only supported on Android');
    return false;
  }

  try {
    await WidgetModule.updateWidgetData(data);
    return true;
  } catch (error) {
    console.error('Widget update error:', error);
    return false;
  }
};

/**
 * 위젯 데이터 조회
 * @returns 위젯 데이터 또는 null
 */
export const getWidgetData = async (): Promise<WidgetTableData | null> => {
  if (Platform.OS !== 'android') {
    return null;
  }

  try {
    return await WidgetModule.getWidgetData();
  } catch (error) {
    console.error('Widget get data error:', error);
    return null;
  }
};

/**
 * IPO 데이터를 위젯에 업데이트
 * @param ipoData IPO 데이터
 * @returns 업데이트 성공 여부
 */
export const updateWidgetWithIpoData = async (
  ipoData: IpoData | IpoData[]
): Promise<boolean> => {
  if (Platform.OS !== 'android') {
    return false;
  }

  try {
    const dataArray = Array.isArray(ipoData) ? ipoData : [ipoData];

    if (dataArray.length === 0) {
      return await updateWidget({
        row1_name: '오늘 공모주가 없습니다',
        row1_dday: '-',
        row1_price: '-',
        row1_securities: '-',
        row2_name: '데이터 없음',
        row2_dday: '-',
        row2_price: '-',
        row2_securities: '-',
        row3_name: '데이터 없음',
        row3_dday: '-',
        row3_price: '-',
        row3_securities: '-',
      });
    }

    // 첫 번째 행 데이터
    const firstIpo = dataArray[0];
    const widgetData: WidgetTableData = {
      row1_name: firstIpo.company,
      row1_dday: calculateDday(firstIpo.listingdate),
      row1_price: firstIpo.confirmedprice || '-',
      row1_securities: formatSecurities(firstIpo.bank),
    };

    // 두 번째 행 데이터 (있는 경우)
    if (dataArray.length > 1) {
      const secondIpo = dataArray[1];
      widgetData.row2_name = secondIpo.company;
      widgetData.row2_dday = calculateDday(secondIpo.listingdate);
      widgetData.row2_price = secondIpo.confirmedprice || '-';
      widgetData.row2_securities = formatSecurities(secondIpo.bank);
    } else {
      widgetData.row2_name = '데이터 없음';
      widgetData.row2_dday = '-';
      widgetData.row2_price = '-';
      widgetData.row2_securities = '-';
    }

    // 세 번째 행 데이터 (있는 경우)
    if (dataArray.length > 2) {
      const thirdIpo = dataArray[2];
      widgetData.row3_name = thirdIpo.company;
      widgetData.row3_dday = calculateDday(thirdIpo.listingdate);
      widgetData.row3_price = thirdIpo.confirmedprice || '-';
      widgetData.row3_securities = formatSecurities(thirdIpo.bank);
    } else {
      widgetData.row3_name = '데이터 없음';
      widgetData.row3_dday = '-';
      widgetData.row3_price = '-';
      widgetData.row3_securities = '-';
    }

    return await updateWidget(widgetData);
  } catch (error) {
    console.error('Widget update with IPO data error:', error);
    return false;
  }
};
