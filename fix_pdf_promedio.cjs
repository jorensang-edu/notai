const fs = require('fs');
let content = fs.readFileSync('src/components/EstudianteView.tsx', 'utf8');

const targetButtons = `          <div className="h-8 w-px bg-white/10 hidden sm:block"></div>
          <button
            onClick={generatePDF}
            className="hidden sm:flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors font-medium text-sm shadow-lg shadow-emerald-500/20"
            title="Descargar Reporte General en PDF"
          >
            <Download className="w-4 h-4" />
            <span>Descargar Reporte</span>
          </button>
          <button
            onClick={generatePDF}
            className="sm:hidden flex items-center justify-center w-10 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors shadow-lg shadow-emerald-500/20"
            title="Descargar Reporte General en PDF"
          >
            <Download className="w-4 h-4" />
          </button>`;

const replacementButtons = `          <div className="h-8 w-px bg-white/10 hidden sm:block"></div>`;

content = content.replace(targetButtons, replacementButtons);

const targetPromedio = `<p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Promedio ({selectedSubject})</p>`;
const replacementPromedio = `<p className="text-[11px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest mb-1 relative z-10">Promedio {selectedComponent === 'ALL' ? 'General' : selectedComponent}</p>`;

content = content.replace(targetPromedio, replacementPromedio);

fs.writeFileSync('src/components/EstudianteView.tsx', content, 'utf8');
console.log('Fixed buttons and average label');
