import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Mensaje mostrado cuando hay error. Por defecto mensaje genérico. */
  message?: string;
  /** Si es true, muestra un fallback más compacto (p. ej. para gráficos). */
  compact?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const message = this.props.message ?? 'Algo salió mal. Por favor, intente de nuevo.';

    if (this.props.compact) {
      return (
        <div className="error-boundary-compact" role="alert">
          <p>{message}</p>
          <button type="button" onClick={this.handleRetry}>
            Reintentar
          </button>
        </div>
      );
    }

    return (
      <div className="error-boundary" role="alert">
        <h2>Error inesperado</h2>
        <p>{message}</p>
        <button type="button" className="error-boundary-retry" onClick={this.handleRetry}>
          Reintentar
        </button>
      </div>
    );
  }
}
