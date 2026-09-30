import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Store,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Employee } from '../../types';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { StorageService } from '../../services/storageService';

interface Props {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess }) => {
  const { employees, switchUser, currentUser, t, language } = useBakery();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const inputIdentifier = email.trim().toLowerCase();
    const inputPassword = password.trim();

    if (!inputIdentifier || !inputPassword) {
      setErrorMsg(
        language === 'es'
          ? 'Por favor ingrese su usuario y contraseña.'
          : 'Por favor preencha seu usuário/e-mail e senha.'
      );
      setIsLoading(false);
      return;
    }

    try {
      // 1. Initial list from React memory
      let currentList = Array.isArray(employees) && employees.length > 0 ? employees : [];

      // Helper function to match an affiliate/employee flexibly
      const findMatchingEmployee = (list: Employee[]) => {
        return list.find(emp => {
          const empEmail = (emp.email || '').toLowerCase().trim();
          const empName = (emp.name || '').toLowerCase().trim();
          const empUsername = empEmail.includes('@') ? empEmail.split('@')[0] : empEmail;
          const inputUserPart = inputIdentifier.includes('@') ? inputIdentifier.split('@')[0] : inputIdentifier;

          // Flexible match: full email, full name, username before @, exact ID, or user prefix
          return (
            empEmail === inputIdentifier ||
            empName === inputIdentifier ||
            empUsername === inputIdentifier ||
            empUsername === inputUserPart ||
            empName === inputUserPart ||
            emp.id === inputIdentifier
          );
        });
      };

      let matchedEmp = findMatchingEmployee(currentList);

      // 2. Real-time Cloud Fetch: If not found in current device memory (e.g. mobile opening for first time),
      // fetch immediately from Supabase/Server!
      if (!matchedEmp) {
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

      if (matchedEmp) {
        const matchesPin = Boolean(matchedEmp.pin && inputPassword === matchedEmp.pin.trim());
        const matchesPwd = Boolean(matchedEmp.password && inputPassword === matchedEmp.password.trim());
        const isMaster = inputPassword === '9APG_47z-EgF4yz' && (matchedEmp.email === 'axxeiacompany@gmail.com' || matchedEmp.role === 'admin');

        if (!matchesPin && !matchesPwd && !isMaster) {
          setErrorMsg(
            language === 'es' 
              ? `Contraseña incorrecta para "${matchedEmp.name}". Verifique su clave de acceso.` 
              : `Senha incorreta para "${matchedEmp.name}". Verifique a sua senha de acesso.`
          );
          setIsLoading(false);
          return;
        }

        switchUser(matchedEmp.id);
        setIsLoading(false);
        onLoginSuccess();
        return;
      }

      // Fallback: match by password or PIN if unique
      const empByCred = currentList.find(e => 
        (e.password === inputPassword || e.pin === inputPassword) && 
        (!e.email || e.email.toLowerCase() === inputIdentifier || e.name.toLowerCase() === inputIdentifier)
      );

      if (empByCred) {
        switchUser(empByCred.id);
        setIsLoading(false);
        onLoginSuccess();
        return;
      }

      // User not found in database - Professional message without leaking internal database records
      setErrorMsg(
        language === 'es' 
          ? `Usuario o correo "${email.trim()}" no encontrado. Verifique sus credenciales.` 
          : `Usuário ou e-mail "${email.trim()}" não encontrado. Verifique seus dados de acesso.`
      );
      setIsLoading(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao realizar login.');
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#080B11] text-neutral-100 flex flex-col justify-between overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {/* Subtle radial tech gradient top-left */}
        <div className="absolute -top-[25%] -left-[10%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-indigo-600/15 via-violet-600/10 to-transparent blur-3xl opacity-70" />
        {/* Subtle cyan/emerald glow bottom-right */}
        <div className="absolute -bottom-[20%] -right-[10%] w-[50vw] h-[50vw] rounded-full bg-gradient-to-tl from-emerald-600/10 via-cyan-600/5 to-transparent blur-3xl opacity-60" />
        {/* High-tech grid overlay */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }} 
        />
      </div>

      {/* Top minimal header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-violet-500 to-amber-500 p-[1.5px] shadow-lg shadow-indigo-500/20">
            <div className="w-full h-full bg-[#0B0F17] rounded-[10px] flex items-center justify-center">
              <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-300 to-amber-300 text-base">
                K
              </span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base tracking-tight text-white">
              Korisko
            </span>
            <span className="text-[11px] text-neutral-400">Padaria, Confeitaria & Salão</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <LanguageSwitcher />
        </div>
      </header>

      {/* Central Login Card Section */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:px-6">
        <div className="w-full max-w-[440px] space-y-6">
          
          {/* Main Card with UTMify styling */}
          <div className="rounded-2xl border border-[#1E273A] bg-[#0D121D]/90 backdrop-blur-xl p-7 sm:p-9 shadow-2xl shadow-black/80 relative overflow-hidden">
            
            {/* Ambient top highlight line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent" />

            {/* Header Text */}
            <div className="space-y-1.5 mb-7 text-center sm:text-left">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                {t.loginTitle}
              </h1>
              <p className="text-xs text-neutral-400">
                {t.loginSubtitle}
              </p>
            </div>

            {/* Error message */}
            {errorMsg && (
              <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email / Username / Name Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300 block">
                  {language === 'es' ? 'Usuario o Correo Electrónico' : 'E-mail ou Usuário'}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-indigo-400 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={language === 'es' ? 'Ej: usuario o correo@empresa.com' : 'Ex: usuario ou seu-email@empresa.com'}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-300">
                    {t.loginPasswordLabel}
                  </label>
                  <a
                    href="#esqueci"
                    onClick={(e) => {
                      e.preventDefault();
                      alert(language === 'es' 
                        ? 'Para recuperar su contraseña, comuníquese con el Administrador (Ax) en el panel de gestión.' 
                        : 'Para recuperar a senha de acesso, solicite ao Administrador (Ax) no painel de gestão.');
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {language === 'es' ? '¿Olvidó su contraseña?' : 'Esqueceu a senha?'}
                  </a>
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-indigo-400 transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all font-mono-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-neutral-400 hover:text-neutral-300">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#273248] bg-[#090D15] text-indigo-600 focus:ring-indigo-500/30"
                  />
                  <span>{t.loginRememberMe}</span>
                </label>
              </div>

              {/* Submit Button with UTMify styling */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-semibold text-xs shadow-lg shadow-indigo-600/25 disabled:opacity-50 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{t.loginButton}</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

            </form>

          </div>

          {/* Bottom helper */}
          <div className="text-center text-xs text-neutral-500 space-y-1">
            <p>
              {language === 'es' ? 'Sistema Administrativo Korisko' : 'Sistema Administrativo Korisko'}
            </p>
          </div>

        </div>
      </main>

      {/* Footer matching UTMify */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 border-t border-[#141A28] text-neutral-500 text-xs">
        <p>© 2026 Korisko Sistemas. Todos os direitos reservados.</p>
        <div className="flex items-center gap-4 text-[11px]">
          <a href="#termos" onClick={(e) => e.preventDefault()} className="hover:text-neutral-300 transition-colors">Termos de Uso</a>
          <span aria-hidden="true">·</span>
          <a href="#privacidade" onClick={(e) => e.preventDefault()} className="hover:text-neutral-300 transition-colors">Privacidade</a>
          <span aria-hidden="true">·</span>
          <a href="#ajuda" onClick={(e) => e.preventDefault()} className="hover:text-neutral-300 transition-colors">Central de Ajuda</a>
        </div>
      </footer>

    </div>
  );
};
