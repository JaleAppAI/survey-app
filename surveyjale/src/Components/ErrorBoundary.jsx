import { Component } from 'react';

export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    maxWidth: 520,
                    margin: '80px auto',
                    textAlign: 'center',
                    fontFamily: 'Syne, sans-serif',
                    padding: '0 16px',
                }}>
                    <h1 style={{ fontSize: '22px', color: '#1a1a2e', marginBottom: '12px' }}>
                        Something went wrong
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '24px' }}>
                        An unexpected error occurred. Please try refreshing the page.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            background: '#2563eb',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '10px 24px',
                            fontFamily: 'Syne, sans-serif',
                            fontSize: '15px',
                            fontWeight: 600,
                            cursor: 'pointer',
                        }}
                    >
                        Refresh Page
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
