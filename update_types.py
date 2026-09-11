import re

with open('src/types.ts', 'r') as f:
    content = f.read()

content = re.sub(
    r"createdAt\?: number;",
    r"createdAt?: number;\n  teacherEmail?: string;",
    content
)

with open('src/types.ts', 'w') as f:
    f.write(content)
