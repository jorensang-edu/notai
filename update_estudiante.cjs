const fs = require('fs');
let content = fs.readFileSync('src/components/EstudianteView.tsx', 'utf8');

// 1. Add Trimestre and EvaluationComponent to imports
content = content.replace(
  `import { Student, Level, SubjectName } from '../types';`,
  `import { Student, Level, SubjectName, Trimestre, EvaluationComponent } from '../types';`
);

// 2. Add state
const stateTarget = `const [selectedSubject, setSelectedSubject] = useState<SubjectName>('Matemáticas');`;
const stateReplacement = `const [selectedSubject, setSelectedSubject] = useState<SubjectName>('Matemáticas');
  const [selectedTrimestre, setSelectedTrimestre] = useState<Trimestre | 'ALL'>('ALL');
  const [selectedComponent, setSelectedComponent] = useState<EvaluationComponent | 'ALL'>('ALL');`;
content = content.replace(stateTarget, stateReplacement);

// 3. Update studentData filter
const filterTarget = `const studentActivities = activities.filter(a => a.course === currentStudent.course && a.subject === selectedSubject);`;
const filterReplacement = `const studentActivities = activities.filter(a => 
      a.course === currentStudent.course && 
      a.subject === selectedSubject &&
      (selectedTrimestre === 'ALL' || a.trimestre === selectedTrimestre) &&
      (selectedComponent === 'ALL' || a.component === selectedComponent)
    );`;
content = content.replace(filterTarget, filterReplacement);

// 4. Update dependencies for useMemo
const depTarget = `}, [currentStudent, activities, grades, selectedSubject]);`;
const depReplacement = `}, [currentStudent, activities, grades, selectedSubject, selectedTrimestre, selectedComponent]);`;
content = content.replace(depTarget, depReplacement);

// 5. Add dropdowns in UI
const dropdownTarget = `<div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-xl flex items-center gap-4">
            <span className="text-sm font-bold text-slate-400">Asignatura:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value as SubjectName)}
              className="flex-1 px-4 py-2 bg-[#0f172a] border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500 text-sm font-semibold text-slate-200"
            >
              {allSubjects.map(subject => (
                <option key={subject} value={subject}>
                  {subject} {failingSubjects.includes(subject) ? '⚠️ (Promedio < 7)' : ''}
                </option>
              ))}
            </select>
          </div>`;

const dropdownReplacement = `<div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-xl flex items-center gap-4 flex-1">
              <span className="text-sm font-bold text-slate-400">Asignatura:</span>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value as SubjectName)}
                className="flex-1 px-4 py-2 bg-[#0f172a] border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500 text-sm font-semibold text-slate-200"
              >
                {allSubjects.map(subject => (
                  <option key={subject} value={subject}>
                    {subject} {failingSubjects.includes(subject) ? '⚠️ (Promedio < 7)' : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-xl flex items-center gap-4 flex-1">
              <span className="text-sm font-bold text-slate-400">Trimestre:</span>
              <select
                value={selectedTrimestre}
                onChange={(e) => setSelectedTrimestre(e.target.value as any)}
                className="flex-1 px-4 py-2 bg-[#0f172a] border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500 text-sm font-semibold text-slate-200"
              >
                <option value="ALL">Todos los Trimestres</option>
                <option value="1º Trimestre">1º Trimestre</option>
                <option value="2º Trimestre">2º Trimestre</option>
                <option value="3º Trimestre">3º Trimestre</option>
              </select>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-xl flex items-center gap-4 flex-1">
              <span className="text-sm font-bold text-slate-400">Aporte:</span>
              <select
                value={selectedComponent}
                onChange={(e) => setSelectedComponent(e.target.value as any)}
                className="flex-1 px-4 py-2 bg-[#0f172a] border border-white/10 rounded-lg focus:outline-none focus:border-emerald-500 text-sm font-semibold text-slate-200"
              >
                <option value="ALL">Todos los Aportes</option>
                <option value="1º APORTE">1º APORTE</option>
                <option value="2º APORTE">2º APORTE</option>
                <option value="EVALUACIÓN FINAL">EVALUACIÓN FINAL</option>
                <option value="SUPLETORIO">SUPLETORIO</option>
                <option value="MEJORAMIENTO">MEJORAMIENTO</option>
              </select>
            </div>
          </div>`;

content = content.replace(dropdownTarget, dropdownReplacement);

fs.writeFileSync('src/components/EstudianteView.tsx', content, 'utf8');
console.log('Done');
