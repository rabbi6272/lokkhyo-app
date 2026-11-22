import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { AppModal } from '@/components/ui/AppModal';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/InputField';
import { TimePicker, toHHMM } from '@/components/ui/TimePicker';
import { useActiveSemester } from '@/hooks/useActiveSemester';
import { useRoutines } from '@/hooks/useRoutines';
import { DAY_NAMES, DAY_SHORT_NAMES } from '@/lib/constants';
import { formatTime12h, getTodayOfWeek } from '@/lib/routine';
import { isTime, parseTime } from '@/lib/validate';
import { Wrapper } from '@/components/ui/Wrapper';
import { BackStep } from '@/components/ui/BackStep';

export default function NewRoutineSlotScreen() {
  const router = useRouter();
  const { createRoutineSlot } = useRoutines();
  // Classes are scheduled for the active semester's courses only.
  const { courses } = useActiveSemester();
  const { palette } = useTheme();

  const [dayOfWeek, setDayOfWeek] = useState<number>(getTodayOfWeek());
  const [courseId, setCourseId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [room, setRoom] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [editingTime, setEditingTime] = useState<'startTime' | 'endTime' | null>(null);
  const [pendingHour, setPendingHour] = useState(9);
  const [pendingMinute, setPendingMinute] = useState(0);

  const openTimePicker = (target: 'startTime' | 'endTime') => {
    const current = target === 'startTime' ? startTime : endTime;
    if (current) {
      const [h, m] = current.split(':').map(Number);
      setPendingHour(h);
      setPendingMinute(m);
    } else if (target === 'endTime' && startTime) {
      const [h, m] = startTime.split(':').map(Number);
      setPendingHour(Math.min(h + 1, 23));
      setPendingMinute(m);
    } else {
      setPendingHour(9);
      setPendingMinute(0);
    }
    setEditingTime(target);
  };

  const confirmTime = () => {
    const value = toHHMM(pendingHour, pendingMinute);
    if (editingTime === 'startTime') setStartTime(value);
    if (editingTime === 'endTime') setEndTime(value);
    if (editingTime) setErrors((e) => ({ ...e, [editingTime]: null }));
    setEditingTime(null);
  };

  const selectedCourse = courses.find((c) => c.id === courseId);

  const handleSubmit = async () => {
    const nextErrors: Record<string, string | null> = {
      courseId: courseId ? null : 'Select a course.',
      startTime: startTime ? isTime(startTime) : 'Choose a start time.',
      endTime: endTime ? isTime(endTime) : 'Choose an end time.',
    };
    if (!nextErrors.startTime && !nextErrors.endTime) {
      if (parseTime(endTime) <= parseTime(startTime)) {
        nextErrors.endTime = 'End time must be after start time.';
      }
    }
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    await createRoutineSlot.mutateAsync({
      courseId,
      courseLabel: selectedCourse?.code ?? 'Class',
      dayOfWeek,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      room: room.trim(),
    });
    router.back();
  };

  return (
    <>
      <BackStep title="Add class" onBack={() => router.back()} />
      <Wrapper noTopMargin keyboardAvoiding style={styles.flex}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={{ paddingLeft: 8 }}>Day</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {DAY_NAMES.map((day, index) => (
                <Chip
                  key={day}
                  label={DAY_SHORT_NAMES[index]}
                  selected={dayOfWeek === index}
                  onPress={() => setDayOfWeek(index)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={{ paddingLeft: 8 }}>Course</ThemedText>
            {courses.length === 0 ? (
              <ThemedText style={styles.meta}>Add a course to the current semester first to schedule classes.</ThemedText>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                {courses.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.code}
                    selected={courseId === c.id}
                    onPress={() => {
                      setCourseId(c.id);
                      setErrors((e) => ({ ...e, courseId: null }));
                    }}
                  />
                ))}
              </ScrollView>
            )}
            {errors.courseId ? <Text style={[styles.error, { color: palette.risk }]}>{errors.courseId}</Text> : null}
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose start time"
            onPress={() => openTimePicker('startTime')}>
            {/* The read-only input is display only; the Pressable takes the tap. */}
            <View style={styles.noTouch}>
              <Field
                label="Start time"
                placeholder="Tap to choose"
                value={startTime ? formatTime12h(startTime) : ''}
                editable={false}
                error={errors.startTime}
              />
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose end time"
            onPress={() => openTimePicker('endTime')}>
            {/* The read-only input is display only; the Pressable takes the tap. */}
            <View style={styles.noTouch}>
              <Field
                label="End time"
                placeholder="Tap to choose"
                value={endTime ? formatTime12h(endTime) : ''}
                editable={false}
                error={errors.endTime}
              />
            </View>
          </Pressable>
          <Field
            label="Room (optional)"
            placeholder="e.g. Room 405"
            value={room}
            onChangeText={setRoom}
          />

          <Button
            title="Add class"
            onPress={handleSubmit}
            loading={createRoutineSlot.isPending}
          />
        </ScrollView>
      </Wrapper>

      <AppModal
        visible={editingTime !== null}
        onClose={() => setEditingTime(null)}
        title={editingTime === 'endTime' ? 'End time' : 'Start time'}
        actions={[
          { title: 'Cancel', variant: 'ghost', onPress: () => setEditingTime(null) },
          { title: 'Save', onPress: confirmTime },
        ]}>
        <TimePicker
          hour={pendingHour}
          minute={pendingMinute}
          onSelect={(hour, minute) => {
            setPendingHour(hour);
            setPendingMinute(minute);
          }}
        />
      </AppModal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  noTouch: {
    pointerEvents: 'none',
  },
  title: {
    marginBottom: 24,
  },
  section: {
    gap: 8,
    marginBottom: 16,
  },
  chips: {
    gap: 8,
  },
  meta: {
    opacity: 0.6,
    fontSize: 14,
  },
  error: {
    fontSize: 13,
  },
});
