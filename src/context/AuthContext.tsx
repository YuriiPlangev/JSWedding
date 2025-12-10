import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { User, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import type { Session, AuthError } from '@supabase/supabase-js';
import { clearAllCache } from '../utils/cache';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Загружаем текущую сессию при монтировании
  useEffect(() => {
    // Получаем текущую сессию
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Слушаем изменения аутентификации
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    try {
      // Загружаем профиль из таблицы profiles
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        // PGRST116 - запись не найдена, это нормально для новых пользователей
        console.error('Error loading profile:', profileError);
      }

      // Если профиля нет, получаем данные из auth.users
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (authUser) {
        const userData: User = {
          id: authUser.id,
          email: profile?.email || authUser.email || '',
          name: profile?.name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'User',
          role: (profile?.role as User['role']) || authUser.user_metadata?.role || 'client',
          avatar: profile?.avatar_url || authUser.user_metadata?.avatar,
        };
        setUser(userData);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        setSession(data.session);
        if (data.user) {
          await loadUserProfile(data.user.id);
        }
      }
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(authError.message || 'Failed to login');
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      setUser(null);
      setSession(null);
      // Очищаем весь кеш при выходе
      clearAllCache();
    } catch (error) {
      const authError = error as AuthError;
      throw new Error(authError.message || 'Failed to logout');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        login,
        logout,
        isAuthenticated: !!user && !!session,
        loading,
      }}
    >
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

