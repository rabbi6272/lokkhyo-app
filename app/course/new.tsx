import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/providers/theme-provider';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/InputField';
import { useCourses } from '@/hooks/useCourses';
import { useSemesters } from '@/hooks/useSemesters';
import { isNumeric, required } from '@/lib/validate';
import { Wrapper } from '@/components/ui/Wrapper';
import { BackStep } from '@/components/ui/BackStep';

export default function NewCourseScreen() {
  const router = useRouter();
  /** Opening from a semester's page means that term, not the first in the list. */
  const { semesterId: semesterParam } = useLocalSearchParams<{ semesterId?: string }>();
  const { createCourse } = useCourses();
  const { semesters } = useSemesters();
  const { palette } = useTheme();

  const [semesterId, setSemesterId] = useState(semesterParam ?? '');
  const [code, setCode] = useState('');
  const [title, setTitle] = useState('');
  const [credits, setCredits] = useState('');
  const [passMarks, setPassMarks] = useState('');
  const [ctWeight, setCtWeight] = useState('');
  const [teacherInput, setTeacherInput] = useState('');
  const [teachers, setTeachers] = useState<string[]>([]);
  const [isLab, setIsLab] = useState(false);
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  // The term list arrives after mount, so fall back to the first one once it does.
  useEffect(() => {
    if (!semesterId && semesters[0]) setSemesterId(semesters[0].id);
  }, [semesterId, semesters]);

  const handleAddTeacher = () => {
    const name = teacherInput.trim();
    if (!name || teachers.includes(name)) {
      setTeacherInput('');
      return;
    }
    setTeachers((t) => [...t, name]);
    setTeacherInput('');
  };

  const handleRemoveTeacher = (name: string) => {
    setTeachers((t) => t.filter((x) => x !== name));
  };

  const handleSubmit = async () => {
    const nextErrors: Record<string, string | null> = {
      semesterId: semesterId ? null : 'Select a semester.',
      code: required(code, 'Course code'),
      title: required(title, 'Course title'),
      credits: isNumeric(credits, 'Credits'),
      passMarks: isLab ? null : isNumeric(passMarks, 'Pass marks'),
      ctWeight: isLab ? null : isNumeric(ctWeight, 'CT weight'),
    };
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    await createCourse.mutateAsync({
      semesterId,
      code: code.trim(),
      title: title.trim(),
      credits: Number(credits),
      passMarks: Number(passMarks),
      ctWeight: Number(ctWeight),
      isLab,
      courseTeachers: teachers,
    });
    router.back();
  };

  return (
    <>
      <BackStep title="New course" onBack={() => router.back()} />
      <Wrapper noTopMargin style={styles.flex}>
        <ScrollView>
          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={{ paddingLeft: 8 }}>Semester</ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {semesters.map((sem) => (
                <Chip
                  key={sem.id}
                  label={sem.name}
                  selected={semesterId === sem.id}
                  onPress={() => {
                    setSemesterId(sem.id);
                    setErrors((e) => ({ ...e, semesterId: null }));
                  }}
                />
              ))}
            </ScrollView>
            {errors.semesterId && <Text style={[styles.error, { color: palette.risk }]}>{errors.semesterId}</Text>}
          </View>

          <View style={styles.section}>
            <ThemedText type="defaultSemiBold" style={{ paddingLeft: 8 }}>Course type</ThemedText>
            <View style={styles.chips}>
              <Chip label="Theory" selected={!isLab} onPress={() => setIsLab(false)} />
              <Chip label="Lab" selected={isLab} onPress={() => setIsLab(true)} />
            </View>
          </View>

          <Field
            label="Course code"
            placeholder="e.g. CSE-2100"
            autoCapitalize="characters"
            value={code}
            onChangeText={(v) => {
              setCode(v);
              setErrors((e) => ({ ...e, code: null }));
            }}
            error={errors.code}
          />
          <Field
            label="Course title"
            placeholder="e.g. Object Oriented Programming"
            value={title}
            onChangeText={(v) => {
              setTitle(v);
              setErrors((e) => ({ ...e, title: null }));
            }}
            error={errors.title}
          />
          <Field
            label="Credits"
            placeholder="e.g. 3.0"
            keyboardType="numeric"
            value={credits}
            onChangeText={(v) => {
              setCredits(v);
              setErrors((e) => ({ ...e, credits: null }));
            }}
            error={errors.credits}
          />
          <View style={styles.section}>
            <Field
              label="Course teacher(s)"
              placeholder="e.g. Dr. John Doe"
              value={teacherInput}
              onChangeText={setTeacherInput}
              onSubmitEditing={handleAddTeacher}
              returnKeyType="done"
            />
            <Button
              title="+ Add"
              variant="ghost"
              onPress={handleAddTeacher}
              style={styles.addTeacherButton}
            />
            {teachers.length > 0 && (
              <>
                <View style={styles.chips}>
                  {teachers.map((name) => (
                    <Chip key={name} label={name} selected onPress={() => handleRemoveTeacher(name)} />
                  ))}
                </View>
                <Text style={styles.hint}>Tap a name to remove it.</Text>
              </>
            )}
          </View>

          {!isLab && (
            <>
              <Field
                label="Pass marks (out of 100)"
                placeholder="e.g. 40"
                keyboardType="numeric"
                value={passMarks}
                onChangeText={(v) => {
                  setPassMarks(v);
                  setErrors((e) => ({ ...e, passMarks: null }));
                }}
                error={errors.passMarks}
              />
              <Field
                label="CT weight (% of final grade)"
                placeholder="e.g. 30"
                keyboardType="numeric"
                value={ctWeight}
                onChangeText={(v) => {
                  setCtWeight(v);
                  setErrors((e) => ({ ...e, ctWeight: null }));
                }}
                error={errors.ctWeight}
              />
            </>
          )}

          <Button title="Add course" onPress={handleSubmit} loading={createCourse.isPending} />
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
  addTeacherButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: -8,
    marginBottom: 8,
  },
  hint: {
    opacity: 0.5,
    fontSize: 12,
    marginTop: 6,
  },
  error: {
    fontSize: 13,
  },
});
