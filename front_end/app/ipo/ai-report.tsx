import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIpoScore } from '../../src/features/ipo/hooks/useIpoQueries';
import { useColorScheme } from '../../src/shared/hooks/use-color-scheme';

const SCREEN_WIDTH = Dimensions.get('window').width;

const WEBTOON_SCENES = [
  require('../../assets/images/webtoon/scene1.png'),
  require('../../assets/images/webtoon/scene2.png'),
  require('../../assets/images/webtoon/scene3.png'),
  require('../../assets/images/webtoon/scene4.png'),
  require('../../assets/images/webtoon/scene5.png'),
  require('../../assets/images/webtoon/scene6.png'),
];

// 각 장면 말풍선의 위치 (퍼센트 기준)
const BUBBLE_POSITIONS: {
  top: number;
  left: number;
  width: number;
  height: number;
  paddingX: number;
  paddingY: number;
}[] = [
  { top: 2, left: 4, width: 90, height: 32, paddingX: 6, paddingY: 6 }, // scene1: 기업 개요
  { top: 3, left: 10, width: 84, height: 26, paddingX: 4, paddingY: 2 }, // scene2: 투자 매력 포인트
  { top: 2, left: 14, width: 82, height: 24, paddingX: 6, paddingY: 2 }, // scene3: 재무 & 실적
  { top: 2, left: 10, width: 86, height: 22, paddingX: 6, paddingY: 2 }, // scene4: 리스크 체크
  { top: 2, left: 2, width: 96, height: 37, paddingX: 4, paddingY: 2 }, // scene5: AI 점수
  { top: 3, left: 6.5, width: 91, height: 22, paddingX: 5.5, paddingY: 2 }, // scene6: 핵심 요약
];

interface WebtoonBlock {
  topic: string;
  summary_100_200_char: string;
}

function parseWebtoon(raw: string): WebtoonBlock[] {
  try {
    const parsed = JSON.parse(raw);
    return parsed.blocks ?? [];
  } catch {
    return [];
  }
}

