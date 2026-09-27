import React, { useState } from 'react';
import { usePWAInstall } from '../usePWAInstall';
import { Download, Smartphone, X, CheckCircle, Share, PlusSquare } from 'lucide-react';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'button' | 'banner';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '',
  variant = 'button' 
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showInstructions, setShowInstructions] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If app is already installed or running in standalone mode, do not show install prompt
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setIsInstalling(true);
      try {
        const result = await install();
        if (!result) {
          // If dismissed or failed, show instructions modal
          setShowInstructions(true);
        }
      } finally {
        setIsInstalling(false);
      }
    } else {
      setShowInstructions(true);
    }
  };

  return (
    <>
      {variant === 'banner' ? (
        <div className={`p-3 bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900/40 border border-blue-500/30 rounded-2xl flex items-center justify-between gap-3 backdrop-blur-md shadow-lg ${className}`}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-400">
              <Smartphone className="w-4 h-4" />
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Instalar NotAI en Android / Móvil</span>
                <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500/20 text-emerald-300 rounded font-semibold">PWA</span>
              </div>
              <div className="text-[11px] text-slate-400">Acceso rápido directo desde tu pantalla de inicio</div>
            </div>
          </div>

          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-blue-600/30 transition-all hover:scale-105 active:scale-95 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isInstalling ? 'Instalando...' : 'Instalar'}</span>
          </button>
        </div>
      ) : (
        <button
          onClick={handleInstallClick}
          disabled={isInstalling}
          className={`flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-blue-600/20 border border-blue-400/30 transition-all hover:scale-105 active:scale-95 ${className}`}
          title="Instalar aplicación en dispositivo móvil (Android / iOS)"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>{isInstalling ? 'Instalando...' : 'Instalar App'}</span>
        </button>
      )}

      {/* Instructions Modal if prompt cannot be triggered directly or for iOS / alternate browsers */}
      {showInstructions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-sm p-6 shadow-2xl relative text-left">
            <button
              onClick={() => setShowInstructions(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-4">
              <Smartphone className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white mb-1">
              Instalar NotAI en tu dispositivo
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Disfruta de una experiencia nativa rápida, sin barras del navegador y con funcionamiento offline.
            </p>

            {isIOS ? (
              <div className="space-y-3 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/70 text-xs text-slate-300 mb-4">
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-blue-500/20 text-blue-300 shrink-0 mt-0.5">
                    <Share className="w-3.5 h-3.5" />
                  </div>
                  <span>1. Pulsa el botón <strong>Compartir</strong> en la barra inferior de Safari.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-md bg-emerald-500/20 text-emerald-300 shrink-0 mt-0.5">
                    <PlusSquare className="w-3.5 h-3.5" />
                  </div>
                  <span>2. Selecciona <strong>"Agregar al inicio"</strong> o <strong>"Añadir a pantalla de inicio"</strong>.</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/70 text-xs text-slate-300 mb-4">
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-300 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    1
                  </div>
                  <span>Abre el menú de opciones de Chrome pulsando los <strong>tres puntos (⋮)</strong> en la esquina superior derecha.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    2
                  </div>
                  <span>Toca en <strong>"Instalar aplicación"</strong> o <strong>"Agregar a la pantalla principal"</strong>.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 font-bold text-[10px]">
                    3
                  </div>
                  <span>Confirma pulsando <strong>"Instalar"</strong> para tener el icono en tu teléfono.</span>
                </div>
              </div>
            )}

            <button
              onClick={() => setShowInstructions(false)}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
