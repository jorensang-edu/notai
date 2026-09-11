import { format } from 'date-fns';

export function getCurrentFormattedDate(): string {
  return format(new Date(), 'dd/MM/yyyy');
}

export function convertTo10(grade: number | null, maxScore: number | undefined): number | null {
  if (grade === null || isNaN(grade)) return null;
  const max = maxScore && maxScore > 0 ? maxScore : 10;
  if (max === 10) {
    // Ensure we also truncate to 2 decimals if it's already over 10
    return Math.trunc(grade * 100) / 100;
  }
  const converted = (grade / max) * 10;
  return Math.trunc(converted * 100) / 100;
}

export function computeCompositeOriginal(
  original: number | null, 
  globalization: number | null | undefined, 
  maxScore: number | undefined, 
  globalizationMaxScore: number | undefined,
  isEvalFinal: boolean,
  hasGlobalization?: boolean
): number | null {
  if (!isEvalFinal) {
    return convertTo10(original, maxScore);
  }

  const writtenEq10 = convertTo10(original, maxScore);
  
  if (hasGlobalization) {
    const globEq10 = globalization != null ? convertTo10(globalization, globalizationMaxScore) : null;
    if (writtenEq10 !== null) {
      if (globEq10 !== null) {
        return Math.trunc(((globEq10 * 0.2) + (writtenEq10 * 0.8)) * 100) / 100;
      } else {
        return writtenEq10;
      }
    }
  } else {
    return writtenEq10;
  }

  return null;
}

export function calculateFinalGrade(original: number | null, reinforcement: number | null, maxScore?: number, reinforcementMaxScore?: number): number | null {
  const orig10 = convertTo10(original, maxScore);
  const ref10 = convertTo10(reinforcement, reinforcementMaxScore || maxScore);

  if (orig10 === null) return null;
  if (ref10 === null || ref10 === undefined) return orig10;
  
  if (ref10 < orig10) {
    return orig10;
  }
  
  return (orig10 + ref10) / 2;
}

export function formatGrade(grade: number | null): string {
  if (grade === null || isNaN(grade)) return '-';
  return grade.toFixed(2);
}

import { Activity, Grade, Trimestre, EvaluationComponent } from './types';

export function calculateComponentAverage(
  studentId: string,
  activities: Activity[],
  grades: Grade[],
  trimestre: Trimestre,
  component: EvaluationComponent,
  course: string,
  subject: string
): number | null {
  const componentActivities = activities.filter(a => 
    a.trimestre === trimestre && 
    a.component === component &&
    a.course === course &&
    a.subject === subject
  );
  
  if (componentActivities.length === 0) return null;

  let total = 0;
  let count = 0;

  for (const a of componentActivities) {
    const grade = grades.find(g => g.studentId === studentId && g.activityId === a.id);
    if (grade) {
      const isEvalFinal = a.component === 'EVALUACIÓN FINAL';
      const origEq10 = computeCompositeOriginal(
        grade.originalGrade, 
        grade.globalizationGrade, 
        a.maxScore, 
        a.globalizationMaxScore, 
        isEvalFinal, 
        a.hasGlobalization
      );
      const finalGrade = origEq10 !== null ? calculateFinalGrade(origEq10, grade.reinforcementGrade, 10, a.reinforcementMaxScore) : null;
      if (finalGrade !== null) {
        total += finalGrade;
        count++;
      }
    }
  }

  return count > 0 ? total / count : null;
}

export function calculateTrimestralAverage(
  studentId: string,
  activities: Activity[],
  grades: Grade[],
  trimestre: Trimestre,
  course: string,
  subject: string
): number | null {
  const p1 = calculateComponentAverage(studentId, activities, grades, trimestre, '1º APORTE', course, subject);
  const p2 = calculateComponentAverage(studentId, activities, grades, trimestre, '2º APORTE', course, subject);
  const pf = calculateComponentAverage(studentId, activities, grades, trimestre, 'EVALUACIÓN FINAL', course, subject);

  let totalWeighted = 0;
  let weightSum = 0;

  if (p1 !== null) {
    totalWeighted += p1 * 0.40;
    weightSum += 0.40;
  }
  if (p2 !== null) {
    totalWeighted += p2 * 0.40;
    weightSum += 0.40;
  }
  if (pf !== null) {
    totalWeighted += pf * 0.20;
    weightSum += 0.20;
  }

  if (weightSum === 0) return null;

  return totalWeighted / weightSum;
}

export function calculateAnnualAverage(
  studentId: string,
  activities: Activity[],
  grades: Grade[],
  course: string,
  subject: string
): number | null {
  const t1 = calculateTrimestralAverage(studentId, activities, grades, '1º Trimestre', course, subject);
  const t2 = calculateTrimestralAverage(studentId, activities, grades, '2º Trimestre', course, subject);
  const t3 = calculateTrimestralAverage(studentId, activities, grades, '3º Trimestre', course, subject);

  let total = 0;
  let count = 0;
  if (t1 !== null) { total += t1; count++; }
  if (t2 !== null) { total += t2; count++; }
  if (t3 !== null) { total += t3; count++; }

  return count > 0 ? total / count : null;
}
