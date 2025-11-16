import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { EventType, EventTypeValue } from '../../constants/ipo.constants';

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
    <View style={styles.typeFilterGroup}>
      {filters.map(({ type, label }) => {
        const isActive = selectedTypes.has(type);
        const typeColor = TYPE_COLORS[type as keyof typeof TYPE_COLORS];

        return (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterButton,
              isActive && {
                backgroundColor: '#fff',
                borderColor: typeColor,
              },
            ]}
            onPress={() => onToggle(type)}
          >
            <Text
              style={[
                styles.filterButtonText,
                isActive && { color: typeColor },
              ]}
            >
              {label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  typeFilterGroup: {
    flexDirection: 'row',
    gap: 12,
    flex: 1,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
});
