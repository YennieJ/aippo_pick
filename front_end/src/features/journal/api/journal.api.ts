import { api } from '../../../shared/api/client';
import { getAccessToken } from '../../auth/storage/token.storage';
import type {
  JournalRecordListItem,
  JournalRecordWriteBody,
  JournalStockMaster,
  JournalYearSummary,
} from '../types/journal.types';

type ApiYearSummary = { year: number; count: number; totalProfit: number };

type ApiRecord = {
  id: number;
  company_name: string;
  code_id: string;
  buy_price: number;
  quantity: number;
  sell_price: number;
  sell_date: string; // "YYYY-MM-DD"
  commission_price: number;
  tax_price: number;
  profit: number;
  profit_rate: number;
  memo: string; // 문서: null이면 ""로 내려옴
  listing_date: string;
};

type ApiWriteResponse = { message: string; id: number };
type ApiDeleteResponse = { message: string };

const BASE_PATH = '/ipo-trade-journals';

type ApiSearchIpoItem = {
  company: string;
  code_id: string;
  confirmedprice: string; // 확정공모가
  listingdate: string;
  isAlreadyAdded: boolean;
};

function toDomainYearSummary(r: ApiYearSummary): JournalYearSummary {
  return { 연도: r.year, 종목수: r.count, 손익합계: r.totalProfit };
}

function toDomainRecord(r: ApiRecord): JournalRecordListItem {
  return {
    id: r.id,
    종목명: r.company_name,
    종목코드: r.code_id,
    확정공모가: r.buy_price,
    수량: r.quantity,
    매도가: r.sell_price,
    매도일: r.sell_date,
    수수료: r.commission_price ?? 0,
    제세금: r.tax_price ?? 0,
    메모: r.memo ?? '',
    손익금: r.profit,
    수익률: r.profit_rate,
    상장일: r.listing_date,
  };
}

function toApiWriteBody(body: JournalRecordWriteBody) {
  return {
    company_name: body.종목명,
    code_id: body.종목코드,
    buy_price: body.확정공모가,
    quantity: body.수량,
    sell_price: body.매도가,
    sell_date: body.매도일,
    commission_price: body.수수료,
    tax_price: body.제세금,
    profit: body.손익금,
    profit_rate: body.수익률,
    memo: body.메모,
    listing_date: body.상장일,
  };
}

async function authHeader() {
  const token = await getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : undefined;
}

function toDomainStockMaster(i: ApiSearchIpoItem): JournalStockMaster | null {
  // 문서 최신 스펙: confirmedprice 없는 종목은 서버에서 제외
  const raw = (i.confirmedprice ?? '').trim();
  if (!raw) return null; // 그래도 방어
  // 서버가 "14000"을 준다고 문서에 적혀 있어도,
  // 실제 데이터 소스에서 "14,000" / "14000원" 같이 섞여 들어오는 케이스가 있어 방어한다.
  const digits = raw.replace(/[^\d]/g, '');
  if (!digits) return null;
  const price = Number(digits);
  if (!Number.isFinite(price) || price <= 0) return null;

  return {
    종목명: i.company,
    종목코드: i.code_id ?? '',
    확정공모가: price,
    상장일: i.listingdate.trim(),
    이미등록됨: !!i.isAlreadyAdded,
  };
}

export async function fetchJournalYears(): Promise<JournalYearSummary[]> {
  const headers = await authHeader();
  const res = await api.get<ApiYearSummary[]>(`${BASE_PATH}/years`, {
    headers,
  });
  return res.data.map(toDomainYearSummary);
}

export async function fetchJournalRecordsByYear(
  year: number,
): Promise<JournalRecordListItem[]> {
  const headers = await authHeader();
  const res = await api.get<ApiRecord[]>(BASE_PATH, {
    params: { year },
    headers,
  });
  return res.data.map(toDomainRecord);
}

export async function createJournalRecord(
  body: JournalRecordWriteBody,
): Promise<ApiWriteResponse> {
  const headers = await authHeader();
  const payload = toApiWriteBody(body);
  try {
    const res = await api.post<ApiWriteResponse>(BASE_PATH, payload, {
      headers,
    });
    return res.data;
  } catch (e) {
    if (__DEV__) {
      const anyErr = e as any;
      console.log('[journal][POST /ipo-trade-journals] error', {
        status: anyErr?.response?.status,
        url: anyErr?.config?.url,
        baseURL: anyErr?.config?.baseURL,
        payload,
        response: anyErr?.response?.data,
      });
    }
    throw e;
  }
}

export async function updateJournalRecord(
  id: number,
  body: JournalRecordWriteBody,
): Promise<ApiWriteResponse> {
  const headers = await authHeader();
  // 문서: PUT이지만 부분 업데이트(merge) — 보내는 필드만 반영
  const res = await api.put<ApiWriteResponse>(
    `${BASE_PATH}/${id}`,
    toApiWriteBody(body),
    { headers },
  );
  return res.data;
}

export async function deleteJournalRecord(
  id: number,
): Promise<ApiDeleteResponse> {
  const headers = await authHeader();
  const res = await api.delete<ApiDeleteResponse>(`${BASE_PATH}/${id}`, {
    headers,
  });
  return res.data;
}

export async function searchIpoStocks(params: { keyword?: string }): Promise<{
  items: JournalStockMaster[];
}> {
  const headers = await authHeader();
  const keyword = params.keyword?.trim() || undefined;

  const res = await api.get<ApiSearchIpoItem[]>(`${BASE_PATH}/search-ipo`, {
    params: {
      keyword,
    },
    headers,
  });

  const mapped = res.data
    .map(toDomainStockMaster)
    .filter((x): x is JournalStockMaster => x != null);

  return {
    items: mapped,
  };
}
