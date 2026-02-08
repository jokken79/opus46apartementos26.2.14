import React from 'react';

interface State { hasError: boolean; error: Error | null; }

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', background: '#0d0f12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
          <div style={{ background: '#1a1d24', border: '1px solid #ef4444', borderRadius: '16px', padding: '40px', maxWidth: '480px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠</div>
            <h1 style={{ color: '#ef4444', fontSize: '20px', fontWeight: 'bold', margin: '0 0 8px' }}>Error de aplicación</h1>
            <p style={{ color: '#9ca3af', fontSize: '14px', margin: '0 0 16px' }}>
              {this.state.error?.message || 'Ocurrió un error inesperado'}
            </p>
            <button
              onClick={() => { this.setState({ hasError: false, error: null }); }}
              style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '12px 32px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', marginRight: '8px' }}
            >
              Reintentar
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#374151', color: 'white', border: '1px solid #4b5563', padding: '12px 32px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
