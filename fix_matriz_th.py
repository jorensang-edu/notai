import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

# Replace the inner div of Matriz th completely
content = re.sub(
    r"<div className=\"flex items-center justify-center gap-2 mt-1 bg-black/20 p-1\.5 rounded-lg border border-white/5 w-full\">.*?</div>\s*</div>\s*</th>",
    r"</div>\n                        </th>",
    content,
    flags=re.DOTALL
)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
