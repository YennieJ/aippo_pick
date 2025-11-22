import { Linking, Platform } from 'react-native';

/**
 * 증권사별 딥링크 스킴 및 플레이스토어 URL 매핑
 * 키: API에서 오는 증권사 이름 (brokerName과 정확히 일치해야 함)
 */
export const BROKER_DEEP_LINKS: Record<
  string,
  { scheme: string; playStoreUrl: string; appStoreUrl?: string }
> = {
  DB금융투자: {
    scheme: 'dbfn://',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.dbfg.mts',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  IBK투자증권: {
    scheme: 'ibks://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.ibks.android',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  KB증권: {
    scheme: 'kbsmartstock://',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.kbsec.mts',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  KTB투자증권: {
    scheme: 'daol://',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.ktb.daol',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  NH투자증권: {
    scheme: 'nhqv://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.nhwm.newnavi',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  SK증권: {
    scheme: 'sks://',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.sks.cts',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  교보증권: {
    scheme: 'kyobo://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.kyobo.smartstock',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  대신증권: {
    scheme: 'daishin://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.daishin.etna',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  메리츠증권: {
    scheme: 'meritz://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.meritz.mts',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  미래에셋증권: {
    scheme:
      'intent://#Intent;scheme=mstok;package=com.miraeasset.android.mstore;end',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.miraeasset.trade',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  부국증권: {
    scheme: 'bookook://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.bookook.mts',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  삼성증권: {
    scheme: 'samsungpop://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.samsung.sp9',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  신영증권: {
    scheme: 'shinyoung://',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.sy.mts',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  신한투자증권: {
    scheme: 'shinhan://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.shinhaninvest.mts',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  유안타증권: {
    scheme: 'yuanta://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.yuanta.mts',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  유진투자증권: {
    scheme: 'eugene://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.eugenefn.mts',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  유화증권: {
    scheme: 'yuwa://',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.yuwa.mts',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  카카오페이증권: {
    scheme: 'kakaopaysec://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.kakaopaysec.android',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  케이프투자증권: {
    scheme: 'cape://',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.cape.mts',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  키움증권: {
    scheme: 'kiwoom://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.kiwoom.hero4',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  토스증권: {
    scheme: 'toss-securities://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=viva.republica.toss.securities',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  한국포스증권: {
    scheme: 'foss://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.koreafoss.mts',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  하나증권: {
    scheme: 'hana://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.hanaw.atrade',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  하이투자증권: {
    scheme: 'hi://',
    playStoreUrl: 'https://play.google.com/store/apps/details?id=com.hi.mts',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  한국투자증권: {
    scheme: 'truefriend://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=kr.co.koreainvestment.mts',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  한양증권: {
    scheme: 'hanyang://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.hanyang.mts',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  한화투자증권: {
    scheme: 'hanwha://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.hanwha.smartvictory',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
  현대차증권: {
    scheme: 'hmcsec://',
    playStoreUrl:
      'https://play.google.com/store/apps/details?id=com.hmcsec.mts',
    appStoreUrl: 'https://apps.apple.com/kr/app/id1234567890',
  },
};
// #
/**
 * 딥링크로 앱 열기
 * @param scheme - 딥링크 스킴 (예: 'miraeasset://')
 * @param playStoreUrl - 플레이스토어 URL (앱이 없을 경우)
 * @param appStoreUrl - 앱스토어 URL (iOS, 앱이 없을 경우)
 * @returns Promise<boolean> - 성공 여부
 */
export const openDeepLink = async (
  scheme: string,
  playStoreUrl: string,
  appStoreUrl?: string
): Promise<boolean> => {
  try {
    await Linking.openURL(scheme);
    // console.log(`딥링크 열기 성공: ${scheme}`);
    return true;
  } catch (error: any) {
    // 에러 발생 시 플랫폼별 스토어로 이동
    // console.error('딥링크 열기 실패:', error);
    try {
      let storeUrl: string;
      if (Platform.OS === 'ios') {
        // iOS: 앱스토어로 이동
        storeUrl = appStoreUrl || playStoreUrl;
        // console.log(`[iOS] 딥링크 실패, 앱스토어로 이동: ${storeUrl}`);
      } else {
        // Android: 플레이스토어로 이동
        storeUrl = playStoreUrl;
        // console.log(`[Android] 딥링크 실패, 플레이스토어로 이동: ${storeUrl}`);
      }
      await Linking.openURL(storeUrl);
      // console.log(`스토어 열기 완료`);
    } catch (storeError) {
      // console.error('스토어 열기 실패:', storeError);
    }
    return false;
  }
};

/**
 * 증권사 이름으로 딥링크 열기
 * @param brokerName - 증권사 이름 (BROKER_DEEP_LINKS의 키와 정확히 일치해야 함)
 * @returns Promise<boolean> - 성공 여부
 */
export const openBrokerApp = async (brokerName: string): Promise<boolean> => {
  const brokerConfig = BROKER_DEEP_LINKS[brokerName];
  if (!brokerConfig) {
    // console.warn(`증권사 딥링크 정보 없음: ${brokerName}`);
    return false;
  }

  return openDeepLink(
    brokerConfig.scheme,
    brokerConfig.playStoreUrl,
    brokerConfig.appStoreUrl
  );
};
