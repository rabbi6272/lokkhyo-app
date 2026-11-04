import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/InputField';
import { useAssessments } from '@/hooks/useAssessments';
import { useCourses } from '@/hooks/useCourses';
import { useUpcomingReminders } from '@/hooks/useUpcomingReminders';
import { ASSESSMENT_TYPES, ASSESSMENT_TYPE_LABELS } from '@/lib/constants';
import { buildReminderRangeHint } from '@/lib/reminders';
import type { AssessmentType } from '@/lib/types';
import { clampMarks, isNumeric, required } from '@/lib/validate';
import { Wrapper } from '@/components/ui/Wrapper';
import { BackStep } from '@/components/ui/BackStep';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';

const today = () => new Date().toISOString().slice(0, 10);

export default function AssessmentFormScreen() {
  const {
    courseId,
    assessmentId,
    presetType,
    presetName,
    presetDate,
    fromReminderId,
  } = useLocalSearchParams<{
    courseId: string;
    assessmentId?: string;
    presetType?: string;
    presetName?: string;
    presetDate?: string;
    fromReminderId?: string;
  }>();
  const router = useRouter();
  const { courses } = useCourses();
  const { assessments, createAssessment, updateAssessment } = useAssessments(courseId ?? '');
  const { deleteReminder } = useUpcomingReminders(courseId ?? '');

  const course = courses.find((c) => c.id === courseId);
  const editingAssessment = assessmentId ? assessments.find((a) => a.id === assessmentId) : undefined;
  const isEditing = !!assessmentId;

  const availableTypes = course?.isLab
    ? ASSESSMENT_TYPES
    : ASSESSMENT_TYPES.filter((t) => t !== 'labFinal');

  const [type, setType] = useState<AssessmentType>(
    presetType && (ASSESSMENT_TYPES as readonly string[]).includes(presetType)
      ? (presetType as AssessmentType)
      : 'ct',
  );
  const [name, setName] = useState(presetName ?? '');
  const [marksObtained, setMarksObtained] = useState('');
  const [maxMarks, setMaxMarks] = useState('');
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(presetDate ?? today());
  const [teacherName, setTeacherName] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const prefs = useNotificationPreferences();
  const trimmedDate = date.trim();
  const reminderHint = !trimmedDate
    ? null
    : !prefs.assessmentRemindersEnabled
      ? 'Assessment reminders are off — enable them in Settings.'
      : buildReminderRangeHint(trimmedDate, type, prefs);

  useEffect(() => {
    if (editingAssessment) {
      setType(editingAssessment.type);
      setName(editingAssessment.name);
      setMarksObtained(String(editingAssessment.marksObtained));
      setMaxMarks(String(editingAssessment.maxMarks));
      setWeight(String(editingAssessment.weight));
      setDate(editingAssessment.date);
      setTeacherName(editingAssessment.teacherName ?? '');
    }
  }, [editingAssessment]);

  const handleSubmit = async () => {
    const max = Number(maxMarks);
    const obtained = Number(marksObtained);
    const nextErrors: Record<string, string | null> = {
      name: required(name, 'Name'),
      marksObtained: isNumeric(marksObtained, 'Marks obtained'),
      maxMarks: isNumeric(maxMarks, 'Max marks'),
      weight: isNumeric(weight, 'Weight'),
      date: required(date, 'Date'),
    };
    if (!Number.isNaN(max) && !Number.isNaN(obtained) && marksObtained.trim()) {
      nextErrors.marksObtained = clampMarks(obtained, max);
    }
    if (max <= 0 && maxMarks.trim()) nextErrors.maxMarks = 'Max marks must be positive.';
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const data = {
      type,
      name: name.trim(),
      marksObtained: obtained,
      maxMarks: max,
      weight: Number(weight),
      date: date.trim(),
      teacherName: teacherName.trim(),
    };

    if (isEditing && assessmentId) {
      await updateAssessment.mutateAsync({ id: assessmentId, data });
    } else {
      await createAssessment.mutateAsync(data);
      if (fromReminderId && courseId) {
        await deleteReminder.mutateAsync(fromReminderId);
      }
    }
    router.back();
  };

  const isSaving =
    createAssessment.isPending || updateAssessment.isPending || deleteReminder.isPending;

  return (
    <>
      <BackStep title={isEditing ? 'Edit mark' : 'Add mark'} onBack={() => router.back()} />
      <Wrapper noTopMargin keyboardAvoiding style={styles.flex}>
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">

          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" >Type</ThemedText>
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
            label="Marks obtained"
            placeholder="e.g. 18"
            keyboardType="numeric"
            value={marksObtained}
            onChangeText={(v) => {
              setMarksObtained(v);
              setErrors((e) => ({ ...e, marksObtained: null }));
            }}
            error={errors.marksObtained}
          />
          <Field
            label="Max marks"
            placeholder="e.g. 20"
            keyboardType="numeric"
            value={maxMarks}
            onChangeText={(v) => {
              setMaxMarks(v);
              setErrors((e) => ({ ...e, maxMarks: null }));
            }}
            error={errors.maxMarks}
          />
          <Field
            label="Weight (% of course)"
            placeholder="e.g. 10"
            keyboardType="numeric"
            value={weight}
            onChangeText={(v) => {
              setWeight(v);
              setErrors((e) => ({ ...e, weight: null }));
            }}
            error={errors.weight}
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
          <Field
            label="Teacher (optional)"
            placeholder="e.g. Dr. John Doe"
            value={teacherName}
            onChangeText={setTeacherName}
          />
          {course?.courseTeachers && course.courseTeachers.length > 0 && (
            <View style={[styles.chips, styles.teacherChips]}>
              {course.courseTeachers.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  selected={teacherName === name}
                  onPress={() => setTeacherName(name)}
                />
              ))}
            </View>
          )}

          <Button
            title={isEditing ? 'Save changes' : 'Save mark'}
            onPress={handleSubmit}
            loading={isSaving}
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
  section: {
    gap: 8,
    marginBottom: 16,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  teacherChips: {
    marginTop: -8,
    marginBottom: 14,
  },
  reminderHint: {
    opacity: 0.65,
    fontSize: 12,
    paddingLeft: 8,
    marginTop: -10,
    marginBottom: 14,
  },
});
