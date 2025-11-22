// src/features/storage/recentStorage.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

// 🔑 최근 본 공모주 ID 리스트를 저장할 때 사용하는 키
const RECENT_KEY = 'recent_ipo';

// 👀 최근 본 공모주는 너무 길어지면 UX가 나빠질 수 있어서
//    최대 개수를 10개로 제한 (가장 최근 것 10개만 유지)
const MAX_RECENT = 10;

/**
 * [내부 공용 함수] 주어진 key에서 JSON 배열을 읽어와서 문자열 배열로 변환
 *
 * - AsyncStorage.getItem → string | null 반환
 * - string이면 JSON.parse 해서 JS 객체로 변환
 * - 배열이 아니거나 파싱 실패 시 안전하게 [] 반환
 *
 * @param key AsyncStorage에 사용된 키 이름
 * @returns Promise<string[]> 항상 문자열 배열을 반환 (에러 시 빈 배열)
 */
async function loadArrayFromStorage(key: string): Promise<string[]> {
    try {
        const json = await AsyncStorage.getItem(key);

        // 아직 한 번도 저장된 적이 없는 경우 (null) → 빈 배열
        if (!json) return [];

        const parsed = JSON.parse(json);

        // 배열인지 한 번 더 체크 (예상과 다른 타입이 들어간 경우 대비)
        return Array.isArray(parsed) ? (parsed as string[]) : [];
    } catch (e) {
        console.log(`[storage] loadArrayFromStorage error (${key})`, e);
        return [];
    }
}

/**
 * [내부 공용 함수] 문자열 배열을 JSON으로 직렬화해서 AsyncStorage에 저장
 *
 * @param key AsyncStorage 키
 * @param list 저장할 문자열 배열 (null/undefined이면 []로 저장)
 */
async function saveArrayToStorage(key: string, list: string[]): Promise<void> {
    try {
        await AsyncStorage.setItem(key, JSON.stringify(list ?? []));
    } catch (e) {
        console.log(`[storage] saveArrayToStorage error (${key})`, e);
    }
}

/**
 * 🕒 최근 본 공모주 ID 리스트 불러오기
 *
 * - RECENT_KEY('recent_ipo')에 저장된 데이터를 배열로 반환
 * - 에러가 나도 항상 [] 을 반환하므로,
 *   사용하는 쪽에서 `const list = await loadRecent(); list.map(...)` 처럼 바로 사용 가능
 *
 * @returns Promise<string[]> 최근 본 공모주 ID 리스트
 */
export async function loadRecent(): Promise<string[]> {
    return await loadArrayFromStorage(RECENT_KEY);
}

/**
 * ➕ 최근 본 공모주 ID 추가
 *
 * 동작 정책:
 *  1. 기존 리스트를 불러옴
 *  2. 이미 같은 ID가 있으면 중복 제거 (filter)
 *  3. 제일 앞에 새 ID를 추가해서 "가장 최근" 이 맨 앞에 오도록 정렬
 *  4. 전체 길이를 MAX_RECENT(10개)로 잘라서 저장
 *
 * 예)
 *  - 현재: [A, B, C]
 *  - addRecentIpo('B') 호출
 *    → 중복 제거: [A, C]
 *    → 앞에 B 추가: [B, A, C]
 *
 * @param ipoId 최근에 본 공모주 ID
 * @returns Promise<string[]> 업데이트된 전체 리스트
 */
export async function addRecentIpo(ipoId: string): Promise<string[]> {
    try {
        const current = await loadRecent();

        // 1) 기존 배열에서 같은 ID는 제거 (중복 방지)
        // 2) 맨 앞에 새 ID 추가
        // 3) MAX_RECENT 개수까지만 slice
        const next = [ipoId, ...current.filter(id => id !== ipoId)].slice(
            0,
            MAX_RECENT,
        );

        // 변경된 배열을 저장
        await saveArrayToStorage(RECENT_KEY, next);

        return next;
    } catch (e) {
        console.log('addRecentIpo error', e);
        return [];
    }
}

/**
 * ➖ 최근 본 공모주 ID 하나 삭제
 *
 * 동작 방식:
 *  1. 현재 리스트를 불러옴
 *  2. 해당 ID(ipoId)만 제외하고 새 배열 생성
 *  3. 새 배열을 다시 저장
 *
 * @param ipoId 제거할 공모주 ID
 * @returns Promise<string[]> 업데이트된 전체 리스트
 */
export async function removeRecentIpo(ipoId: string): Promise<string[]> {
    try {
        const current = await loadRecent();

        // 해당 ID만 제거한 새 배열
        const next = current.filter(id => id !== ipoId);

        // 결과 저장
        await saveArrayToStorage(RECENT_KEY, next);

        return next;
    } catch (e) {
        console.log('removeRecentIpo error', e);
        return [];
    }
}

/**
 * 🧹 최근 본 공모주 전체 삭제
 *
 * - AsyncStorage에서 RECENT_KEY 자체를 삭제
 * - 이후 loadRecent()를 호출하면 []이 나오는 상태가 됨
 *
 * @returns Promise<string[]> 항상 빈 배열 반환
 */
export async function clearRecent(): Promise<string[]> {
    try {
        // 키 자체를 제거 (값만 비우는 게 아니라 아예 삭제)
        await AsyncStorage.removeItem(RECENT_KEY);
        return [];
    } catch (e) {
        console.log('clearRecent error', e);
        return [];
    }
}
