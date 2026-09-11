import { format } from 'date-fns';

export function getCurrentFormattedDate(): string {
  return format(new Date(), 'dd/MM/yyyy');
}

export function convertTo10(grade: number | string | null | undefined, maxScore: number | string | undefined): number | null {
  if (grade === null || grade === undefined || grade === '') return null;
  const numGrade = typeof grade === 'number' ? grade : parseFloat(String(grade));
  if (isNaN(numGrade)) return null;
  const max = maxScore && Number(maxScore) > 0 ? Number(maxScore) : 10;
  if (max === 10) {
    // Ensure we also truncate to 2 decimals if it's already over 10
    return Math.trunc(numGrade * 100) / 100;
  }
  const converted = (numGrade / max) * 10;
  return Math.trunc(converted * 100) / 100;
}

export function computeCompositeOriginal(
  original: number | string | null | undefined, 
  globalization: number | string | null | undefined, 
  maxScore: number | string | undefined, 
  globalizationMaxScore: number | string | undefined,
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

export function calculateFinalGrade(
  original: number | string | null | undefined, 
  reinforcement: number | string | null | undefined, 
  maxScore?: number | string, 
  reinforcementMaxScore?: number | string
): number | null {
  const orig10 = convertTo10(original, maxScore);
  const ref10 = convertTo10(reinforcement, reinforcementMaxScore || maxScore);

  if (orig10 === null) return null;
  if (ref10 === null || ref10 === undefined) return orig10;
  
  if (ref10 < orig10) {
    return orig10;
  }
  
  return (orig10 + ref10) / 2;
}

export function formatGrade(grade: number | string | null | undefined): string {
  if (grade === null || grade === undefined || grade === '') return '-';
  const num = typeof grade === 'number' ? grade : parseFloat(String(grade));
  if (isNaN(num)) return '-';
  return num.toFixed(2);
}

import { 
  Activity, 
  Grade, 
  Trimestre, 
  EvaluationComponent, 
  EvaluacionFinalDetails, 
  StudentGlobalImprovementStats, 
  ActivityImprovementUsage,
  ImprovementCategory 
} from './types';

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
    category: 'none',
    requiresWork: false,
    requiresExam: false,
    isPending: false,
    hasNoRecord: false,
    attempted: false,
    improved: false,
    noImprovement: false,
    statusMessage: '',
  };

  if (origEq10 === null || isNaN(origEq10)) {
    return defaultRes;
  }

  // Rango 1: 0.01 a 6.99 (o cualquier nota < 7) -> Mejora con Refuerzo Pedagógico
  if (origEq10 < 7) {
    const workScore = grade?.improvementWorkGrade ?? null;
    const examScore = grade?.improvementExamGrade ?? null;
    const workEq10 = convertTo10(workScore, activity.improvementWorkMaxScore || 10);
    const examEq10 = convertTo10(examScore, activity.improvementExamMaxScore || 10);

    const hasWork = workEq10 !== null;
    const hasExam = examEq10 !== null;
    const hasBoth = hasWork && hasExam;
    const hasNone = workScore === null && examScore === null;

    if (hasNone) {
      return {
        origEq10,
        workScore: null,
        workEq10: null,
        examScore: null,
        examEq10: null,
        calculatedAvg: null,
        finalGrade: origEq10, // Se mantiene la nota original para el cálculo trimestral
        category: 'refuerzo',
        requiresWork: true,
        requiresExam: true,
        isPending: true,
        hasNoRecord: true,
        attempted: false,
        improved: false,
        noImprovement: false,
        statusMessage: 'Alerta: Calificación menor a 7 sin registro de mejoramiento. Se mantiene nota original.',
      };
    }

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
          finalGrade: origEq10, // Se protege y mantiene la nota original
          category: 'refuerzo',
          requiresWork: true,
          requiresExam: true,
          isPending: false,
          hasNoRecord: false,
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
        category: 'refuerzo',
        requiresWork: true,
        requiresExam: true,
        isPending: false,
        hasNoRecord: false,
        attempted: true,
        improved,
        noImprovement: false,
        statusMessage: improved 
          ? `Mejora con refuerzo pedagógico: ${origEq10.toFixed(2)} ➔ ${calculatedAvg.toFixed(2)}`
          : 'Calificación se mantiene igual',
      };
    }

    // Ingreso parcial (falta trabajo o examen)
    return {
      origEq10,
      workScore,
      workEq10,
      examScore,
      examEq10,
      calculatedAvg: null,
      finalGrade: origEq10, // Se mantiene original mientras esté incompleto
      category: 'refuerzo',
      requiresWork: true,
      requiresExam: true,
      isPending: true,
      hasNoRecord: false,
      attempted: true,
      improved: false,
      noImprovement: false,
      statusMessage: hasWork 
        ? 'Pendiente: Falta examen escrito de mejoramiento' 
        : 'Pendiente: Falta trabajo de refuerzo',
    };
  }

  // Rango 2: 7.00 a 8.99 -> Mejora directa (únicamente examen escrito)
  if (origEq10 >= 7 && origEq10 < 9) {
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
          category: 'directa',
          requiresWork: false,
          requiresExam: true,
          isPending: false,
          hasNoRecord: false,
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
        category: 'directa',
        requiresWork: false,
        requiresExam: true,
        isPending: false,
        hasNoRecord: false,
        attempted: true,
        improved,
        noImprovement: false,
        statusMessage: improved 
          ? `Mejora directa: ${origEq10.toFixed(2)} ➔ ${calculatedAvg.toFixed(2)}`
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
      category: 'directa',
      requiresWork: false,
      requiresExam: true,
      isPending: false,
      hasNoRecord: false,
      attempted: false,
      improved: false,
      noImprovement: false,
      statusMessage: 'Rango 7.00 a 8.99: Examen de mejoramiento opcional',
    };
  }

  // Rango 3: Calificación >= 9.00 (No aplica mejoramiento)
  return {
    ...defaultRes,
    finalGrade: origEq10,
    category: 'none',
    requiresWork: false,
    requiresExam: false,
    statusMessage: 'Calificación ≥ 9.00: No aplica proceso de mejoramiento',
  };
}

