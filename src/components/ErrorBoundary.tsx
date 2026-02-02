'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the component tree,
 * logs those errors, and displays a fallback UI
 */
export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = {
            hasError: false,
            error: null
        };
    }

    static getDerivedStateFromError(error: Error): State {
        // Update state so the next render will show the fallback UI
        return {
            hasError: true,
            error
        };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log the error to console (in production, send to error reporting service)

        // You can also send error to logging service here
        // logErrorToService(error, errorInfo);
    }

    render(): ReactNode {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <div className="min-h-screen bg-linear-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-gray-800 rounded-2xl shadow-2xl p-8 border border-red-500/30">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-500/20 mb-4">
                                <svg
                                    className="w-8 h-8 text-red-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>

                            <h2 className="text-xl font-bold text-white mb-2">
                                Terjadi Kesalahan
                            </h2>

                            <p className="text-gray-300 mb-6">
                                Maaf, terjadi kesalahan yang tidak terduga. Silakan refresh halaman atau coba lagi nanti.
                            </p>

                            {this.state.error && (
                                <details className="mb-6 text-left">
                                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300">
                                        Lihat detail error
                                    </summary>
                                    <div className="mt-3 p-3 bg-black/30 rounded-lg">
                                        <code className="text-xs text-red-400 wrap-break-word">
                                            {this.state.error.message}
                                        </code>
                                    </div>
                                </details>
                            )}

                            <button
                                onClick={() => window.location.reload()}
                                className="w-full bg-teal-500 hover:bg-teal-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
                            >
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                    />
                                </svg>
                                Refresh Halaman
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
