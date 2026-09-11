/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RoleSelection } from './components/RoleSelection';
import { DocenteView } from './components/DocenteView';
import { EstudianteView } from './components/EstudianteView';
import { useAppStore } from './store';
import { Role } from './types';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { auth, signInWithGoogle } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

export default function App() {
  const [role, setRole] = useState<Role>('none');
  const [teacherCode, setTeacherCode] = useState<string>('');
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
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
          <div className="flex flex-1 items-center justify-center">
            <div className="bg-slate-900/50 p-8 rounded-2xl border border-slate-700 max-w-sm w-full text-center">
              <h2 className="text-2xl font-bold mb-4">Bienvenido a NotAI</h2>
              <p className="text-slate-400 mb-8">Por favor, inicia sesión para continuar</p>
              <button
                onClick={signInWithGoogle}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
              >
                <LogIn className="w-5 h-5" />
                Continuar con Google
              </button>
            </div>
          </div>
        ) : (
          <>
            {role === 'none' && <RoleSelection onSelectRole={(r, code) => { setRole(r); if (code) setTeacherCode(code); }} />}
            {role === 'docente' && <DocenteView store={store} teacherCode={teacherCode} onLogout={() => { setRole('none'); setTeacherCode(''); }} />}
            {role === 'estudiante' && <EstudianteView store={store} onLogout={() => setRole('none')} />}
          </>
        )}
      </div>

      {/* Accessibility Floating Button */}
      <button
        onClick={store.toggleHighContrast}
        className="fixed bottom-6 right-6 z-50 p-4 bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-blue-400"
        title="Modo Alto Contraste (Accesibilidad)"
        aria-label="Alternar modo de alto contraste"
      >
        {store.highContrast ? <EyeOff className="w-6 h-6" /> : <Eye className="w-6 h-6" />}
      </button>
    </div>
  );
}

