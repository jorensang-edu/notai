import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

# Let's put an alert banner at the top of the section (just below the header)
old_section = r"""        <section className="flex-1 p-4 md:p-8 flex flex-col gap-6 overflow-hidden">"""

new_section = """        <section className="flex-1 p-4 md:p-8 flex flex-col gap-6 overflow-hidden">
          {isUnauthorized && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex items-start gap-3 shrink-0">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-rose-400 text-sm">Acceso Restringido</h3>
                <p className="text-xs text-rose-300 mt-1">
                  Su código de docente no tiene permisos para modificar la asignatura de <b>{currentSubject}</b> en el curso <b>{selectedCourse}</b>. 
                  Solo puede visualizar las calificaciones en modo lectura.
                </p>
              </div>
            </div>
          )}"""

content = re.sub(old_section, new_section, content)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
