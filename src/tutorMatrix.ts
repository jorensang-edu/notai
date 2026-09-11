import { CourseName } from './types';

export interface TutorAssignment {
  name: string;
  level: string;
  courses: CourseName[];
}

export const TUTOR_MATRIX: Record<string, TutorAssignment> = {
  '9YF7P': {
    name: 'Tutor 8vo EGB',
    level: 'Básica Superior',
    courses: ['8 EGB A', '8 EGB B']
  },
  '9D44P': {
    name: 'Tutor 9no EGB',
    level: 'Básica Superior',
    courses: ['9 EGB A', '9 EGB B']
  },
  '64TX4': {
    name: 'Tutor 10mo EGB',
    level: 'Básica Superior',
    courses: ['10 EGB A', '10 EGB B']
  },
  'PPRXM': {
    name: 'Tutor 1ro Bachillerato',
    level: 'Bachillerato',
    courses: ['1 BACH. A', '1 BACH. B']
  },
  'L3KMS': {
    name: 'Tutor 2do Bachillerato',
    level: 'Bachillerato',
    courses: ['2 BACH. A', '2 BACH. B']
  },
  'MJS7F': {
    name: 'Tutor 3ro Bachillerato',
    level: 'Bachillerato',
    courses: ['3 BACH. A', '3 BACH. B']
  }
};
