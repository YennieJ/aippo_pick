import React from 'react';
import { Modal, Text, TouchableOpacity, View } from 'react-native';

import { SocialLoginButtons } from './social-login-buttons';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** 로그인 버튼 위에 노출되는 안내 문구 */
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
          <SocialLoginButtons
            onSuccess={() => {
              onClose();
              onLoginSuccess?.();
            }}
          />
        </View>
      </View>
    </Modal>
  );
}
