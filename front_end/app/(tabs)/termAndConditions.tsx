import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabKey = 'terms' | 'privacy';

const APP_NAME = '아이뽀픽';
const PROVIDER_NAME = '아이뽀픽';
const LAST_UPDATED = '2025-12-14';

// ✅ 요구사항: /termAndConditions에서 뒤로 = 무조건 myPage
// ❗️탭 라우트 경로는 보통 /(tabs)/myPage
const BACK_TARGET = '/(tabs)/myPage';

export default function TermAndConditionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<TabKey>(
    (params.tab === 'privacy' ? 'privacy' : 'terms') as TabKey
  );

  // 쿼리 파라미터 변경 시 탭 업데이트
  useEffect(() => {
    if (params.tab === 'privacy') {
      setTab('privacy');
    } else if (params.tab === 'terms') {
      setTab('terms');
    }
  }, [params.tab]);

  const content = useMemo(() => {
    if (tab === 'terms') return TERMS_TEXT;
    return PRIVACY_TEXT;
  }, [tab]);

  // ✅ 뒤로가기: 히스토리(back) 절대 쓰지 말고 무조건 myPage로
  const goMyPage = useCallback(() => {
    // replace: 뒤로 누르면 다시 약관으로 돌아오는 “무한 왕복” 방지
    router.replace(BACK_TARGET);
  }, [router]);

  // ✅ (중요) 웹: 크롬/브라우저 뒤로가기(popstate)도 myPage로 고정
  useEffect(() => {
    if (Platform.OS !== 'web') return;

    // termAndConditions 진입 시 히스토리 한 칸 “가짜로” 쌓아두고,
    // 브라우저 뒤로가기를 누르면 popstate가 발생 → 우리가 myPage로 보내버림
    try {
      window.history.pushState(
        { __aippo_terms: true },
        '',
        window.location.href
      );
    } catch {}

    const onPopState = () => {
      goMyPage();
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, [goMyPage]);

  // ✅ 안드 하드웨어 뒤로도 동일하게 처리
  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        goMyPage();
        return true; // 우리가 처리했음
      });
      return () => sub.remove();
    }, [goMyPage])
  );

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top']}>
      <View style={styles.container}>
        {/* 헤더 */}
        <View style={styles.header}>
          {/* ✅ 여기 router.back() 쓰면 메인으로 튐 -> goMyPage로 고정 */}
          <TouchableOpacity
            onPress={goMyPage}
            style={styles.backBtn}
            hitSlop={8}
          >
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <Text style={styles.title}>약관 및 개인정보 처리방침</Text>
            <Text style={styles.subTitle}>내용을 확인해주세요.</Text>
          </View>
        </View>

        {/* 탭 */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            onPress={() => setTab('terms')}
            style={[styles.tabBtn, tab === 'terms' && styles.tabBtnActive]}
          >
            <Text
              style={[styles.tabText, tab === 'terms' && styles.tabTextActive]}
            >
              이용약관
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setTab('privacy')}
            style={[styles.tabBtn, tab === 'privacy' && styles.tabBtnActive]}
          >
            <Text
              style={[
                styles.tabText,
                tab === 'privacy' && styles.tabTextActive,
              ]}
            >
              개인정보 처리방침
            </Text>
          </TouchableOpacity>
        </View>

        {/* 본문 */}
        <ScrollView contentContainerStyle={styles.contentWrap}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              {tab === 'terms' ? '이용약관' : '개인정보 처리방침'}
            </Text>

            <Text style={styles.metaText}>최종 업데이트: {LAST_UPDATED}</Text>

            <View style={styles.divider} />

            <Text selectable style={styles.bodyText}>
              {content}
            </Text>
          </View>

          <View style={styles.bottomSpace} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const TERMS_TEXT = `제1조(목적)
이 약관은 ${APP_NAME}(이하 “서비스”)의 이용과 관련하여 ${PROVIDER_NAME}(이하 “운영자”)와 이용자 간의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.

제2조(운영자 정보 및 문의)
1. 운영자: ${PROVIDER_NAME}

제3조(정의)
1. “이용자”란 본 서비스를 설치/접속하여 사용하는 모든 사용자를 의미합니다.
2. “콘텐츠”란 공모주 관련 정보, 화면에 표시되는 데이터, 알림 설정 등 서비스에서 제공되는 모든 정보를 의미합니다.
3. “알림”이란 이용자가 설정한 조건에 따라 기기에 전달되는 푸시 알림 또는 앱 내 알림을 의미합니다.

제4조(서비스 내용)
운영자는 다음과 같은 기능을 제공합니다.
- 공모주 관련 정보 조회
- 즐겨찾기, 최근 본 목록 등 사용자 편의 기능
- 알림 설정(전체 알림, SPAC/REITS 등 옵션, 알림 시간 등)
※ 콘텐츠는 데이터 출처/수집 시점/제공 사정에 따라 지연, 누락 또는 오차가 발생할 수 있습니다.

제5조(서비스 제공의 변경 및 중단)
1. 운영자는 서비스 개선, 점검, 장애, 외부 데이터 제공 중단, 정책 변경 등의 사유로 서비스의 전부 또는 일부를 변경/중단할 수 있습니다.
2. 운영자는 필요한 경우 앱 내 공지 또는 화면을 통해 변경 사항을 안내할 수 있습니다.

제6조(이용자의 의무 및 금지행위)
이용자는 서비스 이용 시 다음 행위를 하여서는 안 됩니다.
1. 서비스의 정상적인 운영을 방해하는 행위(비정상 트래픽 발생, 자동화 도구를 통한 과도한 호출 등)
2. 서비스 또는 콘텐츠의 무단 복제/배포/재판매/상업적 이용 행위
3. 리버스 엔지니어링, 소스코드/데이터의 부정 취득 시도
4. 타인의 권리를 침해하거나 법령을 위반하는 행위

제7조(지적재산권)
서비스와 관련된 화면 구성, 디자인, 로고, 텍스트 및 운영자가 제작/편집한 콘텐츠에 대한 권리는 운영자 또는 정당한 권리자에게 있습니다.

제8조(면책 및 투자 유의)
1. 서비스는 정보 제공을 목적으로 하며, 투자/매매를 권유하거나 보장하지 않습니다.
2. 이용자의 투자 판단 및 그 결과에 대한 책임은 전적으로 이용자에게 있습니다.
3. 운영자는 천재지변, 통신 장애, 외부 데이터 제공 중단 등 불가항력 사유로 발생한 손해에 대해 책임을 지지 않습니다.

제9조(이용 제한)
운영자는 이용자가 본 약관을 위반하거나 서비스 운영을 방해하는 경우, 서비스 이용을 제한할 수 있습니다.

제10조(약관 변경)
운영자는 필요 시 약관을 변경할 수 있으며, 변경 시 앱 내 공지 또는 화면을 통해 안내합니다.

제11조(준거법 및 분쟁)
본 약관은 대한민국 법령을 준거법으로 하며, 분쟁 발생 시 운영자와 이용자는 성실히 협의하여 해결하도록 노력합니다.

부칙
본 약관은 ${LAST_UPDATED}부터 적용됩니다.
`;

