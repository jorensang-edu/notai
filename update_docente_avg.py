import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

# Add imports
content = content.replace("import { formatGrade, getCurrentFormattedDate, calculateFinalGrade, computeCompositeOriginal } from '../utils';", "import { formatGrade, getCurrentFormattedDate, calculateFinalGrade, computeCompositeOriginal, calculateComponentAverage, calculateTrimestralAverage } from '../utils';")

old_avg = """                    const evaluated = studentActivitiesData.filter(a => a.finalGrade !== null);
                    const avg = evaluated.length > 0 ? evaluated.reduce((acc, curr) => acc + curr.finalGrade!, 0) / evaluated.length : null;
                    const missingReinforcements = evaluated.filter(a => a.finalGrade! < 7 && a.grade?.reinforcementGrade == null);"""

new_avg = """                    const evaluated = studentActivitiesData.filter(a => a.finalGrade !== null);
                    
                    let avg = null;
                    if (selectedComponent === 'ALL') {
                      avg = calculateTrimestralAverage(student.id, activities, grades, courseParams.trimestre, selectedCourse, currentSubject);
                    } else {
                      avg = calculateComponentAverage(student.id, activities, grades, courseParams.trimestre, selectedComponent as any, selectedCourse, currentSubject);
                    }

                    const missingReinforcements = evaluated.filter(a => a.finalGrade! < 7 && a.grade?.reinforcementGrade == null);"""

content = content.replace(old_avg, new_avg)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
