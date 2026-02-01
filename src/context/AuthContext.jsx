/**
 * AuthContext
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const checkAuth = async () => {
            const token = api.getToken();

            if (!token) {
                setIsLoading(false);
                return;
            }

            try {
                const userData = await api.auth.me();
                setUser(userData);
            } catch (err) {
                console.error('Auth check failed:', err);
                api.clearToken();
                setUser(null);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuth();
    }, []);

    /**
     * @param {string} username 
     * @param {string} email 
     * @param {string} password 
     */
    const register = useCallback(async (username, email, password) => {
        setError(null);
        try {
            const { token, user: userData } = await api.auth.register(username, email, password);
            api.setToken(token);
            setUser(userData);
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    }, []);

    /**
     * @param {string} email 
     * @param {string} password 
     */
    const login = useCallback(async (email, password) => {
        setError(null);
        try {
            const { token, user: userData } = await api.auth.login(email, password);
            api.setToken(token);
            setUser(userData);
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    }, []);

    const logout = useCallback(() => {
        api.clearToken();
        setUser(null);
        setError(null);
    }, []);

    const clearError = useCallback(() => {
        setError(null);
    }, []);

    const value = {
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        register,
        login,
        logout,
        clearError,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