export function getStudentGlobalImprovementStats(
  studentId: string,
  activities: Activity[],
  grades: Grade[],
  course?: string
): StudentGlobalImprovementStats {
  const result: StudentGlobalImprovementStats = {
    mejoraDirecta: {
      totalUsed: 0,
      maxAllowed: 3,
      isLimitReached: false,
      byTrimestre: {
        '1º Trimestre': { used: 0, maxAllowed: 1, isLimitReached: false, activities: [] },
        '2º Trimestre': { used: 0, maxAllowed: 1, isLimitReached: false, activities: [] },
        '3º Trimestre': { used: 0, maxAllowed: 1, isLimitReached: false, activities: [] },
      },
      activities: [],
    },
    mejoraRefuerzo: {
      totalUsed: 0,
      maxAllowed: 6,
      isLimitReached: false,
      activities: [],
    },
    unimprovedAlerts: [],
  };

  const evalFinalActivities = activities.filter(a => 
    a.component === 'EVALUACIÓN FINAL' && (!course || a.course === course)
  );

  evalFinalActivities.forEach(activity => {
    const grade = grades.find(g => g.studentId === studentId && g.activityId === activity.id);
    const { origEq10, efDetails } = computeActivityFinalGrade(activity, grade);

    if (origEq10 === null) return;

    const trimestre: Trimestre = (activity.trimestre && ['1º Trimestre', '2º Trimestre', '3º Trimestre'].includes(activity.trimestre))
      ? activity.trimestre
      : '1º Trimestre';

    // Rango 0.01 a 6.99: Mejora con Refuerzo Pedagógico (máximo 6 al año)
    if (origEq10 < 7) {
      const hasAttempt = grade?.improvementWorkGrade != null || grade?.improvementExamGrade != null;
      if (hasAttempt) {
        const usage: ActivityImprovementUsage = {
          activityId: activity.id,
          activityName: activity.name,
          subject: activity.subject,
          trimestre,
          origEq10,
          calculatedAvg: efDetails?.calculatedAvg ?? null,
          finalGrade: efDetails?.finalGrade ?? origEq10,
          workGrade: grade?.improvementWorkGrade,
          examGrade: grade?.improvementExamGrade,
          improved: efDetails?.improved ?? false,
          noImprovement: efDetails?.noImprovement ?? false,
        };
        result.mejoraRefuerzo.activities.push(usage);
        result.mejoraRefuerzo.totalUsed++;
      } else {
        // Alerta: Calificación menor a 7 sin registro de mejoramiento
        result.unimprovedAlerts.push({
          activityId: activity.id,
          activityName: activity.name,
          subject: activity.subject,
          trimestre,
          origEq10,
        });
      }
    } 
    // Rango 7.00 a 8.99: Mejora Directa (máximo 1 por trimestre, 3 al año)
    else if (origEq10 >= 7 && origEq10 < 9) {
      const hasExam = grade?.improvementExamGrade != null;
      if (hasExam) {
        const usage: ActivityImprovementUsage = {
          activityId: activity.id,
          activityName: activity.name,
          subject: activity.subject,
          trimestre,
          origEq10,
          calculatedAvg: efDetails?.calculatedAvg ?? null,
          finalGrade: efDetails?.finalGrade ?? origEq10,
          examGrade: grade?.improvementExamGrade,
          improved: efDetails?.improved ?? false,
          noImprovement: efDetails?.noImprovement ?? false,
        };
        result.mejoraDirecta.activities.push(usage);
        result.mejoraDirecta.totalUsed++;
        if (result.mejoraDirecta.byTrimestre[trimestre]) {
          result.mejoraDirecta.byTrimestre[trimestre].used++;
          result.mejoraDirecta.byTrimestre[trimestre].activities.push(usage);
        }
      }
    }
  });

  result.mejoraDirecta.isLimitReached = result.mejoraDirecta.totalUsed >= result.mejoraDirecta.maxAllowed;
  (['1º Trimestre', '2º Trimestre', '3º Trimestre'] as Trimestre[]).forEach(t => {
    result.mejoraDirecta.byTrimestre[t].isLimitReached = result.mejoraDirecta.byTrimestre[t].used >= result.mejoraDirecta.byTrimestre[t].maxAllowed;
  });

  result.mejoraRefuerzo.isLimitReached = result.mejoraRefuerzo.totalUsed >= result.mejoraRefuerzo.maxAllowed;

  return result;
}

