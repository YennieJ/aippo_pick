import { Text, TouchableOpacity, View } from 'react-native';
import { IconSymbol } from '../../../shared/components/ui/icon-symbol';
import { useColorScheme } from '../../../shared/hooks/use-color-scheme';

interface CalendarHeaderProps {
  year: number;
  month: number;
  onPrevious: () => void;
  onNext: () => void;
}

export default function CalendarHeader({
  year,
  month,
  onPrevious,
  onNext,
}: CalendarHeaderProps) {
  const colorScheme = useColorScheme();
  const iconColor = colorScheme === 'dark' ? '#fff' : '#000';

  return (
    <View className="flex-row items-center px-2.5 py-2 justify-between">
      <View className="flex-row items-center gap-9">
        <TouchableOpacity
          onPress={onPrevious}
          className="p-2.5 min-w-[44px] items-center justify-center"
        >
          <IconSymbol size={24} name="chevron.left" color={iconColor} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-center text-gray-900 dark:text-white">
          {year}년 {month}월
        </Text>
        <TouchableOpacity
          onPress={onNext}
          className="p-2.5 min-w-[44px] items-center justify-center"
        >
          <IconSymbol size={24} name="chevron.right" color={iconColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
