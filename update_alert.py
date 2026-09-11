import re

with open('src/components/DocenteView.tsx', 'r') as f:
    content = f.read()

alert_code = """
          {isUnauthorized && (
            <div className="shrink-0 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start sm:items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 sm:mt-0" />
              <p className="text-sm text-rose-200">
                <strong className="text-rose-100 font-semibold">Acceso restringido:</strong> Esta asignatura ({currentSubject}) en {selectedCourse} ya está siendo gestionada por otro docente ({existingTeacherEmail}). No puedes crear actividades ni modificar calificaciones.
              </p>
            </div>
          )}
"""

content = re.sub(
    r"(<Search className=\"absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400\" />\s*<input[^>]*/>\s*</div>)",
    r"\1\n" + alert_code,
    content
)

with open('src/components/DocenteView.tsx', 'w') as f:
    f.write(content)
