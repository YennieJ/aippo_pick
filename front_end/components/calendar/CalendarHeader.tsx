import { IconSymbol } from '@/components/ui/icon-symbol';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  return (
    <View style={styles.header}>
      <View style={styles.calendarControls}>
        <TouchableOpacity onPress={onPrevious} style={styles.navButton}>
          <IconSymbol size={24} name="chevron.left" color="black" />
        </TouchableOpacity>
        <Text style={styles.headerText}>
          {year}년 {month}월
        </Text>
        <TouchableOpacity onPress={onNext} style={styles.navButton}>
          <IconSymbol size={24} name="chevron.right" color="black" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  calendarControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 36,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  navButton: {
    padding: 10,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
