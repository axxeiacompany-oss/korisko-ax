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
            // Check if there was a saved session in local storage
            try {
              const savedProfileStr = localStorage.getItem('KORISKO_SAVED_PROFILE');
              const savedUserStr = localStorage.getItem('KORISKO_SAVED_USER');
              if (savedProfileStr && savedUserStr) {
                const parsedProfile = JSON.parse(savedProfileStr);
                const parsedUser = JSON.parse(savedUserStr);
                setProfile(parsedProfile);
                setUser(parsedUser);
                setSession({
                  access_token: 'local-session-token',
                  refresh_token: 'local-refresh-token',
                  expires_in: 360000,
                  token_type: 'bearer',
                  user: parsedUser,
                } as any);
              }
            } catch {}
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
      if (newSession?.user) {
        setSession(newSession);
        setUser(newSession.user);
        await fetchUserProfile(newSession.user);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [fetchUserProfile]);

  // Sign In with email and password (with local admin & employee fallback)
  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      // 1. Try Supabase Auth
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPassword,
        });

        if (!error && data.user) {
          setUser(data.user);
          setSession(data.session);
          const p = await fetchUserProfile(data.user);
          if (p) {
            try {
              localStorage.setItem('KORISKO_SAVED_PROFILE', JSON.stringify(p));
              localStorage.setItem('KORISKO_SAVED_USER', JSON.stringify(data.user));
              localStorage.setItem('KORISKO_AUTH_SESSION', 'true');
            } catch {}
          }
          return { error: null };
        }
      } catch (authErr) {
        console.warn('[AuthContext] Supabase sign in notice, checking fallback:', authErr);
      }

      // 2. Fallback: Check Admin Ax and employees
      const isMasterAx = 
        (cleanEmail === 'axxeiacompany@gmail.com' || cleanEmail === 'ax') && 
        (cleanPassword === '9APG_47z-EgF4yz' || cleanPassword === 'admin');

      // Check registered users in localStorage or local DB
      let localEmployees: any[] = [];
      try {
        const rawState = localStorage.getItem('KORISKO_STATE_V2');
        if (rawState) {
          const parsed = JSON.parse(rawState);
          if (Array.isArray(parsed.employees)) {
            localEmployees = parsed.employees;
          }
        }
      } catch {}

      const matchedEmp = localEmployees.find((e: any) => {
        const eEmail = (e.email || '').toLowerCase().trim();
        const eName = (e.name || '').toLowerCase().trim();
        return (
          eEmail === cleanEmail ||
          eName === cleanEmail ||
          e.id === cleanEmail
        );
      });

      const isEmpValid = matchedEmp && (
        (matchedEmp.password && matchedEmp.password.trim() === cleanPassword) ||
        (matchedEmp.pin && matchedEmp.pin.trim() === cleanPassword)
      );

      if (isMasterAx || isEmpValid) {
        const roleToAssign: ProfileRole = isMasterAx ? 'admin' : (matchedEmp?.role || 'employee');
        const empName = isMasterAx ? 'Ax' : (matchedEmp?.name || 'Administrador');
        const empEmail = isMasterAx ? 'axxeiacompany@gmail.com' : (matchedEmp?.email || cleanEmail);
        const empId = isMasterAx ? 'emp-admin-ax' : (matchedEmp?.id || `emp-${Date.now()}`);

        const localUser: User = {
          id: empId,
          app_metadata: {},
          user_metadata: { full_name: empName, role: roleToAssign },
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          email: empEmail,
        } as any;

        const localProfile: UserProfile = {
          id: `prof-${empId}`,
          userId: empId,
          fullName: empName,
          email: empEmail,
          phone: '',
          role: roleToAssign,
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setUser(localUser);
        setProfile(localProfile);
        setSession({
          access_token: 'local-token',
          refresh_token: 'local-refresh',
          expires_in: 360000,
          token_type: 'bearer',
          user: localUser,
        } as any);

        try {
          localStorage.setItem('KORISKO_SAVED_PROFILE', JSON.stringify(localProfile));
          localStorage.setItem('KORISKO_SAVED_USER', JSON.stringify(localUser));
          localStorage.setItem('KORISKO_AUTH_SESSION', 'true');
          localStorage.setItem('KORISKO_CURRENT_USER_ID', empId);
        } catch {}

        return { error: null };
      }

      // Check registered customer in localStorage
      let localCustomers: any[] = [];
      try {
        const rawState = localStorage.getItem('KORISKO_STATE_V2');
        if (rawState) {
          const parsed = JSON.parse(rawState);
          if (Array.isArray(parsed.customers)) {
            localCustomers = parsed.customers;
          }
        }
      } catch {}

      const matchedCustomer = localCustomers.find((c: any) => 
        (c.email && c.email.toLowerCase().trim() === cleanEmail) ||
        (c.phone && c.phone.trim() === cleanEmail)
      );

      if (matchedCustomer) {
        const custUser: User = {
          id: matchedCustomer.id,
          app_metadata: {},
          user_metadata: { full_name: matchedCustomer.name, role: 'customer' },
          aud: 'authenticated',
          created_at: matchedCustomer.createdAt || new Date().toISOString(),
          email: matchedCustomer.email || cleanEmail,
        } as any;

        const custProfile: UserProfile = {
          id: `prof-${matchedCustomer.id}`,
          userId: matchedCustomer.id,
          fullName: matchedCustomer.name,
          email: matchedCustomer.email || cleanEmail,
          phone: matchedCustomer.phone || '',
          role: 'customer',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setUser(custUser);
        setProfile(custProfile);
        setSession({
          access_token: 'local-token-cust',
          refresh_token: 'local-refresh-cust',
          expires_in: 360000,
          token_type: 'bearer',
          user: custUser,
        } as any);

        try {
          localStorage.setItem('KORISKO_SAVED_PROFILE', JSON.stringify(custProfile));
          localStorage.setItem('KORISKO_SAVED_USER', JSON.stringify(custUser));
          localStorage.setItem('KORISKO_AUTH_SESSION', 'true');
        } catch {}

        return { error: null };
      }

      return { error: new Error('E-mail ou senha incorretos.') };
    } catch (err: any) {
      return { error: err };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up with email, password, full name and phone (registers as customer seamlessly)
  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    try {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();
      const cleanPhone = (phone || '').trim();

      const customerId = `cust-${Date.now()}`;

      // 1. Try Supabase Auth
      let authUser: User | null = null;
      let authSession: Session | null = null;

      try {
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
        if (!error && data.user) {
          authUser = data.user;
          authSession = data.session;
        }
      } catch (err) {
        console.warn('[AuthContext] Supabase signUp notice:', err);
      }

      const effectiveUserId = authUser?.id || customerId;

      // 2. Register/upsert in 'clientes' database table
      try {
        await supabase
          .from('clientes')
          .upsert({
            id: effectiveUserId,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            active: true,
            category: 'varejo',
            loyalty_points: 50, // Welcome points
          }, { onConflict: 'id' });
      } catch {}

      // 3. Register in 'profiles' table
      try {
        await supabase
          .from('profiles')
          .upsert({
            user_id: effectiveUserId,
            full_name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            role: 'customer',
            status: 'active',
          }, { onConflict: 'user_id' });
      } catch {}

      // 4. Update local state customer list in localStorage
      try {
        const rawState = localStorage.getItem('KORISKO_STATE_V2');
        if (rawState) {
          const parsed = JSON.parse(rawState);
          if (Array.isArray(parsed.customers)) {
            const newCustomerObj = {
              id: effectiveUserId,
              name: cleanName,
              email: cleanEmail,
              phone: cleanPhone,
              category: 'varejo' as const,
              creditLimitBrl: 300,
              outstandingBalanceBrl: 0,
              loyaltyPoints: 50,
              active: true,
              totalSpentBrl: 0,
              purchaseCount: 0,
              createdAt: new Date().toISOString(),
            };
            parsed.customers = [newCustomerObj, ...parsed.customers.filter((c: any) => c.email !== cleanEmail)];
            localStorage.setItem('KORISKO_STATE_V2', JSON.stringify(parsed));
          }
        }
      } catch {}

      // 5. Establish valid customer session
      const finalUser: User = authUser || ({
        id: effectiveUserId,
        app_metadata: {},
        user_metadata: { full_name: cleanName, phone: cleanPhone, role: 'customer' },
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        email: cleanEmail,
      } as any);

      const finalProfile: UserProfile = {
        id: `prof-${effectiveUserId}`,
        userId: effectiveUserId,
        fullName: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: 'customer',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setUser(finalUser);
      setProfile(finalProfile);
      setSession(authSession || ({
        access_token: 'local-token-cust',
        refresh_token: 'local-refresh-cust',
        expires_in: 360000,
        token_type: 'bearer',
        user: finalUser,
      } as any));

      try {
        localStorage.setItem('KORISKO_SAVED_PROFILE', JSON.stringify(finalProfile));
        localStorage.setItem('KORISKO_SAVED_USER', JSON.stringify(finalUser));
        localStorage.setItem('KORISKO_AUTH_SESSION', 'true');
      } catch {}

      return { error: null, user: finalUser };
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
        localStorage.removeItem('KORISKO_SAVED_PROFILE');
        localStorage.removeItem('KORISKO_SAVED_USER');
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
