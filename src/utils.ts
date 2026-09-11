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

import { Activity, Grade, Trimestre, EvaluationComponent, EvaluacionFinalDetails } from './types';

export function getEvaluacionFinalDetails(
  grade: Grade | null | undefined,
  activity: Activity,
  origEq10: number | null
): EvaluacionFinalDetails {
  const defaultRes: EvaluacionFinalDetails = {
    origEq10,
    workScore: null,
    workEq10: null,
    examScore: null,
    examEq10: null,
    calculatedAvg: null,
    finalGrade: origEq10,
    requiresImprovement: false,
    canImprove: false,
    isPending: false,
    attempted: false,
    improved: false,
    noImprovement: false,
    statusMessage: '',
  };

  if (origEq10 === null || isNaN(origEq10)) {
    return defaultRes;
  }

  // Caso A: Nota menor a 7
  if (origEq10 < 7) {
    const workScore = grade?.improvementWorkGrade ?? null;
    const examScore = grade?.improvementExamGrade ?? null;
    const workEq10 = convertTo10(workScore, activity.improvementWorkMaxScore || 10);
    const examEq10 = convertTo10(examScore, activity.improvementExamMaxScore || 10);

    const hasBoth = workEq10 !== null && examEq10 !== null;

    if (hasBoth) {
      const calculatedAvg = Math.trunc(((origEq10 + workEq10 + examEq10) / 3) * 100) / 100;
      
      // Regla de protección de calificación
      if (calculatedAvg < origEq10) {
        return {
          origEq10,
          workScore,
          workEq10,
          examScore,
          examEq10,
          calculatedAvg,
          finalGrade: origEq10, // Se protege la nota original
          requiresImprovement: true,
          canImprove: false,
          isPending: false,
          attempted: true,
          improved: false,
          noImprovement: true,
          statusMessage: 'No hubo mejora de calificación de evaluación final',
        };
      }

      const improved = calculatedAvg > origEq10;
      return {
        origEq10,
        workScore,
        workEq10,
        examScore,
        examEq10,
        calculatedAvg,
        finalGrade: calculatedAvg,
        requiresImprovement: true,
        canImprove: false,
        isPending: false,
        attempted: true,
        improved,
        noImprovement: false,
        statusMessage: improved 
          ? `Mejora de calificación: ${origEq10.toFixed(2)} ➔ ${calculatedAvg.toFixed(2)}`
          : 'Calificación se mantiene igual',
      };
    }

    // Aún no ingresa ambos requisitos obligatorios
    return {
      origEq10,
      workScore,
      workEq10,
      examScore,
      examEq10,
      calculatedAvg: null,
      finalGrade: origEq10,
      requiresImprovement: true,
      canImprove: false,
      isPending: true,
      attempted: workEq10 !== null || examEq10 !== null,
      improved: false,
      noImprovement: false,
      statusMessage: 'Requiere trabajo de refuerzo y examen de mejoramiento',
    };
  }

  // Caso B: Nota entre 7 y 9.99
  if (origEq10 >= 7 && origEq10 < 10) {
    const examScore = grade?.improvementExamGrade ?? null;
    const examEq10 = convertTo10(examScore, activity.improvementExamMaxScore || 10);

    if (examEq10 !== null) {
      const calculatedAvg = Math.trunc(((origEq10 + examEq10) / 2) * 100) / 100;

      // Regla de protección
      if (calculatedAvg < origEq10) {
        return {
          origEq10,
          workScore: null,
          workEq10: null,
          examScore,
          examEq10,
          calculatedAvg,
          finalGrade: origEq10, // Se protege la nota original
          requiresImprovement: false,
          canImprove: true,
          isPending: false,
          attempted: true,
          improved: false,
          noImprovement: true,
          statusMessage: 'No hubo mejora de calificación de evaluación final',
        };
      }

      const improved = calculatedAvg > origEq10;
      return {
        origEq10,
        workScore: null,
        workEq10: null,
        examScore,
        examEq10,
        calculatedAvg,
        finalGrade: calculatedAvg,
        requiresImprovement: false,
        canImprove: true,
        isPending: false,
        attempted: true,
        improved,
        noImprovement: false,
        statusMessage: improved 
          ? `Mejora de calificación: ${origEq10.toFixed(2)} ➔ ${calculatedAvg.toFixed(2)}`
          : 'Calificación se mantiene igual',
      };
    }

    return {
      origEq10,
      workScore: null,
      workEq10: null,
      examScore: null,
      examEq10: null,
      calculatedAvg: null,
      finalGrade: origEq10,
      requiresImprovement: false,
      canImprove: true,
      isPending: false,
      attempted: false,
      improved: false,
      noImprovement: false,
      statusMessage: '',
    };
  }

  // Caso C: Nota igual a 10
  return {
    ...defaultRes,
    finalGrade: 10,
    statusMessage: 'Calificación máxima',
  };
}

export function computeActivityFinalGrade(
  activity: Activity,
  grade?: Grade | null,
  ignoreImprovement = false
): {
  finalGrade: number | null;
  origEq10: number | null;
  efDetails?: EvaluacionFinalDetails;
} {
  const isEvalFinal = activity.component === 'EVALUACIÓN FINAL';
  const origEq10 = computeCompositeOriginal(
    grade?.originalGrade ?? null,
    grade?.globalizationGrade ?? null,
    activity.maxScore,
    activity.globalizationMaxScore,
    isEvalFinal,
    activity.hasGlobalization
  );

  if (isEvalFinal) {
    const efDetails = getEvaluacionFinalDetails(grade, activity, origEq10);
    const finalGrade = ignoreImprovement ? origEq10 : efDetails.finalGrade;
    return { finalGrade, origEq10, efDetails };
  }

  const finalGrade = origEq10 !== null
    ? calculateFinalGrade(origEq10, grade?.reinforcementGrade ?? null, 10, activity.reinforcementMaxScore)
    : null;

  return { finalGrade, origEq10 };
}

export function countStudentReinforcementsForSubject(
  studentId: string,
  activities: Activity[],
  grades: Grade[],
  subject: string,
  course?: string
): number {
  const subjectActivities = activities.filter(a => 
    a.subject === subject && (!course || a.course === course)
  );
  const subjectActivityIds = new Set(subjectActivities.map(a => a.id));

  return grades.filter(g => {
    if (g.studentId !== studentId || !subjectActivityIds.has(g.activityId)) return false;
    const act = subjectActivities.find(a => a.id === g.activityId);
    if (act?.component === 'EVALUACIÓN FINAL') {
      return g.improvementExamGrade != null || g.improvementWorkGrade != null || g.reinforcementGrade != null;
    }
    return g.reinforcementGrade !== null && g.reinforcementGrade !== undefined;
  }).length;
}

export function calculateComponentAverage(
  studentId: string,
  activities: Activity[],
  grades: Grade[],
  trimestre: Trimestre,
  component: EvaluationComponent,
  course: string,
  subject: string,
  ignoreImprovement = false
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
      const { finalGrade } = computeActivityFinalGrade(a, grade, ignoreImprovement);
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
  subject: string,
  ignoreImprovement = false
): number | null {
  const p1 = calculateComponentAverage(studentId, activities, grades, trimestre, '1º APORTE', course, subject, ignoreImprovement);
  const p2 = calculateComponentAverage(studentId, activities, grades, trimestre, '2º APORTE', course, subject, ignoreImprovement);
  const pf = calculateComponentAverage(studentId, activities, grades, trimestre, 'EVALUACIÓN FINAL', course, subject, ignoreImprovement);

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
