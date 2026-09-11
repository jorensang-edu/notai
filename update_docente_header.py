import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

old_th = """                    <th className="px-4 py-3 font-semibold text-center border-b border-l border-white/5 bg-[#0f172a] md:sticky md:right-[90px] z-20" rowSpan={2}>
                      Promedio<br/>final
                    </th>"""

new_th = """                    <th className="px-4 py-3 font-semibold text-center border-b border-l border-white/5 bg-[#0f172a] md:sticky md:right-[90px] z-20" rowSpan={2}>
                      Promedio<br/>{selectedComponent === 'ALL' ? 'Trimestral' : 'Aporte'}
                    </th>"""

content = content.replace(old_th, new_th)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
