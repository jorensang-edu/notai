import { CourseName } from './types';

/**
 * Representa la asignación y datos de contacto de cada Docente Tutor.
 * Modifique los correos electrónicos ('email') con las direcciones institucionales o personales reales
 * a las que deben llegar los reportes semanales automatizados de calificaciones bajas (< 7/10).
 */
export interface TutorAssignment {
  name: string;
  email: string; // Correo de destino del docente tutor (ej. docente@cedfi.edu.ec o correo de prueba)
  level: string; // Nivel educativo: 'Básica Superior' | 'Bachillerato'
  courses: CourseName[]; // Cursos asignados a su tutoría
}

/**
 * MATRIZ CENTRAL DE TUTORES Y CORREOS ELECTRÓNICOS
 * 
 * Cada clave corresponde al código único de acceso del tutor (ej. '9YF7P').
 * Aquí se definen los correos reales utilizados por:
 * 1. El Cron semanal de Vercel (/api/cron-reporte).
 * 2. El módulo de pruebas piloto (/api/probar-correo).
 * 3. El panel de Tutoría de NotAI.
 */
export const TUTOR_MATRIX: Record<string, TutorAssignment> = {
  '9YF7P': {
    name: 'FERNANDA TORRES',
    email: 'mtorres@cedfi.edu.ec',
    level: 'Básica Superior',
    courses: ['8 EGB A', '8 EGB B']
  },
  '9D44P': {
    name: 'FABIOLA MORA',
    email: 'amoram@cedfi.edu.ec',
    level: 'Básica Superior',
    courses: ['9 EGB A', '9 EGB B']
  },
  '64TX4': {
    name: 'JOBANNY PEREZ',
    email: 'jobanny.perez@cedfi.edu.ec',
    level: 'Básica Superior',
    courses: ['10 EGB A', '10 EGB B']
  },
  'PPRXM': {
    name: 'ELIANA IZQUIERDO',
    email: 'eizquierdoc@cedfi.edu.ec',
    level: 'Bachillerato',
    courses: ['1 BACH. A', '1 BACH. B']
  },
  'L3KMS': {
    name: 'SANTIAGO VINTIMILLA',
    email: 'svintimillac@cedfi.edu.ec',
    level: 'Bachillerato',
    courses: ['2 BACH. A', '2 BACH. B']
  },
  'MJS7F': {
    name: 'NICOLAS AYORA',
    email: 'eayorap@cedfi.edu.ec',
    level: 'Bachillerato',
    courses: ['3 BACH. A', '3 BACH. B']
  }
};
