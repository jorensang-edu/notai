import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

# Replace in handleExportConsolidatedExcel
content = re.sub(
    r"trimActivities\.forEach\(act => \{\s*headerRow\.push\(`\$\{act\.name\} \(\$\{act\.component\}\)`\); // Original",
    r"trimActivities.forEach(act => {\n        const dateStr = act.date ? `[${act.date}] ` : '';\n        headerRow.push(`${dateStr}${act.name} (${act.component})`); // Original",
    content
)

# Replace in handleExportExcel
content = re.sub(
    r"filteredActivities\.forEach\(act => \{\s*headerRow\.push\(act\.name\); // Original",
    r"filteredActivities.forEach(act => {\n      const dateStr = act.date ? `[${act.date}] ` : '';\n      headerRow.push(`${dateStr}${act.name}`); // Original",
    content
)

# Promedio Trimestral -> Promedio final
content = re.sub(
    r"headerRow\.push\('Total Ref\. Global', 'Promedio Trimestral'\);",
    r"headerRow.push('Total Ref. Global', 'Promedio final');",
    content
)

content = re.sub(
    r"headerRow\.push\('Total Ref\. Global', 'Promedio'\);",
    r"headerRow.push('Total Ref. Global', 'Promedio final');",
    content
)

# Replace Promedio Total in UI
content = re.sub(
    r"Promedio<br/>Total",
    r"Promedio<br/>final",
    content
)

# Replace Promedio in UI
content = re.sub(
    r"<th className=\"px-3 py-2 md:px-4 md:py-3 font-semibold text-center border-b border-l border-white/5 bg-\[#0f172a\] md:sticky md:right-0 z-20\">Promedio</th>",
    r'<th className="px-3 py-2 md:px-4 md:py-3 font-semibold text-center border-b border-l border-white/5 bg-[#0f172a] md:sticky md:right-0 z-20">Promedio final</th>',
    content
)

# Remove sticky top-0 from headers
content = re.sub(
    r"<thead className=\"sticky top-0 bg-\[#0f172a\] text-\[11px\] sm:text-xs uppercase tracking-wider text-slate-500 z-10\">",
    r'<thead className="bg-[#0f172a] text-[11px] sm:text-xs uppercase tracking-wider text-slate-500 relative z-10">',
    content
)

content = re.sub(
    r"<thead className=\"sticky top-0 bg-\[#0f172a\] text-\[11px\] sm:text-xs uppercase tracking-wider text-slate-500 z-10 shadow-md\">",
    r'<thead className="bg-[#0f172a] text-[11px] sm:text-xs uppercase tracking-wider text-slate-500 relative z-10 shadow-md">',
    content
)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
