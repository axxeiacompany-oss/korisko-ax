import React from 'react';
import { useBakery } from '../context/BakeryContext';
import { Globe } from 'lucide-react';
import { AppLanguage } from '../types';

interface Props {
  compact?: boolean;
  className?: string;
}

export const LanguageSwitcher: React.FC<Props> = ({ compact = false, className = '' }) => {
  const { language, setLanguage, t } = useBakery();

  const toggleLanguage = () => {
    const nextLang: AppLanguage = language === 'es' ? 'pt' : 'es';
    setLanguage(nextLang);
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggleLanguage}
        title={language === 'es' ? 'Cambiar a Português' : 'Traducir al Español'}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#1E273A] bg-[#0E1422] hover:bg-[#151D30] hover:border-indigo-500/40 text-xs font-semibold transition-all cursor-pointer select-none ${className}`}
      >
        <span className="text-sm leading-none">{language === 'es' ? '🇪🇸' : '🇧🇷'}</span>
        <span className="font-mono text-[11px] text-neutral-300">
          {language === 'es' ? 'ES' : 'PT'}
        </span>
      </button>
    );
  }

  return (
    <div className={`inline-flex items-center p-0.5 rounded-xl bg-[#0B0F17] border border-[#1C2538] ${className}`}>
      <button
        type="button"
        onClick={() => setLanguage('es')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          language === 'es'
            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#141B2B]'
        }`}
        title="Español (América Latina / Paraguay / España)"
      >
        <span className="text-xs">🇪🇸</span>
        <span className="text-[11px]">ES</span>
      </button>

      <button
        type="button"
        onClick={() => setLanguage('pt')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
          language === 'pt'
            ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm'
            : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#141B2B]'
        }`}
        title="Português (Brasil)"
      >
        <span className="text-xs">🇧🇷</span>
        <span className="text-[11px]">PT</span>
      </button>
    </div>
  );
};
