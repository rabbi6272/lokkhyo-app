/** Wire types for courses — mirror `lokkhyo-server/schemas/course.ts`. */

export interface CourseDto {
  id: string;
  userId: string;
  semesterId: string;
  title: string;
  code: string;
  instructor: string | null;
  credits: number;
  passMarks: number | null;
  ctWeight: number | null;
  isLab: boolean;
  courseTeachers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCourseDto {
  semesterId: string;
  title: string;
  code: string;
  credits: number;
  instructor?: string;
  passMarks?: number | null;
  ctWeight?: number | null;
  isLab?: boolean;
  courseTeachers?: string[];
}

export type UpdateCourseDto = Partial<Omit<CreateCourseDto, 'instructor'>> & {
  instructor?: string | null;
};

/** The `details` of a 409 from `DELETE /courses/:id` without `cascade`. */
export interface CourseDependentsDto {
  attendance: number;
  assessments: number;
  results: number;
  routineSlots: number;
  deadlines: number;
}
