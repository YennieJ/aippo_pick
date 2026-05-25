import { useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import {
  NativeAd,
  NativeAdView,
  NativeAsset,
  NativeAssetType,
} from 'react-native-google-mobile-ads';

import { NATIVE_HOME_AD_UNIT_ID } from '../constants';

/**
 * 홈 화면용 네이티브 광고 카드 (가로 컴팩트형)
 * 광고 로드 실패/미수신 시 null을 렌더해 자리를 차지하지 않는다.
 */
export const NativeAdCard = () => {
  const [nativeAd, setNativeAd] = useState<NativeAd | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loadedAd: NativeAd | null = null;

    NativeAd.createForAdRequest(NATIVE_HOME_AD_UNIT_ID, {
      requestNonPersonalizedAdsOnly: true,
    })
      .then((ad) => {
        if (cancelled) {
          ad.destroy();
          return;
        }
        loadedAd = ad;
        setNativeAd(ad);
        if (__DEV__) console.log('[ads] native ad loaded');
      })
      .catch((e) => {
        if (__DEV__) console.log('[ads] native ad load failed', e);
      });

    return () => {
      cancelled = true;
      loadedAd?.destroy();
    };
  }, []);

  if (!nativeAd) return null;

  return (
    <View className="px-4 -mt-4 pb-3">
      <NativeAdView nativeAd={nativeAd}>
        <View className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-3">
          <View className="flex-row items-center">
            {nativeAd.icon?.url ? (
              <NativeAsset assetType={NativeAssetType.ICON}>
                <Image
                  source={{ uri: nativeAd.icon.url }}
                  className="w-10 h-10 rounded-lg mr-2.5"
                />
              </NativeAsset>
            ) : null}
            <View className="flex-1 mr-2">
              <View className="flex-row items-center mb-0.5">
                <NativeAsset assetType={NativeAssetType.HEADLINE}>
                  <Text
                    className="flex-1 text-sm font-semibold text-gray-900 dark:text-white"
                    numberOfLines={1}
                  >
                    {nativeAd.headline}
                  </Text>
                </NativeAsset>
                <View className="ml-1.5 px-1 py-0.5 bg-yellow-400 rounded">
                  <Text className="text-[9px] font-bold text-white">AD</Text>
                </View>
              </View>
              {nativeAd.body ? (
                <NativeAsset assetType={NativeAssetType.BODY}>
                  <Text
                    className="text-xs text-gray-500 dark:text-gray-400"
                    numberOfLines={1}
                  >
                    {nativeAd.body}
                  </Text>
                </NativeAsset>
              ) : null}
            </View>
            {nativeAd.callToAction ? (
              <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                <View className="bg-blue-500 dark:bg-blue-600 rounded-md px-3 py-1.5">
                  <Text className="text-white text-xs font-semibold">
                    {nativeAd.callToAction}
                  </Text>
                </View>
              </NativeAsset>
            ) : null}
          </View>
        </View>
      </NativeAdView>
    </View>
  );
};
