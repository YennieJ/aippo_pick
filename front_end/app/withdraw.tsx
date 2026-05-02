import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { isAxiosError } from 'axios';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  BackHandler,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useWithdrawAccount } from '../src/features/auth';
import { ConfirmDialog } from '../src/shared';
import { useColorScheme } from '../src/shared/hooks/use-color-scheme';

const BACK_TARGET = '/(tabs)/myPage';

export default function WithdrawScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const subtitleColor =
    colorScheme === 'dark' ? 'text-gray-400' : 'text-gray-600';
  const bodyColor = colorScheme === 'dark' ? 'text-gray-300' : 'text-gray-700';

  const [agreed, setAgreed] = useState(false);
  const [finalConfirmOpen, setFinalConfirmOpen] = useState(false);
  const withdrawMutation = useWithdrawAccount();

  const goMyPage = useCallback(() => {
    router.replace(BACK_TARGET);
  }, [router]);

  // 웹: 브라우저 뒤로가기 → 마이페이지
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try {
      window.history.pushState(
        { __aippo_withdraw: true },
        '',
        window.location.href
      );
    } catch {
      /* empty */
    }
    const onPopState = () => {
      goMyPage();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [goMyPage]);

  // 안드 하드웨어 뒤로
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      goMyPage();
      return true;
    });
    return () => sub.remove();
  }, [goMyPage]);

  const onConfirmWithdraw = useCallback(() => {
    withdrawMutation.mutate(undefined, {
      onSuccess: () => {
        setFinalConfirmOpen(false);
        router.replace(BACK_TARGET);
        setTimeout(() => {
          Alert.alert('알림', '탈퇴가 완료되었습니다.');
        }, 250);
      },
      onError: (e) => {
        setFinalConfirmOpen(false);
        const status = isAxiosError(e) ? e.response?.status : undefined;
        if (status === 401) {
          router.replace(BACK_TARGET);
          setTimeout(() => {
            Alert.alert(
              '세션 만료',
              '다시 로그인한 뒤 탈퇴를 진행해주세요.',
            );
          }, 250);
          return;
        }
        if (status === 502 || (status != null && status >= 500)) {
          Alert.alert(
            '일시적인 오류',
            '서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.',
          );
          return;
        }
        Alert.alert(
          '탈퇴 실패',
          e instanceof Error ? e.message : '탈퇴 처리에 실패했습니다.',
        );
      },
    });
  }, [router, withdrawMutation]);

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['bottom']}>
      <View className="flex-1 bg-white dark:bg-black">
        <ScrollView
          className="flex-1 px-4 pt-4"
          contentContainerStyle={{ paddingBottom: 32 }}
        >
          <Text className={`text-sm leading-5 mb-5 ${subtitleColor}`}>
            탈퇴 전 아래 내용을 확인해주세요.
          </Text>

          <View className="mb-6">
            <Bullet text="카카오 계정과 앱 연결이 해제됩니다." bodyColor={bodyColor} />
            <Bullet
              text="저장된 매매일지가 모두 삭제되며 복구할 수 없습니다."
              bodyColor={bodyColor}
            />
            <Bullet
              text="동일 카카오 계정으로 다시 가입할 수 있으나, 이전 데이터는 복원되지 않습니다."
              bodyColor={bodyColor}
            />
            <Bullet
              text="알림 설정은 기기에 남아 있을 수 있으며, 앱을 삭제하면 함께 제거됩니다."
              bodyColor={bodyColor}
            />
          </View>

          <Pressable
            onPress={() => setAgreed(!agreed)}
            className="flex-row items-center gap-2 mb-6"
            disabled={withdrawMutation.isPending}
          >
            <MaterialIcons
              name={agreed ? 'check-box' : 'check-box-outline-blank'}
              size={22}
              color={agreed ? '#D4A72C' : '#9CA3AF'}
            />
            <Text className={`flex-1 text-sm leading-5 ${bodyColor}`}>
              위 내용을 확인했습니다.
            </Text>
          </Pressable>

          <Pressable
            disabled={!agreed || withdrawMutation.isPending}
            onPress={() => setFinalConfirmOpen(true)}
            className={`items-center rounded-xl py-3.5 ${
              !agreed || withdrawMutation.isPending
                ? 'bg-gray-200 dark:bg-gray-700'
                : 'bg-[#FED45C] dark:bg-[#D4A72C]'
            }`}
            android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
          >
            <Text
              className={`text-base font-bold ${
                !agreed || withdrawMutation.isPending
                  ? 'text-gray-500'
                  : 'text-black dark:text-white'
              }`}
            >
              {withdrawMutation.isPending ? '처리 중...' : '탈퇴하기'}
            </Text>
          </Pressable>
        </ScrollView>
      </View>

      <ConfirmDialog
        visible={finalConfirmOpen}
        title="회원 탈퇴"
        message={
          '정말 탈퇴하시겠습니까?\n탈퇴 후에는 매매일지를 포함한 계정 데이터가 삭제됩니다.'
        }
        confirmText="탈퇴"
        cancelText="취소"
        loading={withdrawMutation.isPending}
        onConfirm={onConfirmWithdraw}
        onCancel={() => setFinalConfirmOpen(false)}
      />
    </SafeAreaView>
  );
}

function Bullet({
  text,
  bodyColor,
}: {
  text: string;
  bodyColor: string;
}) {
  return (
    <View className="flex-row items-start gap-2 mb-3 last:mb-0">
      <Text className={`text-sm leading-5 ${bodyColor}`}>•</Text>
      <Text className={`flex-1 text-sm leading-5 ${bodyColor}`}>{text}</Text>
    </View>
  );
}
