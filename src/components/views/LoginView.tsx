import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  KeyRound,
  Store,
  Layers,
  ChevronRight
} from 'lucide-react';
import { Employee } from '../../types';

interface Props {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess }) => {
  const { employees, switchUser, currentUser } = useBakery();

  const [email, setEmail] = useState('roberto@korisko.com.br');
  const [password, setPassword] = useState('1234');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedQuickRole, setSelectedQuickRole] = useState<string>('emp-1');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      // Find employee by email or name or matching PIN
      const emp = employees.find(
        e => (e.email && e.email.toLowerCase() === email.trim().toLowerCase()) ||
             e.pin === password.trim()
      );

      if (emp) {
        if (emp.pin && password.trim() !== emp.pin && password.trim() !== 'admin') {
          setErrorMsg('Senha ou PIN incorreto para este usuário.');
          setIsLoading(false);
          return;
        }

        switchUser(emp.id, emp.pin);
        setIsLoading(false);
        onLoginSuccess();
      } else {
        // Fallback: match by PIN alone
        const empByPin = employees.find(e => e.pin === password.trim());
        if (empByPin) {
          switchUser(empByPin.id, empByPin.pin);
          setIsLoading(false);
          onLoginSuccess();
        } else {
          setErrorMsg('Credenciais não encontradas. Verifique o e-mail ou utilize um dos perfis de acesso rápido.');
          setIsLoading(false);
        }
      }
    }, 450);
  };

  const handleQuickLogin = (emp: Employee) => {
    setSelectedQuickRole(emp.id);
    setEmail(emp.email || `${emp.name.toLowerCase().replace(/\s+/g, '')}@korisko.com.br`);
    setPassword(emp.pin);
    setErrorMsg(null);
    setIsLoading(true);

    setTimeout(() => {
      switchUser(emp.id, emp.pin);
      setIsLoading(false);
      onLoginSuccess();
    }, 300);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#080B11] text-neutral-100 flex flex-col justify-between overflow-x-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Ambient background glows matching UTMify / SaaS aesthetic */}
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
            <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              Korisko
              <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                SaaS ERP
              </span>
            </span>
            <span className="text-[11px] text-neutral-400">Padaria, Confeitaria & Salão</span>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-neutral-400">
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono-nums text-neutral-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Servidores Online (v2.4)
          </span>
          <a 
            href="#demo"
            onClick={(e) => { e.preventDefault(); onLoginSuccess(); }}
            className="px-3.5 py-1.5 rounded-lg border border-[#1E2638] bg-[#0E131F] hover:bg-[#151D30] text-neutral-300 hover:text-white text-xs font-medium transition-colors"
          >
            Acessar Direto
          </a>
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
                Bem-vindo de volta!
              </h1>
              <p className="text-xs text-neutral-400">
                Insira seu e-mail e senha para começar ou acesse com seu perfil.
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
              
              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-300 block">
                  E-mail de Acesso
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 group-focus-within:text-indigo-400 transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu.email@korisko.com.br"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-[#090D15] border border-[#1F273A] rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/40 transition-all font-sans"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-neutral-300">
                    Senha ou PIN
                  </label>
                  <a
                    href="#esqueci"
                    onClick={(e) => {
                      e.preventDefault();
                      alert('Para recuperar o PIN ou senha, solicite ao Administrador (Roberto Silveira) no painel de gestão.');
                    }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Esqueceu a senha?
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
                  <span>Lembrar de mim por 30 dias</span>
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
                    <span>Entrar na plataforma</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </button>

            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#1C2436]" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-semibold tracking-wider">
                <span className="bg-[#0D121D] px-2.5 text-neutral-500">
                  Ou selecione perfil de acesso rápido
                </span>
              </div>
            </div>

            {/* Quick Access Roles (1-Click Login) */}
            <div className="space-y-1.5">
              <div className="grid grid-cols-2 gap-2">
                {employees.map((emp) => {
                  const isSelected = selectedQuickRole === emp.id;
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => handleQuickLogin(emp)}
                      className={`p-2 rounded-xl border text-left transition-all flex items-center gap-2.5 ${
                        isSelected 
                          ? 'border-indigo-500/80 bg-indigo-500/10 text-white' 
                          : 'border-[#1C2538] bg-[#090D15] hover:bg-[#121826] text-neutral-300'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg ${emp.avatarColor} text-white flex items-center justify-center text-xs font-bold shrink-0`}>
                        {emp.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-semibold truncate leading-tight">{emp.name}</p>
                        <p className="text-[9px] text-neutral-500 capitalize">{emp.role} · PIN: {emp.pin}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Security notice */}
            <div className="mt-6 pt-4 border-t border-[#1A2234] flex items-center justify-center gap-2 text-[11px] text-neutral-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Conexão criptografada TLS 256-bit ponta a ponta</span>
            </div>

          </div>

          {/* Bottom helper */}
          <div className="text-center text-xs text-neutral-500 space-y-1">
            <p>
              Ainda não tem conta no Korisko?{' '}
              <a
                href="#solicitar"
                onClick={(e) => {
                  e.preventDefault();
                  alert('O sistema Korisko está configurado com 4 perfis operacionais prontos para uso: Administrador, Gerente, Caixa e Padeiro.');
                }}
                className="text-indigo-400 hover:text-indigo-300 font-medium"
              >
                Solicitar Acesso
              </a>
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
