// components/ErrorBoundary.tsx
"use client"

import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#F2F5F1] flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-500 border-4 border-red-700 flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-black text-2xl">!</span>
            </div>
            <h1 className="text-2xl font-black text-[#004D40] mb-4">SOMETHING WENT WRONG</h1>
            <p className="text-[#004D40] font-bold mb-6">
              We encountered an error while loading the app. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-[#44C76F] text-[#004D40] font-black px-6 py-3 border-4 border-[#004D40] shadow-[4px_4px_0px_0px_#004D40] hover:translate-x-1 hover:translate-y-1 hover:shadow-[2px_2px_0px_0px_#004D40] transition-all"
            >
              REFRESH PAGE
            </button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="cursor-pointer font-bold text-[#004D40]">Error Details</summary>
                <pre className="mt-2 text-xs bg-red-100 p-2 rounded border text-red-700">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 