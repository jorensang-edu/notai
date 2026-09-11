import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

# Registration View
content = content.replace(
    'thead className="bg-[#0f172a] text-[11px] sm:text-xs uppercase tracking-wider text-slate-500 relative z-10"',
    'thead className="bg-[#0f172a] text-[11px] sm:text-xs uppercase tracking-wider text-slate-500 sticky top-0 z-30 shadow-md"'
)
content = content.replace(
    '<th className="px-3 py-2 md:px-4 md:py-3 font-semibold border-b border-r border-white/5 bg-[#0f172a] sticky left-0 z-20">Estudiante</th>',
    '<th className="px-3 py-2 md:px-4 md:py-3 font-semibold border-b border-r border-white/5 bg-[#0f172a] sticky left-0 z-40">Estudiante</th>'
)
content = content.replace(
    '<th key={activity.id} className="px-3 py-2 md:px-4 md:py-3 font-semibold text-center border-b border-white/5 min-w-[120px] relative group/th">',
    '<th key={activity.id} className="px-3 py-2 md:px-4 md:py-3 font-semibold text-center border-b border-white/5 bg-[#0f172a] min-w-[120px] relative group/th">'
)


# Matrix View
content = content.replace(
    'thead className="bg-[#0f172a] text-[11px] sm:text-xs uppercase tracking-wider text-slate-500 relative z-10 shadow-md"',
    'thead className="bg-[#0f172a] text-[11px] sm:text-xs uppercase tracking-wider text-slate-500 sticky top-0 z-30 shadow-md"'
)
content = content.replace(
    '<th className="px-4 py-3 font-semibold border-b border-r border-white/5 bg-[#0f172a] sticky left-0 z-20" rowSpan={2}>',
    '<th className="px-4 py-3 font-semibold border-b border-r border-white/5 bg-[#0f172a] sticky left-0 z-40" rowSpan={2}>'
)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
