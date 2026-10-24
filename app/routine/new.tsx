import { useRouter } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/InputField';
import { useCourses } from '@/hooks/useCourses';
import { useRoutines } from '@/hooks/useRoutines';
import { DAY_NAMES, DAY_SHORT_NAMES } from '@/lib/constants';
import { getTodayOfWeek } from '@/lib/routine';
import { isTime, parseTime } from '@/lib/validate';
import { Wrapper } from '@/components/ui/Wrapper';
import { BackStep } from '@/components/ui/BackStep';

export default function NewRoutineSlotScreen() {
  const router = useRouter();
  const { createRoutineSlot } = useRoutines();
  const { courses } = useCourses();
  const { palette } = useTheme();

  const [dayOfWeek, setDayOfWeek] = useState<number>(getTodayOfWeek());
  const [courseId, setCourseId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [room, setRoom] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const selectedCourse = courses.find((c) => c.id === courseId);

  const handleSubmit = async () => {
    const nextErrors: Record<string, string | null> = {
      courseId: courseId ? null : 'Select a course.',
      startTime: isTime(startTime),
      endTime: isTime(endTime),
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
      <Wrapper noTopMargin style={styles.flex} >
        <ScrollView keyboardShouldPersistTaps="handled">
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
              <ThemedText style={styles.meta}>Add a course first to schedule classes.</ThemedText>
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

          <Field
            label="Start time (HH:MM, 24h)"
            placeholder="09:30"
            value={startTime}
            onChangeText={(v) => {
              setStartTime(v);
              setErrors((e) => ({ ...e, startTime: null }));
            }}
            error={errors.startTime}
          />
          <Field
            label="End time (HH:MM, 24h)"
            placeholder="10:30"
            value={endTime}
            onChangeText={(v) => {
              setEndTime(v);
              setErrors((e) => ({ ...e, endTime: null }));
            }}
            error={errors.endTime}
          />
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
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
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
