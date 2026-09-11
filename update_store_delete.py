import re

with open('src/store.ts', 'r') as f:
    content = f.read()

# Make sure we import writeBatch
if 'writeBatch' not in content:
    content = content.replace("from 'firebase/firestore';", "from 'firebase/firestore';\nimport { writeBatch } from 'firebase/firestore';")

old_delete = r"""  const deleteActivity = async \(activityId: string\) => \{\n    try \{\n      await deleteDoc\(doc\(db, 'activities', activityId\)\);\n      // Also delete associated grades\n      const associatedGrades = grades\.filter\(g => g\.activityId === activityId\);\n      for \(const g of associatedGrades\) \{\n        await deleteDoc\(doc\(db, 'grades', `\$\{g\.studentId\}_\$\{activityId\}`\)\);\n      \}\n    \} catch \(e\) \{\n      handleFirestoreError\(e, OperationType\.DELETE, `activities/\$\{activityId\}`\);\n    \}\n  \};"""

new_delete = """  const deleteActivity = async (activityId: string) => {
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, 'activities', activityId));
      
      const associatedGrades = grades.filter(g => g.activityId === activityId);
      for (const g of associatedGrades) {
        batch.delete(doc(db, 'grades', `${g.studentId}_${activityId}`));
      }
      
      await batch.commit();
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `activities/${activityId}`);
    }
  };"""

content = re.sub(old_delete, new_delete, content)

with open('src/store.ts', 'w') as f:
    f.write(content)
