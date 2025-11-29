import { Text, TouchableOpacity, View } from 'react-native';
import { EventType, EventTypeValue } from '../constants/event.constants';

// 이벤트 타입별 색상 (부드러운 톤)
const TYPE_COLORS = {
  [EventType.SUBSCRIPTION]: '#5B9FFF', // 부드러운 파랑 (청약)
  [EventType.REFUND]: '#34D399', // 부드러운 초록 (환불)
  [EventType.LISTING]: '#F87171', // 부드러운 빨강 (상장)
};

interface EventTypeFilterProps {
  selectedTypes: Set<EventTypeValue>;
  onToggle: (type: EventTypeValue) => void;
}

export default function EventTypeFilter({
  selectedTypes,
  onToggle,
}: EventTypeFilterProps) {
  const filters = [
    { type: EventType.SUBSCRIPTION, label: '청약' },
    { type: EventType.REFUND, label: '환불' },
    { type: EventType.LISTING, label: '상장' },
  ];

  return (
    <View className="flex-row gap-3 flex-1">
      {filters.map(({ type, label }) => {
        const isActive = selectedTypes.has(type);
        const typeColor = TYPE_COLORS[type as keyof typeof TYPE_COLORS];

        return (
          <TouchableOpacity
            key={type}
            className={`px-4 py-1 rounded-2xl border-2 items-center justify-center ${
              isActive
                ? 'bg-white dark:bg-gray-800'
                : 'bg-gray-100 dark:bg-gray-700'
            }`}
            style={
              isActive ? { borderColor: typeColor } : { borderColor: '#f5f5f5' }
            }
            onPress={() => onToggle(type)}
          >
            <Text
              className={`text-sm font-semibold ${
                !isActive ? 'text-gray-600 dark:text-gray-400' : ''
              }`}
              style={isActive ? { color: typeColor } : undefined}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
