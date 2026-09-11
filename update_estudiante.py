import re

with open('src/components/EstudianteView.tsx', 'r') as f:
    content = f.read()

# Need to import new functions
content = content.replace("import { formatGrade, getCurrentFormattedDate, calculateFinalGrade, computeCompositeOriginal } from '../utils';", "import { formatGrade, getCurrentFormattedDate, calculateFinalGrade, computeCompositeOriginal, calculateComponentAverage, calculateTrimestralAverage, calculateAnnualAverage } from '../utils';")

# Update studentData
old_studentData = """  const studentData = useMemo(() => {
    if (!currentStudent) return null;
    
    // Filter activities for this student's course and the currently selected subject
    const studentActivities = activities.filter(a => 
       a.course === currentStudent.course && 
       a.subject === selectedSubject &&
      (selectedTrimestre === 'ALL' || a.trimestre === selectedTrimestre) &&
      (selectedComponent === 'ALL' || a.component === selectedComponent)
    );
    
    // Total reinforcements across ALL subjects and activities for this student
    const totalReinforcements = grades.filter(g => g.studentId === currentStudent.id && g.reinforcementGrade !== null).length;

    let totalScore = 0;
    let gradedCount = 0;
    let requiresReinforcement = false;
    let history: any[] = [];
    let pending: any[] = [];

    studentActivities.forEach(activity => {
      const grade = grades.find(g => g.studentId === currentStudent.id && g.activityId === activity.id);
      
      let finalScore = null;
      if (grade) {
        const isEvalFinal = activity.component === 'EVALUACIÓN FINAL';
        const origEq10 = computeCompositeOriginal(grade.originalGrade, grade.globalizationGrade, activity.maxScore, activity.globalizationMaxScore, isEvalFinal, activity.hasGlobalization);
        
        finalScore = origEq10 !== null ? calculateFinalGrade(origEq10, grade.reinforcementGrade, 10, activity.reinforcementMaxScore) : null;
        
        if (finalScore !== null) {
          totalScore += finalScore;
          gradedCount++;
          if (finalScore < 7) {
            requiresReinforcement = true;
          }
        }
      }

      const item = {
        activity,
        grade,
        finalScore
      };

      if (finalScore !== null) {
        history.push(item);
      } else {
        pending.push(item);
      }
    });

    const average = gradedCount > 0 ? totalScore / gradedCount : null;

    return { history, pending, requiresReinforcement, average, totalReinforcements };
  }, [currentStudent, activities, grades, selectedSubject, selectedTrimestre, selectedComponent]);"""

new_studentData = """  const studentData = useMemo(() => {
    if (!currentStudent) return null;
    
    // Filter activities for this student's course and the currently selected subject
    const studentActivities = activities.filter(a => 
       a.course === currentStudent.course && 
       a.subject === selectedSubject &&
      (selectedTrimestre === 'ALL' || a.trimestre === selectedTrimestre) &&
      (selectedComponent === 'ALL' || a.component === selectedComponent)
    );
    
    // Total reinforcements across ALL subjects and activities for this student
    const totalReinforcements = grades.filter(g => g.studentId === currentStudent.id && g.reinforcementGrade !== null).length;

    let requiresReinforcement = false;
    let history: any[] = [];
    let pending: any[] = [];

    studentActivities.forEach(activity => {
      const grade = grades.find(g => g.studentId === currentStudent.id && g.activityId === activity.id);
      
      let finalScore = null;
      if (grade) {
        const isEvalFinal = activity.component === 'EVALUACIÓN FINAL';
        const origEq10 = computeCompositeOriginal(grade.originalGrade, grade.globalizationGrade, activity.maxScore, activity.globalizationMaxScore, isEvalFinal, activity.hasGlobalization);
        
        finalScore = origEq10 !== null ? calculateFinalGrade(origEq10, grade.reinforcementGrade, 10, activity.reinforcementMaxScore) : null;
        
        if (finalScore !== null) {
          if (finalScore < 7) {
            requiresReinforcement = true;
          }
        }
      }

      const item = {
        activity,
        grade,
        finalScore
      };

      if (finalScore !== null) {
        history.push(item);
      } else {
        pending.push(item);
      }
    });

    const currentTrimestreToUse = selectedTrimestre === 'ALL' ? '1º Trimestre' : selectedTrimestre;

    let averageAporte = null;
    if (selectedComponent !== 'ALL') {
      averageAporte = calculateComponentAverage(currentStudent.id, activities, grades, currentTrimestreToUse, selectedComponent as any, currentStudent.course, selectedSubject);
    } else {
      // If ALL is selected, calculate a generic average for the selected items just to have something?
      // Or maybe show the Trimestral average in the 'Aporte' box if ALL is selected?
      averageAporte = calculateTrimestralAverage(currentStudent.id, activities, grades, currentTrimestreToUse, currentStudent.course, selectedSubject);
    }

    const averageTrimestral = calculateTrimestralAverage(currentStudent.id, activities, grades, currentTrimestreToUse, currentStudent.course, selectedSubject);
    const averageAnual = calculateAnnualAverage(currentStudent.id, activities, grades, currentStudent.course, selectedSubject);

    return { history, pending, requiresReinforcement, averageAporte, averageTrimestral, averageAnual, totalReinforcements };
  }, [currentStudent, activities, grades, selectedSubject, selectedTrimestre, selectedComponent]);"""

content = content.replace(old_studentData, new_studentData)

with open('src/components/EstudianteView.tsx', 'w') as f:
    f.write(content)
