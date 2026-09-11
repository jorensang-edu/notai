import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r"disabled=\{isUnauthorized \|\| origEq10 === null \|\| origEq10 >= 7\}\n\s*disabled=\{origEq10 === null \|\| origEq10 >= 7\}",
    r"disabled={isUnauthorized || origEq10 === null || origEq10 >= 7}",
    content
)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
