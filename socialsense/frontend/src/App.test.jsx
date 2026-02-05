import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import App from './App';

// Mock Supabase client to avoid network requests
vi.mock('@supabase/supabase-js', () => ({
    createClient: () => ({
        auth: {
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
            getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
        },
    }),
}));

// Mock child components or contexts if necessary
vi.mock('./contexts/AuthContext', () => ({
    AuthProvider: ({ children }) => <div>{children}</div>,
    useAuth: () => ({ user: null, loading: false }),
}));

describe('App component', () => {
    it('renders without crashing', () => {
        // We wrap App in BrowserRouter because it likely uses routes
        // And we might need more mocks depending on App implementation
        render(
            <BrowserRouter>
                <App />
            </BrowserRouter>
        );
    });
});
