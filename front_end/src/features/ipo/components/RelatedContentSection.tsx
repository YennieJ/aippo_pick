import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../../../shared/api/client';

export interface IpoContentItem {
  ipo_content_id: number;
  title: string;
  url: string;
  display_name: string;
  image_url: string | null;
  published_at: string;
  sub_text: string | null;
  duration_text: string | null;
}

export interface IpoContentData {
  NEWS?: IpoContentItem[];
  YOUTUBE?: IpoContentItem[];
  BLOG?: IpoContentItem[];
}

interface RelatedContentSectionProps {
  company: string;
  isDark?: boolean;
}

const getRelativeTime = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 1000 / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays}일 전`;
  if (diffHours > 0) return `${diffHours}시간 전`;
  if (diffMins > 0) return `${diffMins}분 전`;
  return '방금 전';
};

export function RelatedContentSection({ company, isDark }: RelatedContentSectionProps) {
  const [data, setData] = useState<IpoContentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchData = async () => {
      if (!company) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        setError(false);
        const res = await api.get(`/data_ipo/content/company/${encodeURIComponent(company)}`);
        if (mounted) {
          setData(res.data);
        }
      } catch (err) {
        if (mounted) {
          setError(true);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };
    fetchData();
    return () => {
      mounted = false;
    };
  }, [company]);

  if (isLoading) {
    return (
      <View className="py-6 items-center justify-center">
        <ActivityIndicator size="small" color={isDark ? '#fff' : '#1A1A1A'} />
      </View>
    );
  }

  if (error || !data) {
    return null; // 숨김 처리
  }

  const { NEWS, YOUTUBE, BLOG } = data;
  const hasNews = NEWS && NEWS.length > 0;
  const hasYoutube = YOUTUBE && YOUTUBE.length > 0;
  const hasBlog = BLOG && BLOG.length > 0;

  if (!hasNews && !hasYoutube && !hasBlog) {
    return null; // 데이터가 아예 없으면 숨김
  }

  const handlePress = (url: string) => {
    if (url) {
      Linking.openURL(url).catch(() => { });
    }
  };

  const renderNewsItem = (item: IpoContentItem, index: number) => (
    <TouchableOpacity
      key={`news-${item.ipo_content_id || index}`}
      activeOpacity={0.7}
      onPress={() => handlePress(item.url)}
      className="py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
    >
      <Text className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1.5 leading-[22px]" numberOfLines={2}>
        {item.title}
      </Text>
      {item.sub_text ? (
        <Text className="text-[13px] text-gray-500 dark:text-gray-400 mb-1.5 leading-[18px]" numberOfLines={1}>
          {item.sub_text}
        </Text>
      ) : null}
      <View className="flex-row items-center gap-2">
        <Text className="text-[12px] text-gray-500 dark:text-gray-400 font-medium">
          {item.display_name}
        </Text>
        <Text className="text-[12px] text-gray-400 dark:text-gray-500">•</Text>
        <Text className="text-[12px] text-gray-400 dark:text-gray-500">
          {getRelativeTime(item.published_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderYoutubeItem = (item: IpoContentItem, index: number) => (
    <TouchableOpacity
      key={`youtube-${item.ipo_content_id || index}`}
      activeOpacity={0.7}
      onPress={() => handlePress(item.url)}
      className="w-[180px] mr-3"
    >
      <View className="w-full h-[100px] rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 mb-2 relative">
        {item.image_url ? (
          <Image
            source={{ uri: item.image_url }}
            style={{ width: '100%', height: '100%' }}
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-full items-center justify-center">
            <Text className="text-gray-400 text-sm">No Image</Text>
          </View>
        )}
        {item.duration_text ? (
          <View className="absolute bottom-1.5 right-1.5 bg-black/80 px-1.5 py-0.5 rounded">
            <Text className="text-white text-[10px] font-medium">{item.duration_text}</Text>
          </View>
        ) : null}
      </View>
      <Text className="text-[13px] font-semibold text-gray-900 dark:text-white mb-1 leading-[18px]" numberOfLines={2}>
        {item.title}
      </Text>
      <View className="flex-row items-center gap-1.5 mt-auto">
        <Text className="text-[11px] text-gray-500 dark:text-gray-400" numberOfLines={1}>
          {item.display_name}
        </Text>
      </View>
      <View className="flex-row items-center gap-1 mb-1">
        {item.sub_text ? (
          <>
            <Text className="text-[11px] text-gray-400 dark:text-gray-500">{item.sub_text}</Text>
            <Text className="text-[11px] text-gray-400 dark:text-gray-500">•</Text>
          </>
        ) : null}
        <Text className="text-[11px] text-gray-400 dark:text-gray-500">
          {getRelativeTime(item.published_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderBlogItem = (item: IpoContentItem, index: number) => (
    <TouchableOpacity
      key={`blog-${item.ipo_content_id || index}`}
      activeOpacity={0.7}
      onPress={() => handlePress(item.url)}
      className="py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
    >
      <Text className="text-[15px] font-semibold text-gray-900 dark:text-white mb-1.5 leading-[22px]" numberOfLines={2}>
        {item.title}
      </Text>
      {item.sub_text ? (
        <Text className="text-[13px] text-gray-500 dark:text-gray-400 mb-1.5 leading-[18px]" numberOfLines={1}>
          {item.sub_text}
        </Text>
      ) : null}
      <View className="flex-row items-center gap-2">
        <Text className="text-[12px] text-gray-500 dark:text-gray-400 font-medium border border-gray-200 dark:border-gray-700 rounded px-1.5 py-0.5">
          {item.display_name}
        </Text>
        <Text className="text-[12px] text-gray-400 dark:text-gray-500">
          {getRelativeTime(item.published_at)}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="mt-1 pb-4 gap-3.5">
      {hasNews && (
        <View className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
          <Text className="text-base font-semibold text-gray-900 dark:text-white mb-1">관련 뉴스</Text>
          <View>
            {NEWS.slice(0, 3).map(renderNewsItem)}
          </View>
        </View>
      )}

      {hasYoutube && (
        <View className="bg-white dark:bg-gray-800 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
          <Text className="text-base font-semibold text-gray-900 dark:text-white mb-2.5 px-3.5">관련 영상</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14 }}
          >
            {YOUTUBE.slice(0, 5).map(renderYoutubeItem)}
          </ScrollView>
        </View>
      )}

      {hasBlog && (
        <View className="bg-white dark:bg-gray-800 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
          <Text className="text-base font-semibold text-gray-900 dark:text-white mb-1">관련 블로그</Text>
          <View>
            {BLOG.slice(0, 3).map(renderBlogItem)}
          </View>
        </View>
      )}
    </View>
  );
}
