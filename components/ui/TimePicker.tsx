import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Chip } from '@/components/ui/Chip';
import { formatTime12h } from '@/lib/routine';

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);
const MINUTE_STEP = 5;
const MINUTE_OPTIONS = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP);

export function toHHMM(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/**
 * Two scrollable columns of pills — an hour and a minute — so a time can be
 * any moment in the day. Built from the existing Chip rather than a native
 * date picker, so it adds no dependency and needs no dev-client rebuild.
 * Place it inside an `AppModal` with Cancel / Save actions.
 */
export function TimePicker({
  hour,
  minute,
  onSelect,
}: {
  hour: number;
  minute: number;
  onSelect: (hour: number, minute: number) => void;
}) {
  return (
    <View style={styles.pickerWrap}>
      <ThemedText type="title" style={styles.pickerReadout}>
        {formatTime12h(toHHMM(hour, minute))}
      </ThemedText>
      <View style={styles.pickerColumns}>
        <View style={styles.pickerColumn}>
          <ThemedText style={styles.pickerHeading}>Hour</ThemedText>
          <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerListContent}>
            {HOUR_OPTIONS.map((h) => (
              <Chip
                key={h}
                label={String(h).padStart(2, '0')}
                selected={h === hour}
                onPress={() => onSelect(h, minute)}
              />
            ))}
          </ScrollView>
        </View>
        <View style={styles.pickerColumn}>
          <ThemedText style={styles.pickerHeading}>Minute</ThemedText>
          <ScrollView style={styles.pickerList} contentContainerStyle={styles.pickerListContent}>
            {MINUTE_OPTIONS.map((m) => (
              <Chip
                key={m}
                label={String(m).padStart(2, '0')}
                selected={m === minute}
                onPress={() => onSelect(hour, m)}
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerWrap: {
    marginTop: 16,
    marginBottom: 8,
  },
  pickerReadout: {
    textAlign: 'center',
    marginBottom: 12,
  },
  pickerColumns: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerColumn: {
    flex: 1,
  },
  pickerHeading: {
    opacity: 0.5,
    fontSize: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  pickerList: {
    maxHeight: 220,
  },
  pickerListContent: {
    gap: 8,
    alignItems: 'center',
    paddingBottom: 8,
  },
});