export default function AiReportScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { company } = useLocalSearchParams<{
    company: string;
    codeId: string;
  }>();
  const { data: scoreData, isLoading, error } = useIpoScore(company ?? '');
  const [activeTab, setActiveTab] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const onTabPress = useCallback((index: number) => {
    setActiveTab(index);
    scrollRef.current?.scrollTo({ x: index * SCREEN_WIDTH, animated: true });
  }, []);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      if (page !== activeTab) setActiveTab(page);
    },
    [activeTab],
  );

  if (isLoading) {
    return (
      <SafeAreaView
        className="flex-1 bg-white dark:bg-black"
        edges={['bottom']}
      >
        <View className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color={isDark ? '#fff' : '#1A1A1A'} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !scoreData) {
    return (
      <SafeAreaView
        className="flex-1 bg-white dark:bg-black"
        edges={['bottom']}
      >
        <View className="flex-1 justify-center items-center">
          <Text className="text-base text-red-600 dark:text-red-400">
            데이터를 불러올 수 없습니다.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const webtoonBlocks = useMemo(
    () => parseWebtoon(scoreData.ai_webtoon ?? ''),
    [scoreData.ai_webtoon],
  );
  const tabs = ['웹툰', '리포트'];

  return (
    <SafeAreaView className="flex-1 bg-white dark:bg-black" edges={['bottom']}>
      {/* 탭 바 */}
      <View className="flex-row border-b border-gray-200 dark:border-gray-700">
        {tabs.map((label, i) => (
          <TouchableOpacity
            key={i}
            className="flex-1 py-3 items-center"
            onPress={() => onTabPress(i)}
          >
            <Text
              className={`text-base font-semibold ${activeTab === i ? 'text-[#FF6B35]' : 'text-gray-400 dark:text-gray-500'}`}
            >
              {label}
            </Text>
            {activeTab === i && (
              <View className="absolute bottom-0 w-full h-[2px] bg-[#FF6B35]" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* 스와이프 컨텐츠 */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScroll}
        scrollEventThrottle={16}
      >
        {/* 웹툰 탭 */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingVertical: 8 }}
          >
            {WEBTOON_SCENES.map((scene, i) => {
              const imageHeight = SCREEN_WIDTH * 1.5;
              const bubble = BUBBLE_POSITIONS[i];
              const blockText = webtoonBlocks[i]?.summary_100_200_char ?? '';
              return (
                <View
                  key={i}
                  style={{ width: SCREEN_WIDTH, height: imageHeight }}
                >
                  <Image
                    source={scene}
                    style={{ width: SCREEN_WIDTH, height: imageHeight }}
                    resizeMode="cover"
                  />
                  {blockText !== '' && (
                    <View
                      style={{
                        // backgroundColor: 'red',
                        position: 'absolute',
                        top: `${bubble.top}%`,
                        left: `${bubble.left}%`,
                        width: `${bubble.width}%`,
                        height: `${bubble.height}%`,
                        paddingHorizontal: `${bubble.paddingX}%`,
                        paddingVertical: `${bubble.paddingY}%`,
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Text className="text-gray-900 text-sm">{blockText}</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* 리포트 탭 */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          <ReportContent report={scoreData.ai_report} isDark={isDark} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface ReportSection {
  heading: string;
  body: string;
}

function parseReport(report: string): {
  title: string;
  sections: ReportSection[];
  tags: string;
} {
  const lines = report.split('\n').filter((l) => l.trim());

  let title = '';
  const sections: ReportSection[] = [];
  let tags = '';

  const titleMatch = report.match(/\[\[(.+?)\]\]/);
  if (titleMatch) title = titleMatch[1];

  const headingPattern = /^[📌🗓💼📊💡✅⚠️🧾]/u;
  let currentHeading = '';
  let currentBody: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('[[') || trimmed.startsWith('태그:')) {
      if (trimmed.startsWith('태그:'))
        tags = trimmed.replace('태그:', '').trim();
      continue;
    }
    if (headingPattern.test(trimmed)) {
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          body: currentBody.join('\n'),
        });
      }
      currentHeading = trimmed;
      currentBody = [];
    } else if (currentHeading) {
      currentBody.push(trimmed);
    }
  }
  if (currentHeading) {
    sections.push({ heading: currentHeading, body: currentBody.join('\n') });
  }

  return { title, sections, tags };
}

function ReportContent({
  report,
  isDark,
}: {
  report: string | null;
  isDark: boolean;
}) {
  const safeReport = report != null ? String(report) : '';
  const { title, sections, tags } = useMemo(
    () => parseReport(safeReport),
    [safeReport],
  );

  if (!safeReport.trim()) {
    return (
      <View className="flex-1 p-6 justify-center items-center">
        <Text
          className={`text-base text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
        >
          AI 리포트가 없습니다.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, gap: 16 }}
    >
      {title ? (
        <Text className="text-xl font-bold text-gray-900 dark:text-white leading-7">
          {title}
        </Text>
      ) : null}

      {sections.map((section, idx) => (
        <View
          key={idx}
          className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <Text className="text-base font-bold text-gray-900 dark:text-white mb-2">
            {section.heading}
          </Text>
          <Text className="text-[14px] text-gray-700 dark:text-gray-300 leading-[22px]">
            {section.body}
          </Text>
        </View>
      ))}

      {tags ? (
        <View className="flex-row flex-wrap gap-2 mt-1 mb-4">
          {tags
            .split(/\s+/)
            .filter((t) => t.startsWith('#'))
            .map((tag, i) => (
              <View
                key={i}
                className="bg-gray-100 dark:bg-gray-700 px-2.5 py-1 rounded-full"
              >
                <Text className="text-xs text-gray-600 dark:text-gray-300">
                  {tag}
                </Text>
              </View>
            ))}
        </View>
      ) : null}
    </ScrollView>
  );
}
