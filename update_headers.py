import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

# Update Excel headers
content = content.replace("headerRow3.push('Val. /10');", "headerRow3.push('10');")

# Update UI Registration view headers
content = re.sub(
    r"<div className=\"text-\[9px\] opacity-60 mt-0\.5\">\{activity\.component\}</div>\s*\{activity\.date && <div className=\"text-\[9px\] text-amber-400/80 font-mono mt-0\.5\">\{activity\.date\}</div>\}\s*<div className=\"text-\[9px\] text-blue-400 font-mono mt-0\.5\" title=\"Calificación máxima base\">/\{activity\.maxScore \|\| 10\}</div>",
    r"{activity.date && <div className=\"text-[9px] text-amber-400/80 font-mono mt-0.5\">{activity.date}</div>}\n                          <div className=\"text-[9px] text-blue-400 font-mono mt-0.5\" title=\"Calificación máxima\">10</div>",
    content
)

# Update UI Matriz view headers
content = re.sub(
    r"<span className=\"text-\[10px\] opacity-60\">\{activity\.component\}</span>\s*\{activity\.date && <span className=\"text-\[9px\] text-amber-400/80 font-mono\">\{activity\.date\}</span>\}",
    r"{activity.date && <span className=\"text-[9px] text-amber-400/80 font-mono mt-0.5\">{activity.date}</span>}\n                            <span className=\"text-[9px] text-blue-400 font-mono mt-0.5\" title=\"Calificación máxima\">10</span>",
    content
)


with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
