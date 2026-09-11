import React, { useState, useEffect } from 'react';
import { UserCog, GraduationCap, Lock, X, ShieldCheck, LogOut, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Role } from '../types';
import teacherPasswordsJson from '../../public/teacher_passwords.json';
import { TUTOR_MATRIX } from '../tutorMatrix';
import { auth } from '../firebase';
import { 
  validateEmailForRole, 
  getEmailDomainType, 
  checkCodeBinding, 
  saveCodeBinding 
} from '../authUtils';

interface RoleSelectionProps {
  onSelectRole: (role: Role, code?: string) => void;
}

export function RoleSelection({ onSelectRole }: RoleSelectionProps) {
  const [showTeacherAuth, setShowTeacherAuth] = useState(false);
  const [showTutorAuth, setShowTutorAuth] = useState(false);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [validPasswords, setValidPasswords] = useState<string[]>([]);

  const currentUser = auth.currentUser;
  const userEmail = currentUser?.email || '';
  const domainType = getEmailDomainType(userEmail);

  useEffect(() => {
    try {
      setValidPasswords(teacherPasswordsJson.map((p: any) => p.password));
    } catch (err) {
      console.error("Error loading passwords:", err);
      setValidPasswords(['CEDF1']); 
    }
  }, []);

  // Handle Teacher Entrance
  const handleTeacherClick = () => {
    const val = validateEmailForRole(userEmail, 'docente');
    if (!val.isValid) {
      alert(val.errorMessage);
      return;
    }
    setPassword('');
    setAuthError(null);
    setShowTeacherAuth(true);
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = password.toUpperCase().trim();

    if (!validPasswords.includes(cleanCode)) {
      setAuthError('Contraseña docente incorrecta. Verifique sus credenciales.');
      return;
    }

    // Check account-to-code binding
    const bindingCheck = checkCodeBinding(userEmail, cleanCode, 'docente');
    if (!bindingCheck.allowed) {
      setAuthError(bindingCheck.message || 'Código no autorizado para esta cuenta institucional.');
      return;
    }

    // Save binding
    saveCodeBinding(userEmail, cleanCode, 'docente');
    setShowTeacherAuth(false);
    onSelectRole('docente', cleanCode);
  };

  // Handle Tutor Entrance
  const handleTutorClick = () => {
    const val = validateEmailForRole(userEmail, 'tutor');
    if (!val.isValid) {
      alert(val.errorMessage);
      return;
    }
    setPassword('');
    setAuthError(null);
    setShowTutorAuth(true);
  };

  const handleTutorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = password.toUpperCase().trim();

    if (!TUTOR_MATRIX[cleanCode]) {
      setAuthError(`El código "${cleanCode}" no pertenece a la matriz de tutores autorizados.`);
      return;
    }

    // Check account-to-code binding
    const bindingCheck = checkCodeBinding(userEmail, cleanCode, 'tutor');
    if (!bindingCheck.allowed) {
      setAuthError(bindingCheck.message || 'Código no autorizado para esta cuenta institucional.');
      return;
    }

    // Save binding
    saveCodeBinding(userEmail, cleanCode, 'tutor');
    setShowTutorAuth(false);
    onSelectRole('tutor', cleanCode);
  };

  // Handle Student Entrance
  const handleStudentClick = () => {
    const val = validateEmailForRole(userEmail, 'estudiante');
    if (!val.isValid) {
      alert(val.errorMessage);
      return;
    }
    onSelectRole('estudiante');
  };

  return (
    <div className="flex flex-col items-center justify-center w-full min-h-full px-4 py-8 relative z-10">
      {/* Active User Institutional Header */}
      {currentUser && (
        <div className="mb-8 px-5 py-2.5 bg-slate-900/80 border border-slate-700/80 rounded-2xl flex flex-wrap items-center justify-between gap-4 max-w-2xl w-full shadow-lg backdrop-blur-md">
          <div className="flex items-center gap-3">
            {currentUser.photoURL ? (
              <img 
                src={currentUser.photoURL} 
                alt={currentUser.displayName || 'Usuario'} 
                className="w-9 h-9 rounded-full border border-slate-600"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm">
                {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
              </div>
            )}
            <div className="text-left">
              <p className="text-xs font-bold text-white leading-tight">{currentUser.displayName || 'Cuenta Google'}</p>
              <p className="text-[11px] font-mono text-slate-400">{currentUser.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {domainType === 'docente' && (
              <span className="px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Docente CEDFI
              </span>
            )}
            {domainType === 'estudiante' && (
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Estudiante CEDFI
              </span>
            )}
            {domainType === 'admin' && (
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                Administrador
              </span>
            )}
            {domainType === 'unknown' && (
              <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                No Institucional
              </span>
            )}

            <button
              onClick={() => auth.signOut()}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Cerrar sesión de Google"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Title */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mx-auto mb-5">
          <span className="font-black text-3xl text-white">N</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-2 text-white">
          NotAI <span className="text-blue-400 font-medium text-lg ml-1">v2.5.0</span>
        </h1>
        <p className="text-xs md:text-sm text-slate-400 uppercase tracking-widest max-w-2xl mx-auto">
          Sistema Institucional de Gestión, Tutoría y Calificaciones Académicas
        </p>
      </div>

      {/* 3 Portal Role Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
        {/* Card 1: Ingreso Docente */}
        <button
          onClick={handleTeacherClick}
          className="flex flex-col items-center p-7 bg-white/5 backdrop-blur-md rounded-2xl shadow-lg border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all duration-300 group text-center relative"
        >
          <div className="bg-blue-500/20 p-5 rounded-2xl mb-5 border border-blue-500/30 group-hover:scale-110 transition-transform duration-300">
            <UserCog className="w-12 h-12 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Ingreso Docente</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Gestión de notas, actividades evaluativas, promedios y reportes por asignatura.
          </p>
          <span className="mt-4 text-[10px] text-blue-400 font-semibold tracking-wider uppercase">
            Requiere @cedfi.edu.ec
          </span>
        </button>

        {/* Card 2: Módulo de Tutoría */}
        <button
          onClick={handleTutorClick}
          className="flex flex-col items-center p-7 bg-white/5 backdrop-blur-md rounded-2xl shadow-lg border border-white/10 hover:border-purple-500/50 hover:bg-white/10 transition-all duration-300 group text-center relative"
        >
          <div className="bg-purple-500/20 p-5 rounded-2xl mb-5 border border-purple-500/30 group-hover:scale-110 transition-transform duration-300">
            <ShieldCheck className="w-12 h-12 text-purple-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Módulo de Tutoría</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Vista consolidada de todas las materias, alertas por notas 0/10 o &lt; 7/10 y descarga de historial.
          </p>
          <span className="mt-4 text-[10px] text-purple-400 font-semibold tracking-wider uppercase">
            Matriz de Códigos Tutores
          </span>
        </button>

        {/* Card 3: Portal Estudiante */}
        <button
          onClick={handleStudentClick}
          className="flex flex-col items-center p-7 bg-white/5 backdrop-blur-md rounded-2xl shadow-lg border border-white/10 hover:border-emerald-500/50 hover:bg-white/10 transition-all duration-300 group text-center relative"
        >
          <div className="bg-emerald-500/20 p-5 rounded-2xl mb-5 border border-emerald-500/30 group-hover:scale-110 transition-transform duration-300">
            <GraduationCap className="w-12 h-12 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-slate-100 mb-2">Portal Estudiante</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Consulta personalizada del rendimiento académico, desglose de notas y refuerzos.
          </p>
          <span className="mt-4 text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
            Requiere @stu.cedfi.edu.ec
          </span>
        </button>
      </div>

      {/* Teacher Password Modal */}
      {showTeacherAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <button 
              onClick={() => {
                setShowTeacherAuth(false);
                setPassword('');
                setAuthError(null);
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
            <h3 className="text-xl font-bold text-white text-center mb-1">Autenticación Docente</h3>
            <p className="text-slate-400 text-xs text-center mb-4">
              Ingrese su código de 5 dígitos para vincular su cuenta institucional <span className="font-mono text-blue-300">{userEmail}</span>.
            </p>
            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={5}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setAuthError(null);
                  }}
                  className={`w-full px-4 py-3 bg-white/5 border ${authError ? 'border-rose-500' : 'border-white/10'} rounded-xl focus:outline-none focus:border-blue-500 text-center text-2xl font-mono text-white uppercase tracking-widest`}
                  placeholder="•••••"
                  autoFocus
                />
                {authError && (
                  <p className="text-rose-400 text-xs text-center mt-2 leading-tight">{authError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={password.length !== 5}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/40 disabled:text-white/40 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20 text-sm"
              >
                Ingresar al Portal Docente
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Tutor Code Modal */}
      {showTutorAuth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-[#0f172a] border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
            <button 
              onClick={() => {
                setShowTutorAuth(false);
                setPassword('');
                setAuthError(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex justify-center mb-4">
              <div className="bg-purple-500/20 p-4 rounded-full border border-purple-500/30">
                <ShieldCheck className="w-8 h-8 text-purple-400" />
              </div>
            </div>
            <h3 className="text-xl font-bold text-white text-center mb-1">Acceso a Tutoría</h3>
            <p className="text-slate-400 text-xs text-center mb-4">
              Ingrese su código de tutor autorizado <span className="font-mono text-purple-300">({userEmail})</span>.
            </p>
            <form onSubmit={handleTutorLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  maxLength={5}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setAuthError(null);
                  }}
                  className={`w-full px-4 py-3 bg-white/5 border ${authError ? 'border-rose-500' : 'border-white/10'} rounded-xl focus:outline-none focus:border-purple-500 text-center text-2xl font-mono text-white uppercase tracking-widest`}
                  placeholder="•••••"
                  autoFocus
                />
                {authError && (
                  <p className="text-rose-400 text-xs text-center mt-2 leading-tight">{authError}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={password.length !== 5}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-600/40 disabled:text-white/40 text-white rounded-xl font-bold transition-all shadow-lg shadow-purple-500/20 text-sm"
              >
                Ingresar al Módulo de Tutoría
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
