import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  fallbackMessage?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 p-6 md:p-12 flex items-center justify-center">
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 md:p-8 max-w-lg w-full text-center shadow-2xl backdrop-blur-xl">
            <div className="w-14 h-14 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-400">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-2">
              {this.props.fallbackTitle || 'Ha ocurrido un error inesperado'}
            </h3>
            <p className="text-sm text-slate-300 mb-6">
              {this.props.fallbackMessage || 'Se ha detectado un problema al cargar esta sección. Puede intentar restablecer la vista o recargar la página.'}
            </p>
            {this.state.error && (
              <div className="mb-6 p-3 bg-black/40 rounded-xl border border-white/5 text-xs text-rose-300/80 font-mono text-left max-h-32 overflow-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 rounded-xl text-sm font-medium transition-colors"
              >
                Recargar aplicación
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
