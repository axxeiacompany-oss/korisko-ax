import React, { useState } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { Employee, UserRole } from '../../types';
import { Shield, KeyRound, Check, X, UserCheck } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const SwitchEmployeeModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { employees, currentUser, switchUser } = useBakery();
  const [selectedEmp, setSelectedEmp] = useState<Employee | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSelectEmployee = (emp: Employee) => {
    setSelectedEmp(emp);
    setPinInput('');
    setError('');
  };

  const handleConfirmSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;

    // Verify PIN
    if (selectedEmp.pin && pinInput !== selectedEmp.pin) {
      setError('PIN incorreto. Tente novamente.');
      return;
    }

    switchUser(selectedEmp.id, pinInput);
    onClose();
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Administrador / Proprietário';
      case 'gerente':
        return 'Gerente de Loja';
      case 'caixa':
        return 'Caixa & Atendimento';
      case 'padeiro':
        return 'Padeiro & Confeiteiro';
    }
  };

  const getRoleDescription = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'Acesso irrestrito a financeiro, metas, taxas de câmbio e backups.';
      case 'gerente':
        return 'Controle de caixa, relatórios, ajustes de estoque e metas.';
      case 'caixa':
        return 'Acesso ao PDV de vendas, recebimentos multi-moeda e consulta de caixa.';
      case 'padeiro':
        return 'Controle de fornadas, estoque de farinhas, perdas e ingredientes.';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-neutral-100">Alternar Funcionário</h2>
              <p className="text-xs text-neutral-400">Selecione o perfil e insira o PIN de segurança</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Employee list */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-neutral-400 uppercase tracking-wider">
              Funcionários Cadastrados
            </label>
            <div className="grid gap-2">
              {employees.map((emp) => {
                const isCurrent = emp.id === currentUser.id;
                const isSelected = selectedEmp?.id === emp.id || (!selectedEmp && isCurrent);

                return (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelectEmployee(emp)}
                    className={`flex items-start justify-between p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20'
                        : 'border-neutral-800 bg-neutral-800/40 hover:border-neutral-700 hover:bg-neutral-800/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-inner ${emp.avatarColor}`}>
                        {emp.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-neutral-100">{emp.name}</span>
                          {isCurrent && (
                            <span className="text-[10px] bg-neutral-800 text-amber-400 border border-neutral-700 rounded px-1.5 py-0.5">
                              Ativo
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-amber-400/90 font-medium mt-0.5">
                          {getRoleLabel(emp.role)}
                        </p>
                        <p className="text-[11px] text-neutral-500 mt-1 line-clamp-1">
                          {getRoleDescription(emp.role)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-1">
                      {isSelected && (
                        <div className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-neutral-950">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* PIN input form */}
          <form onSubmit={handleConfirmSwitch} className="space-y-4 pt-2 border-t border-neutral-800">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-neutral-300 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                  PIN de Acesso
                </label>
                <span className="text-[11px] text-neutral-500">
                  Insira o PIN de segurança
                </span>
              </div>
              <input
                type="password"
                maxLength={6}
                value={pinInput}
                onChange={(e) => {
                  setPinInput(e.target.value);
                  setError('');
                }}
                placeholder="Digite o PIN do perfil..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono tracking-widest text-center"
                autoFocus
              />
              {error && (
                <p className="text-xs text-rose-400 mt-1.5">{error}</p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-neutral-800 text-xs font-medium text-neutral-300 hover:bg-neutral-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-semibold shadow-lg shadow-amber-500/10 transition-colors flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                Acessar Perfil
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
};
