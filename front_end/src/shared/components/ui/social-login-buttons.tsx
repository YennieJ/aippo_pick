import * as AppleAuthentication from 'expo-apple-authentication';
import React, { useEffect, useState } from 'react';
import { Platform, Text, TouchableOpacity, View } from 'react-native';

import {
  isAppleLoginCancelled,
  useAppleLogin,
  useKakaoLogin,
} from '../../../features/auth';
import { useColorScheme } from '../../hooks/use-color-scheme';

type Props = {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
};

export function SocialLoginButtons({ onSuccess, onError }: Props) {
  const colorScheme = useColorScheme();
  const kakaoLoginMutation = useKakaoLogin();
  const appleLoginMutation = useAppleLogin();
  const [appleAvailable, setAppleAvailable] = useState(false);

  const isPending = kakaoLoginMutation.isPending || appleLoginMutation.isPending;

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const handleMutationError = (error: unknown) => {
    if (isAppleLoginCancelled(error)) return;
    const message =
      error instanceof Error ? error.message : '로그인에 실패했습니다.';
    onError?.(new Error(message));
  };

  return (
    <View className="gap-3">
      {appleAvailable ? (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={
            colorScheme === 'dark'
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={8}
          style={{ width: '100%', height: 48 }}
          onPress={() => {
            if (isPending) return;
            appleLoginMutation.mutate(undefined, {
              onSuccess: () => onSuccess?.(),
              onError: handleMutationError,
            });
          }}
        />
      ) : null}

      <TouchableOpacity
        // 애플 네이티브 버튼과 동일 규격: 높이 48 · 모서리 8
        className={`items-center justify-center bg-[#FEE500] ${isPending ? 'opacity-60' : ''}`}
        style={{ width: '100%', height: 48, borderRadius: 8 }}
        activeOpacity={0.8}
        disabled={isPending}
        onPress={() => {
          kakaoLoginMutation.mutate(undefined, {
            onSuccess: () => onSuccess?.(),
            onError: handleMutationError,
          });
        }}
      >
        <Text
          className="font-bold text-[#191919]"
          style={{ fontSize: 19, fontWeight: '600' }}
        >
          {kakaoLoginMutation.isPending && !appleLoginMutation.isPending
            ? '로그인 중...'
            : '카카오톡으로 로그인하기'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
