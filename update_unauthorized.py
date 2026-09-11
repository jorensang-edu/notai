import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

unauthorized_code = """
  const { isUnauthorized, existingTeacherEmail } = useMemo(() => {
    const courseActivities = activities.filter(a => a.course === selectedCourse && a.subject === currentSubject);
    const ownerEmail = courseActivities.find(a => a.teacherEmail)?.teacherEmail;
    const currentUserEmail = auth.currentUser?.email;
    const unauthorized = !!(ownerEmail && currentUserEmail && ownerEmail !== currentUserEmail);
    return { isUnauthorized: unauthorized, existingTeacherEmail: ownerEmail };
  }, [activities, selectedCourse, currentSubject]);

  const filteredActivities = useMemo(() => {"""

content = re.sub(
    r"\s*const filteredActivities = useMemo\(\(\) => \{",
    unauthorized_code,
    content
)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
