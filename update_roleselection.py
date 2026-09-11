import re

with open('src/components/RoleSelection.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r"onSelectRole: \(role: Role\) => void;",
    r"onSelectRole: (role: Role, code?: string) => void;",
    content
)

content = re.sub(
    r"if \(validPasswords\.includes\(password\.toUpperCase\(\)\)\) \{\s*onSelectRole\('docente'\);\s*\}",
    r"if (validPasswords.includes(password.toUpperCase())) {\n      onSelectRole('docente', password.toUpperCase());\n    }",
    content
)

with open('src/components/RoleSelection.tsx', 'w') as f:
    f.write(content)
