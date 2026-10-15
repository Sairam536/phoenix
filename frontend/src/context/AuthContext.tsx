import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole } from '../shared/index.js';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, role?: UserRole) => Promise<void>;
  register: (name: string, email: string, password: string, orgName?: string) => Promise<void>;
  logout: () => void;
  switchDemoRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('documind_token') || 'demo-owner-token');
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem('documind_user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch {
        // ignore
      }
    }
    return {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'admin@apexlogistics.demo',
      name: 'Alex Rivera (Owner)',
      role: 'owner',
    };
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem('documind_token', token);
    } else {
      localStorage.removeItem('documind_token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('documind_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('documind_user');
    }
  }, [user]);

  const login = async (email: string, role: UserRole = 'owner') => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 400)); // smooth experience

    const demoToken = role === 'reviewer' ? 'demo-reviewer-token' : 'demo-owner-token';
    const newUser: User = {
      id: role === 'reviewer' ? '00000000-0000-0000-0000-000000000002' : '00000000-0000-0000-0000-000000000001',
      email,
      name: email.split('@')[0],
      role,
    };

    setToken(demoToken);
    setUser(newUser);
    setIsLoading(false);
  };

  const register = async (name: string, email: string) => {
    setIsLoading(true);
    await new Promise(r => setTimeout(r, 400));

    const newUser: User = {
      id: '00000000-0000-0000-0000-000000000001',
      email,
      name,
      role: 'owner',
    };

    setToken('demo-owner-token');
    setUser(newUser);
    setIsLoading(false);
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('documind_token');
    localStorage.removeItem('documind_user');
  };

  const switchDemoRole = (role: UserRole) => {
    if (role === 'owner') {
      setUser({
        id: '00000000-0000-0000-0000-000000000001',
        email: 'admin@apexlogistics.demo',
        name: 'Alex Rivera (Owner)',
        role: 'owner',
      });
      setToken('demo-owner-token');
    } else if (role === 'reviewer') {
      setUser({
        id: '00000000-0000-0000-0000-000000000002',
        email: 'reviewer@apexlogistics.demo',
        name: 'Taylor Chen (Reviewer)',
        role: 'reviewer',
      });
      setToken('demo-reviewer-token');
    } else {
      setUser({
        id: '00000000-0000-0000-0000-000000000003',
        email: 'member@apexlogistics.demo',
        name: 'Sam Morgan (Member)',
        role: 'member',
      });
      setToken('demo-member-token');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        switchDemoRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
