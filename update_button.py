import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r"onClick=\{\(\) => setIsCreatingActivity\(true\)\}\s*className=\"bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2\"",
    r"onClick={() => setIsCreatingActivity(true)}\n                  disabled={isUnauthorized}\n                  className={`px-4 py-2 rounded-lg text-sm font-bold shadow-lg transition-all flex items-center gap-2 ${isUnauthorized ? 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20'}`}",
    content
)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
