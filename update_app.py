import re

with open('src/App.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r"const \[role, setRole\] = useState<Role>\('none'\);",
    r"const [role, setRole] = useState<Role>('none');\n  const [teacherCode, setTeacherCode] = useState<string>('');",
    content
)

content = re.sub(
    r"\{role === 'none' && <RoleSelection onSelectRole=\{setRole\} />\}",
    r"{role === 'none' && <RoleSelection onSelectRole={(r, code) => { setRole(r); if (code) setTeacherCode(code); }} />}",
    content
)

content = re.sub(
    r"\{role === 'docente' && <DocenteView store=\{store\} onLogout=\{\(\) => setRole\('none'\)\} />\}",
    r"{role === 'docente' && <DocenteView store={store} teacherCode={teacherCode} onLogout={() => { setRole('none'); setTeacherCode(''); }} />}",
    content
)

with open('src/App.tsx', 'w') as f:
    f.write(content)
