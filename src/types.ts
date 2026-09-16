export type Trimestre = '1º Trimestre' | '2º Trimestre' | '3º Trimestre';
export type EvaluationComponent = '1º APORTE' | '2º APORTE' | 'EVALUACIÓN FINAL' | 'SUPLETORIO' | 'MEJORAMIENTO';

export type Level = 'Básica Superior' | 'Bachillerato';
export type CourseName = '8 EGB A' | '8 EGB B' | '9 EGB A' | '9 EGB B' | '10 EGB A' | '10 EGB B' | '1 BACH. A' | '1 BACH. B' | '2 BACH. A' | '2 BACH. B' | '3 BACH. A' | '3 BACH. B';
export type SubjectName = 'Matemáticas' | 'Lengua y Literatura' | 'Ciencias Naturales' | 'Biología' | 'Química' | 'Física' | 'Diplomado' | 'Indagación' | 'Filosofía' | 'Patrimonio' | 'Ciudadanía' | 'Ciencias Sociales' | 'Investigación' | 'Estudios Sociales';

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
  improvementWorkMaxScore?: number;
  improvementExamMaxScore?: number;
  createdAt?: number;
  teacherEmail?: string;
}

export interface Grade {
  studentId: string;
  activityId: string;
  originalGrade: number | null;
  globalizationGrade?: number | null;
  reinforcementGrade: number | null;
  improvementWorkGrade?: number | null;
  improvementExamGrade?: number | null;
  observation?: string;
  reinforcementDate: string | null; // DD/MM/AAAA format
  lastUpdated: string; // DD/MM/AAAA format
}

export type ImprovementCategory = 'refuerzo' | 'directa' | 'none';

export interface EvaluacionFinalDetails {
  origEq10: number | null;
  workScore: number | null;
  workEq10: number | null;
  examScore: number | null;
  examEq10: number | null;
  calculatedAvg: number | null;
  finalGrade: number | null;
  category: ImprovementCategory; // 'refuerzo' (0.01-6.99) | 'directa' (7.00-8.99) | 'none' (>=9 or null)
  requiresWork: boolean;         // true if category === 'refuerzo'
  requiresExam: boolean;         // true if category === 'refuerzo' || category === 'directa'
  isPending: boolean;            // true if category === 'refuerzo' and not both entered
  hasNoRecord: boolean;          // true if origEq10 < 7 and no improvement grades registered at all
  attempted: boolean;            // true if improvement inputs provided
  improved: boolean;             // true if calculatedAvg > origEq10
  noImprovement: boolean;        // true if attempted and calculatedAvg <= origEq10
  statusMessage: string;
}

export interface ActivityImprovementUsage {
  activityId: string;
  activityName: string;
  subject: string;
  trimestre: Trimestre;
  origEq10: number;
  calculatedAvg: number | null;
  finalGrade: number;
  workGrade?: number | null;
  examGrade?: number | null;
  improved: boolean;
  noImprovement: boolean;
}

export interface StudentGlobalImprovementStats {
  mejoraDirecta: {
    totalUsed: number;
    maxAllowed: number; // 3
    isLimitReached: boolean;
    byTrimestre: {
      [key in Trimestre]: {
        used: number;
        maxAllowed: number; // 1
        isLimitReached: boolean;
        activities: ActivityImprovementUsage[];
      };
    };
    activities: ActivityImprovementUsage[];
  };
  mejoraRefuerzo: {
    totalUsed: number;
    maxAllowed: number; // 6
    isLimitReached: boolean;
    activities: ActivityImprovementUsage[];
  };
  unimprovedAlerts: {
    activityId: string;
    activityName: string;
    subject: string;
    trimestre: Trimestre;
    origEq10: number;
  }[];
}

export interface ClassNote {
  course: CourseName;
  subject: SubjectName;
  text: string;
  lastUpdated: string;
}

export type Role = 'none' | 'docente' | 'estudiante' | 'tutor';

