import { useEffect } from 'react';
import { StyleSheet, Text, useColorScheme, View } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const LOGO = require('../../../../assets/images/android-icon-aippopick.png');

// 청약 / 환불 / 상장 (앱 달력·위젯과 동일한 상태 색) — 라이트·다크 공통
const DOT_COLORS = ['#5B9FFF', '#34D399', '#F87171'];

// 라이트/다크 팔레트. bg는 네이티브 스플래시 배경과 동일하게 맞춰 핸드오프 플래시 방지.
// 말풍선은 배경 대비로 반전(다크=흰 말풍선 / 라이트=짙은 말풍선).
const THEME = {
  dark: {
    bg: '#141416',
    brand: '#FFFFFF',
    tagline: '#A3A3A3',
    bubbleBg: '#FFFFFF',
    bubbleText: '#15171C',
  },
  light: {
    bg: '#FFFFFF',
    brand: '#15171C',
    tagline: '#6B7280',
    bubbleBg: '#1F2937',
    bubbleText: '#FFFFFF',
  },
} as const;

type Props = {
  /** true인 동안 스플래시 표시, false가 되면 페이드아웃 */
  loading: boolean;
  /** 페이드아웃 완료 후 호출 (부모가 오버레이를 언마운트) */
  onHidden?: () => void;
};

/** 청약·환불·상장 색으로 순차 깜빡이는 점 */
function PulseDot({ color, delay }: { color: string; delay: number }) {
  const v = useSharedValue(0);

  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        ),
        -1,
        false,
      ),
    );
  }, [delay, v]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.4 + 0.6 * v.value,
    transform: [{ scale: 0.7 + 0.3 * v.value }],
  }));

  return (
    <Animated.View style={[styles.dot, { backgroundColor: color }, style]} />
  );
}

/**
 * 네이티브 스플래시(정적 로고) 직후 표시되는 JS 애니메이션 로딩 화면.
 * - 말풍선: 고정 / 마스코트: 바운스 (서로 겹치지 않게 간격 확보)
 * - 청약·환불·상장 3색 점 순차 깜빡임
 * - 시스템 다크모드에 따라 배경/글자 색 적응 (네이티브 스플래시와 일치)
 * iOS·Android 공통 (네이티브 코드 없음)
 */
export function AnimatedSplash({ loading, onHidden }: Props) {
  // RN 기본 훅을 직접 사용 → 첫 렌더부터 실제 모드 반영(라이트→다크 깜빡임 방지)
  const c = useColorScheme() === 'dark' ? THEME.dark : THEME.light;

  const bounce = useSharedValue(0);
  const fade = useSharedValue(1);

  // 마스코트만 위아래 바운스 (말풍선은 고정)
  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 800, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 800, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
      false,
    );
  }, [bounce]);

  // 로딩이 끝나면 부드럽게 페이드아웃 후 언마운트
  useEffect(() => {
    if (!loading) {
      fade.value = withTiming(0, { duration: 350 }, (finished) => {
        if (finished && onHidden) runOnJS(onHidden)();
      });
    }
  }, [loading, fade, onHidden]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounce.value }],
  }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.value }));

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.root,
        { backgroundColor: c.bg },
        rootStyle,
      ]}
      pointerEvents={loading ? 'auto' : 'none'}
    >
      {/* 말풍선 (고정, 꼬리 없는 둥근 형태) */}
      <View style={[styles.bubble, { backgroundColor: c.bubbleBg }]}>
        <Text style={[styles.bubbleText, { color: c.bubbleText }]}>
          곧 시작해요!
        </Text>
      </View>

      {/* 마스코트 (바운스) */}
      <Animated.Image source={LOGO} style={[styles.logo, logoStyle]} />

      <Text style={[styles.brand, { color: c.brand }]}>아이뽀픽</Text>
      <Text style={[styles.tagline, { color: c.tagline }]}>
        공모주, 놓치지 마세요
      </Text>

      <View style={styles.dots}>
        <PulseDot color={DOT_COLORS[0]} delay={0} />
        <PulseDot color={DOT_COLORS[1]} delay={200} />
        <PulseDot color={DOT_COLORS[2]} delay={400} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    elevation: 999,
  },
  bubble: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 28, // 말풍선↔로고 간격 (바운스 12px 떠도 겹침 없음)
  },
  bubbleText: { fontWeight: '800', fontSize: 14 },
  logo: { width: 96, height: 96, borderRadius: 24 },
  brand: {
    fontSize: 26,
    fontWeight: '900',
    marginTop: 22,
    letterSpacing: -0.5,
  },
  tagline: { fontSize: 14, fontWeight: '600', marginTop: 6 },
  dots: { flexDirection: 'row', gap: 12, marginTop: 26 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
