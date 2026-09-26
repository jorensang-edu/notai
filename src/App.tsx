/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RoleSelection } from './components/RoleSelection';
import { DocenteView } from './components/DocenteView';
import { EstudianteView } from './components/EstudianteView';
import { TutoriaView } from './components/TutoriaView';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAppStore } from './store';
import { Role } from './types';
import { Eye, EyeOff, LogIn, ShieldCheck, Mail } from 'lucide-react';
import { auth, signInWithGoogle } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { EmailNotificationModal } from './components/EmailNotificationModal';

export default function App() {
  const [role, setRole] = useState<Role>('none');
  const [teacherCode, setTeacherCode] = useState<string>('');
  const [tutorCode, setTutorCode] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const store = useAppStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen h-screen bg-[#020617] text-slate-100 font-sans overflow-hidden relative flex flex-col">
      {/* Background Orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px]"></div>
        <div className="absolute top-[20%] right-[10%] w-[20%] h-[20%] bg-emerald-500/10 rounded-full blur-[80px]"></div>
      </div>

      <div className="relative z-10 flex flex-1 overflow-hidden">
        {authLoading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
          </div>
        ) : !user ? (
          <div className="flex flex-1 items-center justify-center p-4">
            <div className="bg-slate-900/70 p-8 rounded-3xl border border-slate-700/80 max-w-md w-full text-center shadow-2xl backdrop-blur-xl">
              <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-blue-500/30">
                <ShieldCheck className="w-9 h-9 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Portal Académico NotAI</h2>
              <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                Acceso unificado y seguro mediante cuentas institucionales de Google
              </p>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 text-left text-xs text-slate-300 space-y-2 mb-6">
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                  <span>Docentes y Tutores:</span>
                  <code className="text-blue-300 font-mono">@cedfi.edu.ec</code>
                </p>
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>Estudiantes:</span>
                  <code className="text-emerald-300 font-mono">@stu.cedfi.edu.ec</code>
                </p>
              </div>

              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-blue-500/30 text-sm"
              >
                <LogIn className="w-5 h-5" />
                Continuar con Google Institucional
              </button>
            </div>
          </div>
        ) : (
          <ErrorBoundary onReset={() => { setRole('none'); setTeacherCode(''); setTutorCode(''); }}>
            {role === 'none' && (
              <RoleSelection 
                onSelectRole={(r, code) => { 
                  setRole(r); 
                  if (r === 'docente' && code) setTeacherCode(code); 
                  if (r === 'tutor' && code) setTutorCode(code);
                }} 
              />
            )}
            {role === 'docente' && (
              <DocenteView 
                store={store} 
                teacherCode={teacherCode} 
                onLogout={() => { setRole('none'); setTeacherCode(''); }} 
              />
            )}
            {role === 'tutor' && (
              <TutoriaView 
                store={store} 
                tutorCode={tutorCode} 
                onLogout={() => { setRole('none'); setTutorCode(''); }} 
              />
            )}
            {role === 'estudiante' && (
              <EstudianteView 
                store={store} 
                onLogout={() => setRole('none')} 
              />
            )}
          </ErrorBoundary>
        )}
      </div>

      {/* Email Notifications Button */}
      <button
        onClick={() => setShowEmailModal(true)}
        className="fixed bottom-6 right-22 z-50 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-indigo-400"
        title="Reportes Semanales por Correo (Resend & Cron)"
        aria-label="Reportes Semanales por Correo"
      >
        <Mail className="w-6 h-6" />
      </button>

      {/* Accessibility Floating Button */}
      <button
        onClick={store.toggleHighContrast}
        className="fixed bottom-6 right-6 z-50 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-blue-400"
        title="Modo Alto Contraste (Accesibilidad)"
        aria-label="Alternar modo de alto contraste"
      >
        {store.highContrast ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
      </button>

      <EmailNotificationModal
        isOpen={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        store={store}
      />
    </div>
  );
}


