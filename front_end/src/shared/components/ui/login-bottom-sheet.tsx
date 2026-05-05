import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';
import { useKakaoLogin } from '../../../features/auth';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** 카카오 로그인 버튼 위에 노출되는 안내 문구 */
  message?: string;
  /** 로그인 성공 시 호출 (onClose 직후). 사용자가 직접 닫은 경우에는 호출되지 않는다. */
  onLoginSuccess?: () => void;
};

export function LoginBottomSheet({
  visible,
  onClose,
  message,
  onLoginSuccess,
}: Props) {
  const kakaoLoginMutation = useKakaoLogin();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/50">
        <TouchableOpacity
          className="flex-1"
          activeOpacity={1}
          onPress={onClose}
        />
        <View className="rounded-t-[20px] bg-white px-5 pb-10 pt-8 dark:bg-gray-800">
          {message ? (
            <Text className="text-center text-sm text-gray-700 dark:text-gray-200 mb-5">
              {message}
            </Text>
          ) : null}
          <TouchableOpacity
            className={`items-center rounded-lg bg-[#FEE500] py-3.5 ${kakaoLoginMutation.isPending ? 'opacity-60' : ''}`}
            activeOpacity={0.8}
            disabled={kakaoLoginMutation.isPending}
            onPress={() => {
              kakaoLoginMutation.mutate(undefined, {
                onSuccess: () => {
                  onClose();
                  onLoginSuccess?.();
                },
              });
            }}
          >
            <Text className="text-base font-bold text-[#191919]">
              {kakaoLoginMutation.isPending
                ? '로그인 중...'
                : '카카오톡으로 로그인하기'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
