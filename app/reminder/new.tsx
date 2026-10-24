import { ExternalPathString, useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { BackStep } from '@/components/ui/BackStep';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/InputField';
import { ThemedText } from '@/components/ThemedText';
import { Wrapper } from '@/components/ui/Wrapper';
import { useCourses } from '@/hooks/useCourses';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { useUpcomingReminders } from '@/hooks/useUpcomingReminders';
import { ASSESSMENT_TYPES, ASSESSMENT_TYPE_LABELS } from '@/lib/constants';
import { buildReminderRangeHint } from '@/lib/reminders';
import type { AssessmentType } from '@/lib/types';
import { required } from '@/lib/validate';

const today = () => new Date().toISOString().slice(0, 10);

export default function ReminderFormScreen() {
  const { courseId, reminderId } = useLocalSearchParams<{ courseId?: string; reminderId?: string }>();
  const router = useRouter();
  const { courses } = useCourses();
  const { palette } = useTheme();
  const [selectedCourseId, setSelectedCourseId] = useState(courseId ?? '');
  const effectiveCourseId = courseId ?? selectedCourseId;
  const course = courses.find((c) => c.id === effectiveCourseId);
  const { reminders, isLoading, createReminder, updateReminder } = useUpcomingReminders(effectiveCourseId);
  const prefs = useNotificationPreferences();

  const availableTypes = course?.isLab
    ? ASSESSMENT_TYPES
    : ASSESSMENT_TYPES.filter((t) => t !== 'labFinal');

  const editing = reminderId ? reminders.find((r) => r.id === reminderId) : undefined;
  const isEditing = !!reminderId;

  const [type, setType] = useState<AssessmentType>('ct');
  const [name, setName] = useState('');
  const [date, setDate] = useState(today());
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  useEffect(() => {
    if (editing) {
      setType(editing.type);
      setName(editing.name);
      setDate(editing.date);
    }
  }, [editing]);

  const trimmedDate = date.trim();
  const reminderHint = !trimmedDate
    ? null
    : !prefs.assessmentRemindersEnabled
      ? 'Assessment reminders are off — enable them in Settings.'
      : buildReminderRangeHint(trimmedDate, type, prefs);

  const handleSubmit = async () => {
    const nextErrors: Record<string, string | null> = {
      course: courseId ? null : required(selectedCourseId, 'Course'),
      name: required(name, 'Name'),
      date: required(date, 'Date'),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const data = { type, name: name.trim(), date: date.trim() };
    if (isEditing && reminderId) {
      await updateReminder.mutateAsync({ id: reminderId, data });
    } else {
      await createReminder.mutateAsync(data);
    }
    router.back();
  };

  const handleRecordMarks = () => {
    if (!courseId || !reminderId) return;
    router.replace(
      (`/assessment/new?courseId=${courseId}&fromReminderId=${reminderId}` +
        `&presetType=${type}&presetName=${encodeURIComponent(name.trim())}&presetDate=${encodeURIComponent(date.trim())}`) as ExternalPathString,
    );
  };

  const isSaving = createReminder.isPending || updateReminder.isPending;

  return (
    <>
      <BackStep title={isEditing ? 'Edit reminder' : 'New reminder'} onBack={() => router.back()} />
      <Wrapper noTopMargin style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <ThemedText style={styles.intro}>
            Get a notification before this {ASSESSMENT_TYPE_LABELS[type].toLowerCase()} — no marks needed. Record
            marks later when it happens.
          </ThemedText>

          {!courseId && (
            <View style={styles.section}>
              <ThemedText type="defaultSemiBold">Course</ThemedText>
              <View style={styles.chips}>
                {courses.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.code}
                    selected={selectedCourseId === c.id}
                    onPress={() => {
                      setSelectedCourseId(c.id);
                      setErrors((e) => ({ ...e, course: null }));
                    }}
                  />
                ))}
              </View>
              {errors.course && <ThemedText style={[styles.error, { color: palette.risk }]}>{errors.course}</ThemedText>}
            </View>
          )}

          <View style={styles.section}>
            <ThemedText type="defaultSemiBold">Type</ThemedText>
            <View style={styles.chips}>
              {availableTypes.map((t) => (
                <Chip
                  key={t}
                  label={ASSESSMENT_TYPE_LABELS[t]}
                  selected={type === t}
                  onPress={() => setType(t)}
                />
              ))}
            </View>
          </View>

          <Field
            label="Name"
            placeholder="e.g. CT-1"
            value={name}
            onChangeText={(v) => {
              setName(v);
              setErrors((e) => ({ ...e, name: null }));
            }}
            error={errors.name}
          />
          <Field
            label="Date (YYYY-MM-DD)"
            placeholder="2026-08-03"
            value={date}
            onChangeText={(v) => {
              setDate(v);
              setErrors((e) => ({ ...e, date: null }));
            }}
            error={errors.date}
          />
          {reminderHint && <ThemedText style={styles.reminderHint}>⏰ {reminderHint}</ThemedText>}

          <Button
            title={isEditing ? 'Save changes' : 'Save reminder'}
            onPress={handleSubmit}
            loading={isSaving}
            disabled={isEditing && isLoading}
          />
          {isEditing && (
            <Button
              style={styles.recordButton}
              title="Record marks after it happens →"
              variant="ghost"
              onPress={handleRecordMarks}
            />
          )}
        </ScrollView>
      </Wrapper>
    </>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  intro: {
    opacity: 0.65,
    fontSize: 13,
    marginBottom: 16,
  },
  section: {
    gap: 8,
    marginBottom: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reminderHint: {
    opacity: 0.65,
    fontSize: 12,
    paddingLeft: 8,
    marginTop: -10,
    marginBottom: 14,
  },
  recordButton: {
    marginTop: 10,
  },
  error: {
    fontSize: 13,
  },
});
