import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { UserProfile, ProfileRole } from '../types';
import { listUsuarios } from '../lib/db';
import {
  checkLoginLockout,
  recordFailedLoginAttempt,
  clearLoginAttempts,
  hashPasswordSha256,
  verifyStoredPassword,
  createSecureSessionMeta,
  isSessionMetaValid,
  clearSecureSessionMeta,
  recordLoginAuditEvent,
} from '../utils/loginSecurity';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: ProfileRole;
  isLoading: boolean;
  isAuthenticated: boolean;
  signIn: (email: string, password: string, rememberDevice?: boolean) => Promise<{ error: AuthError | Error | null }>;
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

  // Initial Auth Check and listener with Session Expiration Validation
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
            // Validate local session integrity and expiration before restoring
            const sessionCheck = isSessionMetaValid();
            if (sessionCheck.valid) {
              try {
                const savedProfileStr = localStorage.getItem('KORISKO_SAVED_PROFILE');
                const savedUserStr = localStorage.getItem('KORISKO_SAVED_USER');
                if (savedProfileStr && savedUserStr) {
                  const parsedProfile = JSON.parse(savedProfileStr);
                  const parsedUser = JSON.parse(savedUserStr);
                  if (parsedProfile?.userId && parsedUser?.id && parsedProfile.userId === parsedUser.id) {
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
                }
              } catch {
                clearSecureSessionMeta();
              }
            } else {
              clearSecureSessionMeta();
            }
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

  // Sign In with email and password (with strict credential verification & brute-force protection)
  const signIn = async (email: string, password: string, rememberDevice = true) => {
    try {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const cleanPassword = password.trim();

      // 0. Check brute-force rate limit lockout
      const lockout = checkLoginLockout(cleanEmail);
      if (lockout.isLocked) {
        await recordLoginAuditEvent({
          eventType: 'bloqueio_forca_bruta',
          identifier: cleanEmail,
          success: false,
          details: `Acesso bloqueado temporariamente (${lockout.remainingSeconds}s restantes) após múltiplas tentativas inválidas.`,
        });
        return {
          error: new Error(
            `Muitas tentativas incorretas. Por segurança, aguarde ${lockout.remainingSeconds} segundos antes de tentar novamente.`
          ),
        };
      }

      // 1. Try Supabase Auth (only if identifier is a valid email format)
      if (cleanEmail.includes('@')) {
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword,
          });

          if (!error && data.user) {
            setUser(data.user);
            setSession(data.session);
            const p = await fetchUserProfile(data.user);
            clearLoginAttempts(cleanEmail);
            createSecureSessionMeta({
              userId: data.user.id,
              email: data.user.email || cleanEmail,
              role: p?.role || 'customer',
              rememberDevice,
            });
            if (p) {
              try {
                localStorage.setItem('KORISKO_SAVED_PROFILE', JSON.stringify(p));
                localStorage.setItem('KORISKO_SAVED_USER', JSON.stringify(data.user));
                localStorage.setItem('KORISKO_AUTH_SESSION', 'true');
                if (rememberDevice) {
                  localStorage.setItem('KORISKO_REMEMBER_DEVICE', 'true');
                }
              } catch {}
            }
            await recordLoginAuditEvent({
              eventType: 'login_sucesso',
              identifier: cleanEmail,
              userId: data.user.id,
              userName: p?.fullName || data.user.email,
              userRole: p?.role || 'customer',
              success: true,
              details: 'Autenticação realizada via Supabase Auth.',
            });
            return { error: null };
          }
        } catch (authErr) {
          console.warn('[AuthContext] Supabase sign in notice, checking fallback:', authErr);
        }
      }

      // 2. Check Admin Ax & Employees (from Supabase `usuarios` table + local state)
      let localEmployees: any[] = [];
      try {
        const dbUsers = await listUsuarios();
        if (Array.isArray(dbUsers) && dbUsers.length > 0) {
          localEmployees = dbUsers;
        }
      } catch {}

      if (localEmployees.length === 0) {
        try {
          const rawState = localStorage.getItem('KORISKO_STATE_V2');
          if (rawState) {
            const parsed = JSON.parse(rawState);
            if (Array.isArray(parsed.employees)) {
              localEmployees = parsed.employees;
            }
          }
        } catch {}
      }

      const matchedEmp = localEmployees.find((e: any) => {
        const eEmail = (e.email || '').toLowerCase().trim();
        const eName = (e.name || '').toLowerCase().trim();
        if (cleanEmail.includes('@')) {
          return eEmail === cleanEmail;
        }
        const eUserPrefix = eEmail.includes('@') ? eEmail.split('@')[0] : eEmail;
        return (
          eName === cleanEmail ||
          eUserPrefix === cleanEmail ||
          e.id === cleanEmail
        );
      });

      // Strict Master Admin verification (NO weak 'admin' password allowed!)
      const isMasterAx =
        (cleanEmail === 'axxeiacompany@gmail.com' || cleanEmail === 'ax') &&
        cleanPassword === '9APG_47z-EgF4yz';

      let isEmpValid = false;
      if (matchedEmp) {
        const pwdMatch = await verifyStoredPassword(cleanPassword, matchedEmp.password);
        const pinMatch = await verifyStoredPassword(cleanPassword, matchedEmp.pin);
        isEmpValid = pwdMatch || pinMatch;
      }

      if (isMasterAx || isEmpValid) {
        const rawEmpRole = isMasterAx ? 'admin' : (matchedEmp?.role || 'employee');
        const roleToAssign: ProfileRole =
          rawEmpRole === 'admin'
            ? 'admin'
            : rawEmpRole === 'gerente'
            ? 'manager'
            : rawEmpRole === 'afiliado'
            ? 'affiliate'
            : 'employee';
        const empName = isMasterAx ? 'Ax' : (matchedEmp?.name || 'Colaborador');
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

        clearLoginAttempts(cleanEmail);
        createSecureSessionMeta({
          userId: empId,
          email: empEmail,
          role: roleToAssign,
          rememberDevice,
        });

        try {
          localStorage.setItem('KORISKO_SAVED_PROFILE', JSON.stringify(localProfile));
          localStorage.setItem('KORISKO_SAVED_USER', JSON.stringify(localUser));
          localStorage.setItem('KORISKO_AUTH_SESSION', 'true');
          localStorage.setItem('KORISKO_CURRENT_USER_ID', empId);
          if (rememberDevice) {
            localStorage.setItem('KORISKO_REMEMBER_DEVICE', 'true');
          }
        } catch {}

        await recordLoginAuditEvent({
          eventType: 'login_sucesso',
          identifier: cleanEmail,
          userId: empId,
          userName: empName,
          userRole: rawEmpRole,
          success: true,
          details: `Login de equipe autenticado (${empName} · ${rawEmpRole}).`,
        });

        return { error: null };
      }

      // 3. Check registered customer in localStorage — STRICTLY require verified passwordHash or password
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
        const storedCustomerSecret = matchedCustomer.passwordHash || matchedCustomer.password;
        const isCustomerPasswordValid = await verifyStoredPassword(cleanPassword, storedCustomerSecret);

        if (isCustomerPasswordValid) {
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

          clearLoginAttempts(cleanEmail);
          createSecureSessionMeta({
            userId: matchedCustomer.id,
            email: matchedCustomer.email || cleanEmail,
            role: 'customer',
            rememberDevice,
          });

          try {
            localStorage.setItem('KORISKO_SAVED_PROFILE', JSON.stringify(custProfile));
            localStorage.setItem('KORISKO_SAVED_USER', JSON.stringify(custUser));
            localStorage.setItem('KORISKO_AUTH_SESSION', 'true');
            if (rememberDevice) {
              localStorage.setItem('KORISKO_REMEMBER_DEVICE', 'true');
            }
          } catch {}

          await recordLoginAuditEvent({
            eventType: 'login_sucesso',
            identifier: cleanEmail,
            userId: matchedCustomer.id,
            userName: matchedCustomer.name,
            userRole: 'customer',
            success: true,
            details: `Login de cliente verificado com senha criptografada (${matchedCustomer.name}).`,
          });

          return { error: null };
        }
      }

      // 4. Record failed attempt and trigger brute-force protection if threshold reached
      const updatedLockout = recordFailedLoginAttempt(cleanEmail);
      await recordLoginAuditEvent({
        eventType: updatedLockout.isLocked ? 'bloqueio_forca_bruta' : 'login_falha',
        identifier: cleanEmail,
        success: false,
        details: updatedLockout.isLocked
          ? `Conta/dispositivo bloqueado por ${updatedLockout.remainingSeconds}s após ${updatedLockout.failedAttempts} tentativas falhas.`
          : `Tentativa de login inválida (${updatedLockout.failedAttempts}/${5}).`,
      });

      if (updatedLockout.isLocked) {
        return {
          error: new Error(
            `Acesso bloqueado temporariamente por ${updatedLockout.remainingSeconds}s devido a múltiplas tentativas incorretas.`
          ),
        };
      }

      return {
        error: new Error(
          `Credenciais inválidas. Verifique seu usuário/e-mail e senha (${updatedLockout.remainingAttempts} tentativa(s) restante(s) antes do bloqueio temporário).`
        ),
      };
    } catch (err: any) {
      return { error: err };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up with email, password, full name and phone (hashes password with SHA-256)
  const signUp = async (email: string, password: string, fullName: string, phone?: string) => {
    try {
      setIsLoading(true);
      const cleanEmail = email.trim().toLowerCase();
      const cleanName = fullName.trim();
      const cleanPhone = (phone || '').trim();
      const cleanPassword = password.trim();

      if (cleanPassword.length < 6) {
        return {
          error: new Error('A senha deve possuir no mínimo 6 caracteres para sua segurança.'),
          user: null,
        };
      }

      const passwordHash = await hashPasswordSha256(cleanPassword);
      const customerId = `cust-${Date.now()}`;

      // 1. Try Supabase Auth
      let authUser: User | null = null;
      let authSession: Session | null = null;

      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: cleanPassword,
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
            credit_limit_brl: 500000,
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

      // 4. Update local state customer list in localStorage with SHA-256 passwordHash
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
              passwordHash,
              category: 'varejo' as const,
              creditLimitBrl: 500000,
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

      createSecureSessionMeta({
        userId: effectiveUserId,
        email: cleanEmail,
        role: 'customer',
        rememberDevice: true,
      });

      try {
        localStorage.setItem('KORISKO_SAVED_PROFILE', JSON.stringify(finalProfile));
        localStorage.setItem('KORISKO_SAVED_USER', JSON.stringify(finalUser));
        localStorage.setItem('KORISKO_AUTH_SESSION', 'true');
      } catch {}

      await recordLoginAuditEvent({
        eventType: 'cadastro_conta',
        identifier: cleanEmail,
        userId: effectiveUserId,
        userName: cleanName,
        userRole: 'customer',
        success: true,
        details: `Nova conta de cliente criada com proteção SHA-256 (${cleanName}).`,
      });

      return { error: null, user: finalUser };
    } catch (err: any) {
      return { error: err, user: null };
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Out
  const signOut = async () => {
    const prevEmail = user?.email || profile?.email || 'usuario';
    const prevId = user?.id || profile?.userId;
    const prevName = profile?.fullName;
    const prevRole = profile?.role;

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
      clearSecureSessionMeta();
      await recordLoginAuditEvent({
        eventType: 'logout',
        identifier: prevEmail,
        userId: prevId,
        userName: prevName,
        userRole: prevRole,
        success: true,
        details: 'Sessão encerrada com segurança pelo usuário.',
      });
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
      const nowIso = new Date().toISOString();
      const payload: any = {
        updated_at: nowIso,
      };
      if (updates.fullName !== undefined) payload.full_name = updates.fullName;
      if (updates.phone !== undefined) payload.phone = updates.phone;
      if (updates.avatarUrl !== undefined) payload.avatar_url = updates.avatarUrl;

      // Attempt update on profiles if table exists
      try {
        await supabase
          .from('profiles')
          .update(payload)
          .eq('user_id', user.id);
      } catch {}

      // Also sync to clientes / usuarios table in Supabase
      try {
        const custUpdates: any = { updated_at: nowIso };
        if (updates.fullName !== undefined) custUpdates.name = updates.fullName;
        if (updates.phone !== undefined) custUpdates.phone = updates.phone;
        await supabase.from('clientes').update(custUpdates).eq('id', user.id);
      } catch {}

      try {
        if (updates.fullName !== undefined) {
          await supabase.from('usuarios').update({ name: updates.fullName }).eq('id', user.id);
        }
      } catch {}

      const nextProfile: UserProfile = {
        ...profile,
        ...updates,
        updatedAt: nowIso,
      };
      setProfile(nextProfile);
      try {
        localStorage.setItem('KORISKO_SAVED_PROFILE', JSON.stringify(nextProfile));
      } catch {}

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
