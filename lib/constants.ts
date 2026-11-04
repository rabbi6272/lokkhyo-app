export const DAY_NAMES = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday',];

export const DAY_SHORT_NAMES = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri',];

export const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',];

export const ASSESSMENT_TYPES = ['ct', 'quiz', 'assignment', 'labFinal'] as const;

export const ASSESSMENT_TYPE_LABELS: Record<string, string> = {
  ct: 'CT',
  quiz: 'Quiz',
  assignment: 'Assignment',
  labFinal: 'Lab Final',
};

export const MAX_GPA = 4.0;
