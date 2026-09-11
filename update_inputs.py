import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

# Add disabled={isUnauthorized} to maxScore inputs
content = re.sub(
    r"(onChange=\{\(e\) => updateActivity\(activity\.id, \{ globalizationMaxScore:[^\}]+\} \)\}\n\s*className=\"[^\"]+\")",
    r"\1\n                                    disabled={isUnauthorized}",
    content
)

content = re.sub(
    r"(onChange=\{\(e\) => updateActivity\(activity\.id, \{ maxScore:[^\}]+\} \)\}\n\s*className=\"[^\"]+\")",
    r"\1\n                                  disabled={isUnauthorized}",
    content
)

content = re.sub(
    r"(onChange=\{\(e\) => updateActivity\(activity\.id, \{ reinforcementMaxScore:[^\}]+\} \)\}\n\s*className=\"[^\"]+\")",
    r"\1\n                                    disabled={isUnauthorized}",
    content
)

# Add disabled to grade inputs
content = re.sub(
    r"(onChange=\{\(e\) => handleGradeChange\(student\.id, activity\.id, 'globalization', e\.target\.value\)\}\n\s*className=\"[^\"]+\")",
    r"\1\n                                    disabled={isUnauthorized}",
    content
)

content = re.sub(
    r"(onChange=\{\(e\) => handleGradeChange\(student\.id, activity\.id, 'original', e\.target\.value\)\}\n\s*className=\"[^\"]+\")",
    r"\1\n                                  disabled={isUnauthorized}",
    content
)

content = re.sub(
    r"(onChange=\{\(e\) => handleGradeChange\(student\.id, activity\.id, 'reinforcement', e\.target\.value\)\}\n\s*className=\"[^\"]+\")",
    r"\1\n                                      disabled={isUnauthorized || origEq10 === null || origEq10 >= 7}",
    content
)

content = re.sub(
    r"(onChange=\{\(e\) => handleGradeChange\(student\.id, activity\.id, 'observation', e\.target\.value\)\}\n\s*className=\"[^\"]+\")",
    r"\1\n                                  disabled={isUnauthorized}",
    content
)

# Also fix the delete button
content = re.sub(
    r"onClick=\{\(e\) => \{\s*e\.stopPropagation\(\);\s*confirmDeleteActivity\(activity\);\s*\}\}",
    r"onClick={(e) => {\n                              e.stopPropagation();\n                              confirmDeleteActivity(activity);\n                            }}\n                            disabled={isUnauthorized}",
    content
)


with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