const PRIVACY_TEXT = `1. 개인정보 처리방침 개요
${APP_NAME}(이하 “서비스”)는 이용자의 개인정보를 중요하게 보호하며, 관련 법령을 준수합니다.

2. 수집하는 항목 / 이용 목적 / 보유기간
서비스는 기본적으로 회원가입 없이 사용 가능합니다. 다만 기능 제공을 위해 아래 정보가 수집/저장될 수 있습니다.

[수집 항목]
- 기기 식별값(deviceId): 알림 설정 저장 및 기기 구분
- 알림 설정 값(전체알림, SPAC/REITS 옵션, 알림시간 등): 알림 기능 제공
- 즐겨찾기/최근 본 목록: 사용자 편의 기능 제공(로컬 저장)

[이용 목적]
- 알림 설정 저장 및 알림 기능 제공
- 즐겨찾기/최근 본 목록 등 사용자 맞춤 기능 제공
- 서비스 품질 개선 및 오류 분석(필요 시)

[보유기간]
- 로컬 저장 데이터(즐겨찾기/최근 본 등): 이용자가 앱 데이터를 삭제하거나 앱을 삭제하면 삭제될 수 있습니다.
- 서버에 저장되는 알림 설정/기기 식별값: 서비스 운영 목적에 필요한 기간 동안 보관될 수 있으며, 이용자의 삭제 요청 또는 서비스 정책에 따라 삭제됩니다.

3. 개인정보의 제3자 제공
서비스는 원칙적으로 개인정보를 제3자에게 제공하지 않습니다.
단, 법령에 근거가 있거나 수사기관의 적법한 요청이 있는 경우 제공될 수 있습니다.

4. 개인정보 처리의 위탁
현재 서비스는 개인정보 처리 업무를 외부에 위탁하지 않습니다.
(추후 위탁이 발생할 경우, 위탁받는 자와 위탁 업무 내용 등을 공개합니다.)

5. 개인정보의 국외 이전
현재 서비스는 개인정보를 국외로 이전하지 않습니다.
(추후 국외 이전이 발생할 경우, 이전 국가/이전 항목/이전 일시 및 방법/보유 및 이용기간 등을 안내합니다.)

6. 파기 절차 및 방법
서비스는 개인정보의 보유기간이 경과하거나 처리 목적이 달성된 경우 지체 없이 해당 정보를 파기합니다.

7. 이용자의 권리와 행사 방법
이용자는 개인정보의 열람, 정정, 삭제, 처리정지 등을 요청할 수 있습니다.
또는 기능 제공 범위 내에서 알림 설정 비활성화/앱 데이터 삭제 등을 통해 동일 효과를 얻을 수 있습니다.

8. 개인정보 보호책임자 및 문의
- 운영자: ${PROVIDER_NAME}

9. 안전성 확보조치(보안)
서비스는 개인정보 보호를 위해 접근권한 관리, 내부 관리계획, 전송구간 보호(예: HTTPS), 로그 관리 등 합리적인 보안 조치를 적용하기 위해 노력합니다.

10. 아동의 개인정보
서비스는 만 14세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다.

11. 처리방침 변경
본 처리방침의 내용 추가/삭제/수정이 있을 경우 앱 내 공지 또는 화면을 통해 안내할 수 있습니다.

부칙
본 방침은 ${LAST_UPDATED}부터 적용됩니다.
`;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F5F7' },

  header: {
    paddingTop: 16,
    paddingHorizontal: 20,
    paddingBottom: 10,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  backBtn: { paddingRight: 4 },
  backText: { fontSize: 22, color: '#111827' },

  title: { fontSize: 18, fontWeight: '700', color: '#111827' },
  subTitle: { marginTop: 4, fontSize: 12, color: '#6B7280' },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E7EB',
  },
  tabBtnActive: {
    borderColor: '#2563EB',
  },
  tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
  tabTextActive: { color: '#2563EB' },

  contentWrap: { padding: 16, paddingBottom: 32 },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  metaText: { fontSize: 12, color: '#9CA3AF' },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },

  bodyText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#111827',
  },

  bottomSpace: { height: 24 },
});
