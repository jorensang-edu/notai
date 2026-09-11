import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

# Replace in handleExportConsolidatedExcel
content = re.sub(
    r"const studentActivitiesData = trimActivities\.map\(a => \{\s*const grade = getGradeRecord\(student\.id, a\.id\);\s*const finalGrade = calculateFinalGrade\(grade\?\.originalGrade \?\? null, grade\?\.reinforcementGrade \?\? null, a\.maxScore, a\.reinforcementMaxScore\);\s*return \{ grade, finalGrade \};\s*\}\);\s*studentActivitiesData\.forEach\(actData => \{\s*rowData\.push\(actData\.grade\?\.originalGrade \?\? ''\);\s*rowData\.push\(actData\.grade\?\.reinforcementGrade \?\? ''\);\s*rowData\.push\(actData\.finalGrade \?\? ''\);\s*\}\);",
    """const studentActivitiesData = trimActivities.map(a => {
          const grade = getGradeRecord(student.id, a.id);
          const isEvalFinal = a.component === 'EVALUACIÓN FINAL';
          const origEq10 = computeCompositeOriginal(grade?.originalGrade ?? null, grade?.globalizationGrade ?? null, a.maxScore, a.globalizationMaxScore, isEvalFinal, a.hasGlobalization);
          const refEq10 = convertTo10(grade?.reinforcementGrade ?? null, a.reinforcementMaxScore || a.maxScore);
          const finalGrade = origEq10 !== null ? calculateFinalGrade(origEq10, grade?.reinforcementGrade ?? null, 10, a.reinforcementMaxScore) : null;
          return { origEq10, refEq10, finalGrade };
        });
        
        studentActivitiesData.forEach(actData => {
           rowData.push(actData.origEq10 !== null ? actData.origEq10 : '');
           rowData.push(actData.refEq10 !== null ? actData.refEq10 : '');
           rowData.push(actData.finalGrade !== null ? actData.finalGrade : '');
        });""",
    content
)

# Replace in handleExportExcel
content = re.sub(
    r"const studentActivitiesData = filteredActivities\.map\(a => \{\s*const grade = getGradeRecord\(student\.id, a\.id\);\s*const finalGrade = calculateFinalGrade\(grade\?\.originalGrade \?\? null, grade\?\.reinforcementGrade \?\? null, a\.maxScore, a\.reinforcementMaxScore\);\s*return \{ grade, finalGrade \};\s*\}\);\s*studentActivitiesData\.forEach\(data => \{\s*rowData\.push\(data\.grade\?\.originalGrade \?\? ''\);\s*rowData\.push\(data\.grade\?\.reinforcementGrade \?\? ''\);\s*rowData\.push\(data\.finalGrade \?\? ''\);\s*\}\);",
    """const studentActivitiesData = filteredActivities.map(a => {
        const grade = getGradeRecord(student.id, a.id);
        const isEvalFinal = a.component === 'EVALUACIÓN FINAL';
        const origEq10 = computeCompositeOriginal(grade?.originalGrade ?? null, grade?.globalizationGrade ?? null, a.maxScore, a.globalizationMaxScore, isEvalFinal, a.hasGlobalization);
        const refEq10 = convertTo10(grade?.reinforcementGrade ?? null, a.reinforcementMaxScore || a.maxScore);
        const finalGrade = origEq10 !== null ? calculateFinalGrade(origEq10, grade?.reinforcementGrade ?? null, 10, a.reinforcementMaxScore) : null;
        return { origEq10, refEq10, finalGrade };
      });
      
      studentActivitiesData.forEach(data => {
         rowData.push(data.origEq10 !== null ? data.origEq10 : '');
         rowData.push(data.refEq10 !== null ? data.refEq10 : '');
         rowData.push(data.finalGrade !== null ? data.finalGrade : '');
      });""",
    content
)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
