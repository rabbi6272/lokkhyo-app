import { useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  ToastAndroid,
  View,
} from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Avatar } from '@/components/ui/Avatar';
import { BackStep } from '@/components/ui/BackStep';
import { BlurredModal } from '@/components/ui/AppBlur';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/InputField';
import { Section } from '@/components/ui/Section';
import { SvgIcon } from '@/components/ui/SvgIcon';
import { Wrapper } from '@/components/ui/Wrapper';
import { useTheme } from '@/providers/theme-provider';
import { useSemesters } from '@/hooks/useSemesters';
import { useProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/providers/auth-provider';
import { gpaRange, isNumeric, required } from '@/lib/validate';

export default function EditProfileScreen() {
  const { palette } = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { profileData, updateProfile, updatePhoto, removePhoto } = useProfile();
  const { semesters, createSemester, activateSemester } = useSemesters();

  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('');
  const [department, setDepartment] = useState('');
  const [targetCgpa, setTargetCgpa] = useState('');
  const [currentSemesterId, setCurrentSemesterId] = useState('');
  const [errors, setErrors] = useState<Record<string, string | null>>({});

  const [modalVisible, setModalVisible] = useState(false);
  const [newSemName, setNewSemName] = useState('');
  const [newSemGpa, setNewSemGpa] = useState('');
  const [newSemStartDate, setNewSemStartDate] = useState('');
  const [newSemTotalWeeks, setNewSemTotalWeeks] = useState('13');
  const [newSemErrors, setNewSemErrors] = useState<Record<string, string | null>>({});

  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoBusy, setPhotoBusy] = useState<'camera' | 'library' | null>(null);

  /** Seed the form from the cached profile once it arrives. */
  useEffect(() => {
    if (!profileData) return;
    setFullName(profileData.fullName || '');
    setUniversity(profileData.university || '');
    setDepartment(profileData.department || '');
    setTargetCgpa(profileData.targetCgpa ? String(profileData.targetCgpa) : '');
    setCurrentSemesterId(profileData.currentSemesterId || '');
  }, [profileData]);

  const handleSave = async () => {
    const nextErrors: Record<string, string | null> = {
      fullName: required(fullName, 'Full name'),
    };

    // Optional: blank means "no target set", which is stored as 0 and shown
    // as an em dash on the profile screen.
    const cgpa = Number(targetCgpa);
    nextErrors.targetCgpa = targetCgpa.trim()
      ? Number.isNaN(cgpa)
        ? 'Target CGPA must be a number.'
        : gpaRange(cgpa)
      : null;

    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    await updateProfile.mutateAsync({
      fullName: fullName.trim(),
      university: university.trim(),
      department: department.trim(),
      targetCgpa: targetCgpa.trim() ? cgpa : 0,
      currentSemesterId,
    });
    ToastAndroid.show('Profile updated', 2000);
  };

  const handleCancel = () => {
    if (profileData) {
      setFullName(profileData.fullName || '');
      setUniversity(profileData.university || '');
      setDepartment(profileData.department || '');
      setTargetCgpa(profileData.targetCgpa ? String(profileData.targetCgpa) : '');
      setCurrentSemesterId(profileData.currentSemesterId || '');
    }
    setErrors({});
    navigation.goBack();
  };

  const handleCreateSemester = async () => {
    const totalWeeks = Number(newSemTotalWeeks);
    const nextErrors: Record<string, string | null> = {
      name: required(newSemName, 'Semester name'),
      startDate: required(newSemStartDate, 'Start date'),
      totalWeeks:
        isNumeric(newSemTotalWeeks, 'Total weeks') || (totalWeeks <= 0 ? 'Total weeks must be positive.' : null),
    };
    const gpa = Number(newSemGpa);
    if (newSemGpa.trim()) {
      nextErrors.targetGpa = Number.isNaN(gpa) ? 'Target GPA must be a number.' : gpaRange(gpa);
    } else {
      nextErrors.targetGpa = null;
    }
    setNewSemErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const id = await createSemester.mutateAsync({
      name: newSemName.trim(),
      targetGpa: newSemGpa.trim() ? gpa : 0,
      startDate: newSemStartDate.trim(),
      totalWeeks,
    });
    setCurrentSemesterId(id);
    setNewSemName('');
    setNewSemGpa('');
    setNewSemStartDate('');
    setNewSemTotalWeeks('13');
    setModalVisible(false);
  };

  /** Server cap for an uploaded photo (mirrors `lokkhyo-server/lib/photo.ts`). */
  const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

  /** A square, compressed pick keeps uploads under the cap and avatars even. */
  const PHOTO_PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.7,
  };

  const pickAndUpload = async (source: 'camera' | 'library') => {
    if (photoBusy) return;
    try {
      if (source === 'camera') {
        const camera = await ImagePicker.requestCameraPermissionsAsync();
        if (!camera.granted) {
          Alert.alert('Camera access needed', 'Allow camera access so you can take a profile photo.');
          return;
        }
      }

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(PHOTO_PICKER_OPTIONS)
          : await ImagePicker.launchImageLibraryAsync(PHOTO_PICKER_OPTIONS);

      if (result.canceled) return;
      const asset = result.assets[0];

      if (asset.fileSize != null && asset.fileSize > MAX_PHOTO_BYTES) {
        Alert.alert('Photo too large', 'Please choose an image under 3 MB.');
        return;
      }

      setPhotoBusy(source);
      await updatePhoto.mutateAsync({
        uri: asset.uri,
        type: asset.mimeType ?? 'image/jpeg',
        name: asset.fileName ?? 'profile-photo',
      });
      ToastAndroid.show('Profile photo updated', 2000);
    } catch {
      Alert.alert('Upload failed', 'Could not update your photo. Please try again.');
    } finally {
      setPhotoBusy(null);
      setPhotoModalVisible(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      await removePhoto.mutateAsync();
      ToastAndroid.show('Photo removed', 2000);
    } catch {
      Alert.alert('Could not remove photo', 'Please try again.');
    } finally {
      setPhotoModalVisible(false);
    }
  };

  return (
    <>
      <BackStep title="Edit profile" onBack={() => navigation.goBack()} />
      <Wrapper noTopMargin keyboardAvoiding style={styles.page}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Section title="PROFILE">
            <View style={styles.identity}>
              <View style={styles.avatarWrap}>
                <Avatar name={fullName || 'Student'} photoUrl={profileData?.photoUrl} size={52} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change profile photo"
                  hitSlop={6}
                  onPress={() => setPhotoModalVisible(true)}
                  style={[styles.cameraBadge, { backgroundColor: palette.teal, borderColor: palette.surface }]}>
                  <SvgIcon name="camera" size={12} color={palette.onTeal} />
                </Pressable>
              </View>
              <View style={styles.identityText}>
                <ThemedText type="defaultSemiBold" numberOfLines={1}>
                  {fullName || 'Your name'}
                </ThemedText>
                <ThemedText style={styles.email} numberOfLines={1}>
                  {user?.email ?? ''}
                </ThemedText>
              </View>
            </View>

            <Field
              label="Full name"
              placeholder="Your name"
              value={fullName}
              onChangeText={setFullName}
              error={errors.fullName}
            />
            <Field
              label="University"
              placeholder="Your university"
              value={university}
              onChangeText={setUniversity}
              error={errors.university}
            />
            <Field
              label="Department"
              placeholder="e.g. Computer Science & Engineering"
              value={department}
              onChangeText={setDepartment}
              error={errors.department}
            />
            <Field
              label="Target CGPA (optional)"
              placeholder="e.g. 3.60"
              keyboardType="numeric"
              value={targetCgpa}
              onChangeText={setTargetCgpa}
              error={errors.targetCgpa}
            />
          </Section>

          <Section
            title="CURRENT SEMESTER"
            action={
              <Pressable accessibilityRole="button" onPress={() => setModalVisible(true)}>
                <Text style={[styles.addText, { color: palette.teal }]}>+Add</Text>
              </Pressable>
            }>
            {semesters.length === 0 ? (
              <ThemedText style={styles.emptyText}>
                No semesters yet. Create one to get started.
              </ThemedText>
            ) : (
              <ScrollView
                horizontal
                contentContainerStyle={styles.semesterList}
                showsHorizontalScrollIndicator={false}>
                {semesters.map((sem) => (
                  <Chip
                    key={sem.id}
                    label={sem.name}
                    selected={currentSemesterId === sem.id}
                    onPress={() => {
                      setCurrentSemesterId(sem.id);
                      activateSemester.mutateAsync(sem.id);
                    }}
                  />
                ))}
              </ScrollView>
            )}
          </Section>

          <View style={styles.actions}>
            <Button title="Cancel" variant="ghost" onPress={handleCancel} />
            <Button title="Save changes" onPress={handleSave} loading={updateProfile.isPending} />
          </View>

          <BlurredModal
            visible={modalVisible}
            onClose={() => setModalVisible(false)}>
            <View style={[styles.modalContent, { backgroundColor: palette.surface }]}>
              <ThemedText type="subtitle" style={styles.modalTitle}>
                New Semester
              </ThemedText>
              <Field
                label="Semester name"
                placeholder="e.g. Fall 2026"
                value={newSemName}
                onChangeText={setNewSemName}
                error={newSemErrors.name}
              />
              <Field
                label="Target GPA (optional)"
                placeholder="e.g. 3.80"
                keyboardType="numeric"
                value={newSemGpa}
                onChangeText={setNewSemGpa}
                error={newSemErrors.targetGpa}
              />
              <Field
                label="Start date (YYYY-MM-DD)"
                placeholder="2026-01-04"
                value={newSemStartDate}
                onChangeText={(v) => {
                  setNewSemStartDate(v);
                  setNewSemErrors((e) => ({ ...e, startDate: null }));
                }}
                error={newSemErrors.startDate}
              />
              <Field
                label="Total weeks"
                placeholder="13"
                keyboardType="numeric"
                value={newSemTotalWeeks}
                onChangeText={(v) => {
                  setNewSemTotalWeeks(v);
                  setNewSemErrors((e) => ({ ...e, totalWeeks: null }));
                }}
                error={newSemErrors.totalWeeks}
              />
              <View style={styles.modalButtons}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={() => {
                    setModalVisible(false);
                    setNewSemName('');
                    setNewSemGpa('');
                    setNewSemStartDate('');
                    setNewSemTotalWeeks('13');
                    setNewSemErrors({});
                  }}
                />
                <Button title="Create" onPress={handleCreateSemester} />
              </View>
            </View>
          </BlurredModal>

          <BlurredModal
            visible={photoModalVisible}
            onClose={() => setPhotoModalVisible(false)}>
            <View style={[styles.modalContent, { backgroundColor: palette.surface }]}>
              <ThemedText type="subtitle" style={styles.modalTitle}>
                Profile photo
              </ThemedText>
              <ThemedText style={styles.modalHint}>
                Pick a photo from your library or take one now. It appears on your profile.
              </ThemedText>
              <View style={styles.photoActions}>
                <Button
                  title="Take photo"
                  onPress={() => pickAndUpload('camera')}
                  loading={photoBusy === 'camera'}
                />
                <Button
                  title="Choose from library"
                  variant="secondary"
                  onPress={() => pickAndUpload('library')}
                  loading={photoBusy === 'library'}
                />
                {profileData?.photoUrl ? (
                  <Button title="Remove photo" variant="destructive" onPress={handleRemovePhoto} />
                ) : null}
                <Button title="Cancel" variant="ghost" onPress={() => setPhotoModalVisible(false)} />
              </View>
            </View>
          </BlurredModal>
        </ScrollView>
      </Wrapper>
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: 20,
    paddingBottom: 32,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
  },
  avatarWrap: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  modalHint: {
    opacity: 0.6,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  photoActions: {
    gap: 10,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  email: {
    opacity: 0.6,
    fontSize: 13,
  },
  addText: {
    fontFamily: 'InterSemiBold',
    fontSize: 13,
    overflow: 'hidden',
    borderRadius: 50,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emptyText: {
    opacity: 0.5,
    fontSize: 13,
    paddingVertical: 14,
    paddingLeft: 4,
  },
  semesterList: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,30,36,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
});
