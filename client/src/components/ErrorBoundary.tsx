import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}
interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-red-50">
          <div className="max-w-2xl w-full bg-white p-6 rounded-lg shadow border border-red-200">
            <h1 className="text-xl font-bold text-red-700 mb-2">
              Algo se rompió 💥
            </h1>
            <p className="text-sm text-gray-700 mb-2">
              {this.state.error.message}
            </p>
            <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
              {this.state.error.stack}
            </pre>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-4 px-3 py-1.5 bg-[#003B7A] text-white rounded text-sm"
            >
              Reintentar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