export function canStudentRegisterImprovement(
  studentId: string,
  activity: Activity,
  origEq10: number | null,
  activities: Activity[],
  grades: Grade[],
  course?: string
): {
  canRegister: boolean;
  reason?: string;
  category: ImprovementCategory;
  isLimitReached: boolean;
} {
  if (origEq10 === null || isNaN(origEq10)) {
    return { canRegister: false, category: 'none', isLimitReached: false, reason: 'Evaluación no calificada' };
  }
  if (origEq10 >= 9.00) {
    return { canRegister: false, category: 'none', isLimitReached: false, reason: 'Calificación ≥ 9.00 no requiere proceso de mejoramiento' };
  }

  const actTrimestre: Trimestre = (activity.trimestre && ['1º Trimestre', '2º Trimestre', '3º Trimestre'].includes(activity.trimestre))
    ? activity.trimestre
    : '1º Trimestre';

  // Otras actividades de evaluación final para validar límites
  const otherActivities = activities.filter(a => 
    a.component === 'EVALUACIÓN FINAL' && a.id !== activity.id && (!course || a.course === course)
  );

  if (origEq10 >= 7.00 && origEq10 < 9.00) {
    // Mejora directa: máx 1 por trimestre, máx 3 al año
    let otherDirectaYear = 0;
    let otherDirectaTrimestre = 0;

    otherActivities.forEach(otherAct => {
      const otherG = grades.find(g => g.studentId === studentId && g.activityId === otherAct.id);
      if (otherG?.improvementExamGrade != null) {
        const { origEq10: otherOrig } = computeActivityFinalGrade(otherAct, otherG);
        if (otherOrig !== null && otherOrig >= 7.00 && otherOrig < 9.00) {
          otherDirectaYear++;
          const otherTrim = (otherAct.trimestre && ['1º Trimestre', '2º Trimestre', '3º Trimestre'].includes(otherAct.trimestre))
            ? otherAct.trimestre
            : '1º Trimestre';
          if (otherTrim === actTrimestre) {
            otherDirectaTrimestre++;
          }
        }
      }
    });

    if (otherDirectaTrimestre >= 1) {
      return {
        canRegister: false,
        category: 'directa',
        isLimitReached: true,
        reason: `Límite alcanzado: Ya utilizó 1 mejora directa en ${actTrimestre} (máximo 1 por trimestre)`,
      };
    }

    if (otherDirectaYear >= 3) {
      return {
        canRegister: false,
        category: 'directa',
        isLimitReached: true,
        reason: 'Límite anual alcanzado: Ya utilizó 3 mejoras directas en el año lectivo (máximo 3 al año)',
      };
    }

    return {
      canRegister: true,
      category: 'directa',
      isLimitReached: false,
    };
  }

  // origEq10 < 7.00: Mejora con refuerzo pedagógico (máx 6 al año)
  let otherRefuerzoYear = 0;
  otherActivities.forEach(otherAct => {
    const otherG = grades.find(g => g.studentId === studentId && g.activityId === otherAct.id);
    if (otherG?.improvementWorkGrade != null || otherG?.improvementExamGrade != null) {
      const { origEq10: otherOrig } = computeActivityFinalGrade(otherAct, otherG);
      if (otherOrig !== null && otherOrig < 7.00) {
        otherRefuerzoYear++;
      }
    }
  });

  if (otherRefuerzoYear >= 6) {
    return {
      canRegister: false,
      category: 'refuerzo',
      isLimitReached: true,
      reason: 'Límite anual alcanzado: Ya utilizó 6 mejoras con refuerzo pedagógico en el año lectivo (máximo 6 al año)',
    };
  }

  return {
    canRegister: true,
    category: 'refuerzo',
    isLimitReached: false,
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
    (a.trimestre === trimestre || (!a.trimestre && trimestre === '1º Trimestre')) && 
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
