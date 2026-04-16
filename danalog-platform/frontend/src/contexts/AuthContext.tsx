import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

// Define User Types
export type UserRole = 'ADMIN' | 'CS' | 'CS_LEAD' | 'DISPATCHER' | 'DV_LEAD' | 'ACCOUNTANT' | 'DRIVER';

import { supabase } from '../services/supabaseClient';

export interface User {
    username: string;
    role: UserRole;
    name: string;
    employeeCode?: string;
    licensePlate?: string;
    status?: 'ACTIVE' | 'INACTIVE';
    password?: string; // Optional, used for updates
    joinedAt?: string;
    email?: string;
    phone?: string;
    vehicleCapacity?: string;
    fuelCapacity?: number; // Dung tích bình nhiên liệu (lít)
    licenseType?: string;
}

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string, remember: boolean) => Promise<{success: boolean, message?: string}>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Check for persisted session on load
    useEffect(() => {
        const savedUser = localStorage.getItem('danalog_user') || sessionStorage.getItem('danalog_user');
        if (savedUser) {
            try {
                setUser(JSON.parse(savedUser));
            } catch (e) {
                console.error("Failed to parse user from storage");
                localStorage.removeItem('danalog_user');
                sessionStorage.removeItem('danalog_user');
            }
        }
        setIsLoading(false);
    }, []);

    const login = async (username: string, password: string, remember: boolean): Promise<{success: boolean, message?: string}> => {
        setIsLoading(true);
        try {
            // In development, the proxy or full URL might be needed. 
            // Assuming the React app is served by the same server or proxied.
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            if (response.ok) {
                const authenticatedUser: User = await response.json();
                setUser(authenticatedUser);
                if (remember) {
                    localStorage.setItem('danalog_user', JSON.stringify(authenticatedUser));
                } else {
                    sessionStorage.setItem('danalog_user', JSON.stringify(authenticatedUser));
                }
                return { success: true };
            } else {
                const data = await response.json().catch(() => null);
                return { success: false, message: data?.error || 'Tên đăng nhập hoặc mật khẩu không đúng' };
            }
        } catch (err) {
            console.error("Login API error:", err);
            return { success: false, message: 'Lỗi mạng hoặc máy chủ. Vui lòng thử lại.' };
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('danalog_user');
        sessionStorage.removeItem('danalog_user');
    };

    const refreshUser = async () => {
        if (!user?.username) return;
        try {
            const { data, error } = await supabase.from('Users').select('*').eq('username', user.username).single();
            if (data && !error) {
                // Ensure password doesn't leak into state
                const { password, ...safeUser } = data;
                setUser(safeUser as User);
                const savedUser = localStorage.getItem('danalog_user');
                if (savedUser) localStorage.setItem('danalog_user', JSON.stringify(safeUser));
                else sessionStorage.setItem('danalog_user', JSON.stringify(safeUser));
            }
        } catch (e) {
            console.error('Failed to refresh user', e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, refreshUser, isAuthenticated: !!user, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};
