/**
 * Error Boundary component
 *
 * Catches React rendering errors and displays user-friendly error UI
 */

import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import Button from './Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(
      '[ErrorBoundary] React component error:\n' +
      `Error: ${error.message}\n` +
      `Stack: ${error.stack}\n` +
      `Component Stack: ${errorInfo.componentStack}`
    );
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
          <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
            <h1 className="text-2xl font-bold text-red-600 mb-4">界面渲染错误</h1>
            <p className="text-gray-700 mb-4">
              游戏界面遇到了错误，请尝试刷新页面。
            </p>
            {this.state.error && (
              <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto mb-4 max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={this.handleReset} variant="primary" className="w-full">
              重新加载
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
