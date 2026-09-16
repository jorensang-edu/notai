import { CourseName } from './types';

export interface TutorAssignment {
  name: string;
  level: string;
  courses: CourseName[];
}

export const TUTOR_MATRIX: Record<string, TutorAssignment> = {
  '9YF7P': {
    name: 'FERNANDA TORRES',
    level: 'Básica Superior',
    courses: ['8 EGB A', '8 EGB B']
  },
  '9D44P': {
    name: 'FABIOLA MORA',
    level: 'Básica Superior',
    courses: ['9 EGB A', '9 EGB B']
  },
  '64TX4': {
    name: 'JOBANNY PEREZ',
    level: 'Básica Superior',
    courses: ['10 EGB A', '10 EGB B']
  },
  'PPRXM': {
    name: 'ELIANA IZQUIERDO',
    level: 'Bachillerato',
    courses: ['1 BACH. A', '1 BACH. B']
  },
  'L3KMS': {
    name: 'SANTIAGO VINTIMILLA',
    level: 'Bachillerato',
    courses: ['2 BACH. A', '2 BACH. B']
  },
  'MJS7F': {
    name: 'NICOLAS AYORA',
    level: 'Bachillerato',
    courses: ['3 BACH. A', '3 BACH. B']
  }
};
