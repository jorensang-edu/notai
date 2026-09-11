import React, { useState, useEffect } from 'react';
import { UserCog, GraduationCap, Lock, X } from 'lucide-react';
import { Role } from '../types';
import teacherPasswordsJson from '../../public/teacher_passwords.json';

interface RoleSelectionProps {
  onSelectRole: (role: Role, code?: string) => void;
}

export function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  const [showTeacherAuth, setShowTeacherAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [validPasswords, setValidPasswords] = useState<string[]>([]);

  useEffect(() => {
    try {
      setValidPasswords(teacherPasswordsJson.map((p: any) => p.password));
    } catch (err) {
      console.error("Error loading passwords:", err);
      setValidPasswords(['CEDF1']); 
    }
  }, []);

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (validPasswords.includes(password.toUpperCase())) {
      onSelectRole('docente', password.toUpperCase());
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-full px-4 relative z-10">
      <div className="text-center mb-12">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mx-auto mb-6">
          <span className="font-bold text-3xl text-white">N</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-4 text-white">
          NotAI <span className="text-blue-400 font-medium text-lg ml-2">v2.4.0</span>
        </h1>
        <p className="text-sm md:text-base text-slate-400 uppercase tracking-widest max-w-2xl mx-auto">
          Sistema Inteligente de Registro y Consulta de Calificaciones Académicas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
        <button
          onClick={() => setShowTeacherAuth(true)}
          className="flex flex-col items-center p-8 bg-white/5 backdrop-blur-md rounded-2xl shadow-lg border border-white/10 hover:bg-white/10 transition-all duration-300 group relative"
        >
          <div className="bg-blue-500/20 p-6 rounded-full mb-6 border border-blue-500/30 group-hover:scale-110 transition-transform duration-300">
            <UserCog className="w-16 h-16 text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Ingreso Docente</h2>
          <p className="text-slate-400 text-center text-sm">
            Gestión de notas, actividades, promedios y reportes de estudiantes.
          </p>
        </button>

        <button
          onClick={() => onSelectRole('estudiante')}
          className="flex flex-col items-center p-8 bg-white/5 backdrop-blur-md rounded-2xl shadow-lg border border-white/10 hover:bg-white/10 transition-all duration-300 group"
        >
          <div className="bg-emerald-500/20 p-6 rounded-full mb-6 border border-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
            <GraduationCap className="w-16 h-16 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 mb-2">Portal Estudiante</h2>
          <p className="text-slate-400 text-center text-sm">
            Consulta individualizada de su progreso y alertas al día de hoy.
          </p>
        </button>
      </div>

      {showTeacherAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <button 
              onClick={() => {
                setShowTeacherAuth(false);
                setPassword('');
                setError(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex justify-center mb-4">
              <div className="bg-blue-500/20 p-4 rounded-full border border-blue-500/30">
                <Lock className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-2">Autenticación Docente</h3>
            <p className="text-slate-400 text-sm text-center mb-6">
              Ingrese la contraseña alfanumérica de 5 dígitos proporcionada por el administrador.
            </p>
            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={5}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(false);
                  }}
                  className={`w-full px-4 py-3 bg-white/5 border ${error ? 'border-rose-500' : 'border-white/10'} rounded-xl focus:outline-none focus:border-blue-500 text-center text-2xl font-mono text-white uppercase tracking-widest`}
                  placeholder="•••••"
                  autoFocus
                />
                {error && <p className="text-rose-400 text-xs text-center mt-2">Contraseña incorrecta. Intente de nuevo.</p>}
              </div>
              <button
                type="submit"
                disabled={password.length !== 5}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 disabled:text-white/50 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
              >
                Ingresar
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
