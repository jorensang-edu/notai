import re

with open('src/store.ts', 'r') as f:
    content = f.read()

content = re.sub(
    r"date: getCurrentFormattedDate\(\),\s*createdAt: Date\.now\(\),",
    r"date: getCurrentFormattedDate(),\n      createdAt: Date.now(),\n      teacherEmail: auth.currentUser?.email || undefined,",
    content
)

with open('src/store.ts', 'w') as f:
    f.write(content)
