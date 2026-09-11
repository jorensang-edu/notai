export type Trimestre = '1º Trimestre' | '2º Trimestre' | '3º Trimestre';
export type EvaluationComponent = '1º APORTE' | '2º APORTE' | 'EVALUACIÓN FINAL' | 'SUPLETORIO' | 'MEJORAMIENTO';

export type Level = 'Básica Superior' | 'Bachillerato';
export type CourseName = '8 EGB A' | '8 EGB B' | '9 EGB A' | '9 EGB B' | '10 EGB A' | '10 EGB B' | '1 BACH. A' | '1 BACH. B' | '2 BACH. A' | '2 BACH. B' | '3 BACH. A' | '3 BACH. B';
export type SubjectName = 'Matemáticas' | 'Lengua y Literatura' | 'Ciencias Naturales' | 'Biología' | 'Química' | 'Física' | 'Diplomado' | 'Educación Física' | 'Indagación' | 'Filosofía' | 'Patrimonio' | 'Ciudadanía' | 'Ciencias Sociales' | 'Investigación';

export interface CourseParams {
  institution: string;
  period: string;
  trimestre: Trimestre;
  teacher: string;
}

export interface Student {
  id: string;
  code: string;
  name: string;
  course: CourseName;
  level: Level;
}

export interface Activity {
  id: string;
  name: string;
  component: EvaluationComponent;
  date: string; // DD/MM/AAAA format
  course: CourseName;
  subject: SubjectName;
  trimestre?: Trimestre;
  maxScore?: number;
  reinforcementMaxScore?: number;
  globalizationMaxScore?: number;
  hasGlobalization?: boolean;
  createdAt?: number;
  teacherEmail?: string;
}

export interface Grade {
  studentId: string;
  activityId: string;
  originalGrade: number | null;
  globalizationGrade?: number | null;
  reinforcementGrade: number | null;
  observation?: string;
  reinforcementDate: string | null; // DD/MM/AAAA format
  lastUpdated: string; // DD/MM/AAAA format
}

export interface ClassNote {
  course: CourseName;
  subject: SubjectName;
  text: string;
  lastUpdated: string;
}

export type Role = 'none' | 'docente' | 'estudiante';

