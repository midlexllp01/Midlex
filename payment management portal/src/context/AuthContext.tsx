"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'LAWYER' | 'CLIENT' | 'ACCOUNTANT';
  litigationTeam?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('midlex_token');
      const savedUser = localStorage.getItem('midlex_user');

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Failed to parse saved user:', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('midlex_token', newToken);
    localStorage.setItem('midlex_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    router.push('/dashboard');
  };

  const logout = async () => {
    const destination = localStorage.getItem('midlex_workspace_return');
    if (destination) {
      try {
        const response = await fetch('/api/sso', { method: 'DELETE' });
        if (!response.ok) throw new Error('Unable to sign out');
      } catch { window.alert('Unable to sign out. Please try again.'); return; }
    }
    for (const key of ['midlex_token', 'midlex_user', 'midlex_client_dept', 'midlex_workspace_return']) localStorage.removeItem(key);
    setToken(null);
    setUser(null);
    if (destination && ['https://staff.midlex.xyz', 'https://admin.midlex.xyz', 'https://developer.midlex.xyz'].includes(destination)) window.location.assign(destination);
    else router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
