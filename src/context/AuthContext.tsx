import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, ProfileRole } from '../types';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: ProfileRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | Error | null }>;
  signUp: (email: string, password: string, fullName: string, phone?: string) => Promise<{ error: AuthError | Error | null; user: User | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | Error | null }>;
  updateProfile: (data: Partial<UserProfile>) => Promise<{ error: Error | null }>;
  getRedirectPath: (targetRole?: ProfileRole) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const MASTER_ADMIN_EMAIL = 'axxeiacompany@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Helper to resolve role safely
  const role: ProfileRole = useMemo(() => {
    if (user?.email && user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
      return 'admin';
    }
    return profile?.role || 'customer';
  }, [user, profile]);

  // Load user profile from Supabase profiles table
  const fetchUserProfile = useCallback(async (authUser: User): Promise<UserProfile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', authUser.id)
        .maybeSingle();

      if (error) {
        console.warn('[AuthContext] Erro ao carregar perfil do Supabase:', error.message);
      }

      if (data) {
        const loadedProfile: UserProfile = {
          id: data.id,
          userId: data.user_id,
          fullName: data.full_name || authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Usuário',
          email: data.email || authUser.email || '',
          phone: data.phone || '',
          role: authUser.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase() ? 'admin' : (data.role || 'customer'),
          status: data.status || 'active',
          avatarUrl: data.avatar_url || '',
          createdAt: data.created_at || new Date().toISOString(),
          updatedAt: data.updated_at || new Date().toISOString(),
        };
        setProfile(loadedProfile);
        return loadedProfile;
      }

      // If no profile exists yet (e.g. freshly created or triggered late), create default profile
      const isMaster = authUser.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
      const defaultRole: ProfileRole = isMaster ? 'admin' : 'customer';
      const fullName = authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Cliente';
      const phone = authUser.user_metadata?.phone || '';

      const newProfilePayload = {
        user_id: authUser.id,
        full_name: fullName,
        email: authUser.email || '',
        phone,
        role: defaultRole,
        status: 'active',
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('profiles')
        .insert(newProfilePayload)
        .select()
        .maybeSingle();

      if (insertErr) {
        console.warn('[AuthContext] Falha ao criar perfil default:', insertErr.message);
      }

      const fallbackProfile: UserProfile = {
        id: inserted?.id || `prof-${Date.now()}`,
        userId: authUser.id,
        fullName,
        email: authUser.email || '',
        phone,
        role: defaultRole,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setProfile(fallbackProfile);
      return fallbackProfile;
    } catch (err) {
      console.warn('[AuthContext] Exceção ao buscar perfil:', err);
      return null;
    }
  }, []);

  // Initial Auth Check and listener
  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[AuthContext] Aviso de sessão inicial:', error.message);
        }

        if (isMounted) {
          if (data?.session) {
            setSession(data.session);
            setUser(data.session.user);
            await fetchUserProfile(data.session.user);
          } else {
            // Check if there was a saved session in storage for demo/remembered device
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        }
      } catch (err) {
        console.warn('[AuthContext] Exceção na inicialização da autenticação:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initAuth();

    // Listen to Supabase Auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      const currentUser = newSession?.user || null;
      setUser(currentUser);

      if (currentUser) {
        await fetchUserProfile(currentUser);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Sign In with email and password
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password.trim(),
      });

      if (error) {
        return { error };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchUserProfile(data.user);
      }

      return { error: null };
    } catch (err: any) {
      return { error: err };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up with email, password, full name and phone (default role: customer)
  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    try {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();
      const cleanPhone = (phone || '').trim();

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password.trim(),
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
          },
        },
      });

      if (error) {
        return { error, user: null };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchUserProfile(data.user);
      }

      return { error: null, user: data.user };
    } catch (err: any) {
      return { error: err, user: null };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Out
  const signOut = async () => {
    try {
      setIsLoading(true);
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('[AuthContext] Aviso ao deslogar:', err);
    } finally {
      setUser(null);
      setSession(null);
      setProfile(null);
      setIsLoading(false);
      try {
        localStorage.removeItem('KORISKO_AUTH_SESSION');
        localStorage.removeItem('KORISKO_REMEMBER_DEVICE');
        sessionStorage.removeItem('KORISKO_AUTH_SESSION');
      } catch {}
    }
  };

  // Password Recovery via Supabase Auth
  const resetPassword = async (email: string) => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${window.location.origin}/login?reset=true`,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  // Update profile
  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) return { error: new Error('Usuário não autenticado.') };

    try {
      const payload: any = {
        updated_at: new Date().toISOString(),
      };
      if (updates.fullName !== undefined) payload.full_name = updates.fullName;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;

      const { error } = await supabase
        .from('profiles')
        .update(payload)
        .eq('user_id', user.id);

      if (error) {
        return { error: new Error(error.message) };
      }

      setProfile(prev => prev ? { ...prev, ...updates } : null);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  // Determine automatic target path based on user role
  const getRedirectPath = (targetRole?: ProfileRole): string => {
    const activeRole = targetRole || role;
    switch (activeRole) {
      case 'customer':
        return '/minha-conta';
      case 'affiliate':
        return '/afiliado';
      case 'employee':
      case 'manager':
        return '/crm';
      case 'admin':
        return '/crm';
      default:
        return '/';
    }
  };

  const value: AuthContextType = {
    user,
    session,
    profile,
    role,
    isLoading,
    isAuthenticated: Boolean(user && session),
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    getRedirectPath,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
