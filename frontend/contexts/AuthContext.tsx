'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User, AuthContextType } from '@/types';
import { authService, rolesService } from '@/lib/api';

const ADMIN_AUTH_COOKIE = 'BRV_ADMIN_AUTH';
const ADMIN_AUTH_MAX_AGE = 60 * 60 * 24 * 365;

function setAdminAuthCookie(isAuthenticated: boolean) {
  if (typeof document === 'undefined') return;

  if (isAuthenticated) {
    document.cookie = `${ADMIN_AUTH_COOKIE}=1; path=/; max-age=${ADMIN_AUTH_MAX_AGE}; SameSite=Lax`;
    return;
  }

  document.cookie = `${ADMIN_AUTH_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  permissions: string[];
}

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User };

const getInitialToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
};

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  permissions: [],
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'LOGIN_SUCCESS':
      setAdminAuthCookie(true);
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        permissions: (action.payload.user as unknown as { permissions?: string[] }).permissions || [],
      };
    case 'LOGOUT':
      setAdminAuthCookie(false);
      return { ...state, user: null, token: null, isAuthenticated: false, loading: false, permissions: [] };
    case 'UPDATE_USER':
      return {
        ...state,
        user: action.payload,
        permissions: (action.payload as unknown as { permissions?: string[] }).permissions || state.permissions,
      };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    ...initialState,
    token: getInitialToken(),
  });

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setAdminAuthCookie(false);
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }
      try {
        const response = await authService.getCurrentUser();
        if (response.data.success && response.data.user) {
          const user = response.data.user as User & { permissions?: string[] };
          try {
            const rolesRes = await rolesService.getRoles();
            const roleDef = Array.isArray(rolesRes.data.data)
              ? rolesRes.data.data.find(
                  (r: { name: string }) => String(r.name).toLowerCase() === String(user.role).toLowerCase()
                )
              : null;
            const rawPerms: string[] = roleDef?.permissions || [];
            user.permissions = rawPerms;
          } catch {
            user.permissions = [];
          }
          setAdminAuthCookie(true);
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
        } else {
          localStorage.removeItem('token');
          setAdminAuthCookie(false);
          dispatch({ type: 'SET_LOADING', payload: false });
        }
      } catch {
        localStorage.removeItem('token');
        setAdminAuthCookie(false);
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    const { user, token } = response.data;
    localStorage.setItem('token', token);
    setAdminAuthCookie(true);
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
  };

  const logout = () => {
    localStorage.removeItem('token');
    authService.logout().catch(() => {});
    dispatch({ type: 'LOGOUT' });
  };

  const updateUser = (user: User) => {
    dispatch({ type: 'UPDATE_USER', payload: user });
  };

  const refreshUser = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const response = await authService.getCurrentUser();
      if (response.data.success && response.data.user) {
        const user = response.data.user as User & { permissions?: string[] };
        setAdminAuthCookie(true);
        dispatch({ type: 'UPDATE_USER', payload: user });
      }
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        loading: state.loading,
        permissions: state.permissions,
        login,
        logout,
        updateUser,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
