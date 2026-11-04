import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { profileKeys } from '@/services/profile/profile.hooks';

import {
  activateSemester,
  createSemester,
  deleteSemester,
  listSemesters,
  updateSemester,
} from './semesters.api';
import { toCreateSemesterInput, toSemester, type NewSemester } from './semesters.services';
import type { UpdateSemesterDto } from './semesters.types';

/** Keyed by the Firebase uid, like every feature's keys. */
export const semesterKeys = {
  all: ['semesters'] as const,
  list: (userId?: string | null) => [...semesterKeys.all, 'list', userId ?? 'anonymous'] as const,
};

/** Fetcher shared by the hook and anything that needs the list outside React. */
export async function fetchSemesters() {
  return (await listSemesters()).map(toSemester);
}

export function useSemestersQuery(userId?: string | null) {
  return useQuery({
    queryKey: semesterKeys.list(userId),
    queryFn: fetchSemesters,
    enabled: !!userId,
  });
}

/** Resolves to the new semester's id, which the profile form selects. */
export function useCreateSemester() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: NewSemester) =>
      (await createSemester(toCreateSemesterInput(data))).id,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: semesterKeys.all }),
  });
}

export function useUpdateSemester() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateSemesterDto }) => updateSemester(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: semesterKeys.all }),
  });
}

export function useDeleteSemester() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSemester(id, true),
    onSuccess: () => {
      // A cascade delete takes courses, attendance, assessments, results and
      // deadlines with it, and may move the profile's current term — same
      // reasoning as `useDeleteCourse`: every downstream cache can be stale.
      void queryClient.invalidateQueries();
    },
  });
}

/** Activation also moves the profile's `currentSemesterId`, so both caches refresh. */
export function useActivateSemester() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activateSemester(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: semesterKeys.all });
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}
