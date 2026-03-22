import { IconSymbol } from '@/src/shared/components/ui/icon-symbol';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { IpoScoreData } from '../types/ipo.types';

function getScoreColor(score: number) {
  if (score <= 0) return { main: '#9CA3AF', glow: '#9CA3AF55' };
  if (score >= 80) return { main: '#F59E0B', glow: '#F59E0B55' };
  if (score >= 50) return { main: '#3B82F6', glow: '#3B82F655' };
  return { main: '#EF4444', glow: '#EF444455' };
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function ScoreGauge({
  score,
  size = 100,
  isDark = false,
}: {
  score: number;
  size?: number;
  isDark?: boolean;
}) {
  const animValue = useRef(new Animated.Value(0)).current;
  const [displayScore, setDisplayScore] = useState(0);

  const colors = getScoreColor(score);
  const fontScale = size / 200;
  const strokeWidth = size * 0.06;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  const ARC_START = 225;
  const ARC_END = 495;
  const ARC_TOTAL = ARC_END - ARC_START;

  useEffect(() => {
    animValue.setValue(0);
    const listener = animValue.addListener(({ value }) => {
      setDisplayScore(Math.round(value));
    });
    Animated.timing(animValue, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
    }).start();
    return () => animValue.removeListener(listener);
  }, [score]);

  const trackColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  const trackPath = describeArc(center, center, radius, ARC_START, ARC_END);
  const scoreAngle = ARC_START + (ARC_TOTAL * Math.min(score, 100)) / 100;
  const scorePath =
    score > 0 ? describeArc(center, center, radius, ARC_START, scoreAngle) : '';

  return (
    <View
      style={{ width: size, height: size }}
      className="items-center justify-center"
    >
      <Svg width={size} height={size}>
        <Path
          d={trackPath}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
        />
        {score > 0 && (
          <Path
            d={scorePath}
            stroke={colors.main}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            fill="none"
            opacity={0.85}
          />
        )}
      </Svg>
      <View className="absolute items-center justify-center">
        <Text
          style={{
            fontSize: Math.round(50 * fontScale),
            fontWeight: '800',
            color: colors.main,
            textShadowColor: colors.glow,
            textShadowOffset: { width: 0, height: 0 },
            textShadowRadius: 24,
          }}
        >
          {displayScore}
        </Text>
        <Text
          className="uppercase mt-0.5"
          style={{
            fontSize: Math.round(14 * fontScale),
            letterSpacing: 2,
            color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
          }}
        >
          SCORE
        </Text>
      </View>
    </View>
  );
}

function StarRating({
  label,
  score,
  max,
  isDark = false,
}: {
  label: string;
  score: number;
  max: number;
  isDark?: boolean;
}) {
  const filled = Math.round((score / max) * 5);
  const activeColor = '#F59E0B';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

  return (
    <View className="flex-row items-center mb-2">
      {/* 그리드 1열: 라벨 */}
      <View className="w-[42%] pr-2">
        <Text
          className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
        >
          {label}
        </Text>
      </View>
      {/* 그리드 2열: 별 */}
      <View className="flex-1 flex-row gap-[3px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <Text
            key={i}
            style={{
              fontSize: 16,
              color: i <= filled ? activeColor : inactiveColor,
              textShadowColor: i <= filled ? '#F59E0B55' : 'transparent',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: i <= filled ? 6 : 0,
            }}
          >
            ★
          </Text>
        ))}
      </View>
    </View>
  );
}

interface ScoreSectionProps {
  scoreData: IpoScoreData | null;
  isDark?: boolean;
  /** 점수 있을 때만 동작. 없으면 터치 불가 */
  onPress?: () => void;
}

export function ScoreSection({
  scoreData,
  isDark = false,
  onPress,
}: ScoreSectionProps) {
  const totalScore = Number(scoreData?.total_score) || 0;
  const demandScore = Number(scoreData?.demand_score) || 0;
  const marketScore = Number(scoreData?.market_score) || 0;
  const valueScore = Number(scoreData?.value_score) || 0;

  const hasData = totalScore > 0;
  const hasAiReport =
    scoreData?.ai_report != null &&
    String(scoreData.ai_report).trim().length > 0;
  const pressable = hasData && !!onPress && hasAiReport;

  const inner = (
    <View className="p-5 rounded-xl border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <View className="flex-row items-center gap-6">
        <ScoreGauge
          score={hasData ? totalScore : 0}
          size={100}
          isDark={isDark}
        />
        {hasData ? (
          <View className="flex-1">
            <StarRating
              label="투자수요분석"
              score={demandScore}
              max={55}
              isDark={isDark}
            />
            <StarRating
              label="시장분석"
              score={marketScore}
              max={20}
              isDark={isDark}
            />
            <StarRating
              label="가치분석"
              score={valueScore}
              max={25}
              isDark={isDark}
            />
          </View>
        ) : (
          <View className="flex-1 items-center">
            <Text
              className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
            >
              AI 분석중...
            </Text>
          </View>
        )}
      </View>
      {hasData && hasAiReport ? (
        <View className="flex-row items-center justify-center gap-1 mt-2">
          <Text className="text-center text-gray-500 dark:text-gray-400">
            AI 분석 결과
          </Text>
          <IconSymbol size={16} name="chevron.right" color="gray" />
        </View>
      ) : null}
    </View>
  );

  if (pressable) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {inner}
      </TouchableOpacity>
    );
  }

  return inner;
}
