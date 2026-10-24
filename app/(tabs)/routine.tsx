import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ReminderRow } from '@/components/ReminderRow';
import { ThemedText } from '@/components/ThemedText';
import { Card, Divider } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { Wrapper } from '@/components/ui/Wrapper';
import { useTheme } from '@/providers/theme-provider';
import { useAllUpcomingReminders } from '@/hooks/useAllUpcomingReminders';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useRoutines } from '@/hooks/useRoutines';
import { useDeleteUpcomingReminder } from '@/hooks/useUpcomingReminders';
import { DAY_NAMES, DAY_SHORT_NAMES } from '@/lib/constants';
import { buildReminderLine } from '@/lib/reminders';
import { formatTime12h, getTodayOfWeek } from '@/lib/routine';
import { parseTime } from '@/lib/validate';

export default function RoutineScreen() {
  const router = useRouter();
  const { slots, isLoading, deleteRoutineSlot } = useRoutines();
  const { reminders: upcoming, isLoading: isUpcomingLoading } = useAllUpcomingReminders();
  const deleteUpcoming = useDeleteUpcomingReminder();
  const prefs = useNotificationPreferences();
  const { palette, fontFamily } = useTheme();

  const today = getTodayOfWeek();
  const [selectedDay, setSelectedDay] = useState<number>(today);

  const daySlots = slots
    .filter((s) => s.dayOfWeek === selectedDay)
    .sort((a, b) => parseTime(a.startTime) - parseTime(b.startTime));

  const handleDelete = (slotId: string, label: string) => {
    Alert.alert('Remove class', `Remove ${label} from your ${DAY_NAMES[selectedDay]} routine?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteRoutineSlot.mutate(slotId) },
    ]);
  };

  const handleDeleteUpcoming = (reminderId: string, name: string, courseId: string) => {
    Alert.alert('Delete reminder', `Remove the reminder for "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteUpcoming.mutate({ courseId, reminderId }) },
    ]);
  };

  return (
    <Wrapper>
      <PageHeader title="Routine" actions="/routine/new" actionLabel="Add class" />

      <View style={styles.week} accessibilityRole="tablist">
        {DAY_SHORT_NAMES.map((day, index) => {
          const selected = selectedDay === index;
          const count = slots.filter((s) => s.dayOfWeek === index).length;
          const isToday = index === today;
          return (
            <Pressable
              key={day}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={`${DAY_NAMES[index]}, ${count} ${count === 1 ? 'class' : 'classes'}`}
              onPress={() => setSelectedDay(index)}
              style={[
                styles.day,
                {
                  backgroundColor: selected ? palette.teal : palette.surface,
                  borderColor: selected ? palette.teal : palette.line,
                },
              ]}>
              <ThemedText
                style={[
                  styles.dayLabel,
                  {
                    fontFamily: fontFamily.medium,
                    color: selected ? palette.onTeal : isToday ? palette.teal : palette.muted,
                  },
                ]}>
                {day}
              </ThemedText>
              <ThemedText
                style={[
                  styles.dayCount,
                  {
                    fontFamily: fontFamily.display,
                    color: selected
                      ? palette.onTeal
                      : count === 0
                        ? palette.faint
                        : isToday
                          ? palette.teal
                          : palette.ink,
                  },
                ]}>
                {count > 0 ? count : '–'}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <SectionHeader title={selectedDay === today ? `Today · ${DAY_NAMES[selectedDay]}` : DAY_NAMES[selectedDay]} first />
        {isLoading ? (
          <ActivityIndicator color={palette.teal} />
        ) : daySlots.length === 0 ? (
          <EmptyState
            title={`No classes on ${DAY_NAMES[selectedDay]}`}
            actionLabel="Add a class"
            onAction={() => router.push('/routine/new')}
          />
        ) : (
          <Card dense style={styles.list}>
            {daySlots.map((slot, index) => (
              <View key={slot.id}>
                {index > 0 && <Divider />}
                <View style={styles.slot}>
                  <View style={styles.time}>
                    <ThemedText type="number" color={palette.teal}>
                      {formatTime12h(slot.startTime)}
                    </ThemedText>
                    <ThemedText type="caption">{formatTime12h(slot.endTime)}</ThemedText>
                  </View>
                  <View style={[styles.rule, { backgroundColor: palette.tealSoft }]} />
                  <View style={styles.slotText}>
                    <ThemedText type="defaultSemiBold">{slot.courseLabel}</ThemedText>
                    <ThemedText type="caption">{slot.room ? `Room ${slot.room}` : 'No room set'}</ThemedText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${slot.courseLabel} at ${slot.startTime}`}
                    onPress={() => handleDelete(slot.id, slot.courseLabel)}
                    hitSlop={10}>
                    <SvgIcon size={18} name="trash" color={palette.faint} />
                  </Pressable>
                </View>
              </View>
            ))}
          </Card>
        )}

        <SectionHeader title="Upcoming" actionLabel="Add" onAction={() => router.push('/reminder/new')} />
        {isUpcomingLoading ? (
          <ActivityIndicator color={palette.teal} />
        ) : upcoming.length === 0 ? (
          <EmptyState
            title="No upcoming tests"
            body="Add a CT, quiz or assignment date to get a reminder a few days before."
          />
        ) : (
          <Card dense style={styles.list}>
            {upcoming.map((r, index) => (
              <View key={r.id}>
                {index > 0 && <Divider />}
                <ReminderRow
                  name={r.name}
                  type={r.type}
                  date={r.date}
                  courseCode={r.courseCode}
                  reminderLine={buildReminderLine(r, prefs)}
                  onPress={() =>
                    router.push({ pathname: '/reminder/new', params: { courseId: r.courseId, reminderId: r.id } })
                  }
                  onDelete={() => handleDeleteUpcoming(r.id, r.name, r.courseId)}
                />
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 32 },
  week: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
  },
  day: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  dayLabel: { fontSize: 12 },
  dayCount: { fontSize: 16, lineHeight: 20 },
  list: { paddingVertical: 0 },
  slot: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  time: { width: 70 },
  rule: { width: 2, alignSelf: 'stretch', borderRadius: 1 },
  slotText: { flex: 1, gap: 1 },
});
