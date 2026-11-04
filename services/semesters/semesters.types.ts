/**
 * Wire types for the semesters resource — mirror `lokkhyo-server/schemas/semester.ts`.
 * Screens never see these; `semesters.services.ts` maps them to `Semester`.
 */

export type SemesterStatusDto = 'ACTIVE' | 'ARCHIVED';

export interface SemesterDto {
  id: string;
  userId: string;
  name: string;
  /** `YYYY-MM-DD`. */
  startDate: string;
  /** `YYYY-MM-DD`; derived by the server from `totalWeeks`. */
  endDate: string;
  status: SemesterStatusDto;
  targetGpa: number | null;
  totalWeeks: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSemesterDto {
  name: string;
  startDate: string;
  totalWeeks: number;
  status?: SemesterStatusDto;
  targetGpa?: number | null;
}

export type UpdateSemesterDto = Partial<CreateSemesterDto>;
