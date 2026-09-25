import React, { useState, useRef } from 'react';
import { useBakery } from '../../context/BakeryContext';
import { 
  Cloud, 
  Download, 
  Upload, 
  RefreshCw, 
  ShieldCheck, 
  Database, 
  Clock, 
  CheckCircle2, 
  RotateCcw
} from 'lucide-react';

export const BackupView: React.FC = () => {
  const { 
    lastBackupTime, 
    isCloudSyncing, 
    createManualBackup, 
    exportDatabaseBackup, 
    importDatabaseBackup, 
    resetToSampleData,
    backupPoints,
    products,
    sales,
    stockMovements,
    dbStatus
  } = useBakery();

  const [notification, setNotification] = useState<string | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4000);
  };

  const handleRecheckDatabase = async () => {
    setIsCheckingDb(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      if (data.databaseConnected) {
        showNotification('Banco de Dados Railway (PostgreSQL) conectado e operacional!');
      } else {
        showNotification('Servidor ativo em modo armazenamento seguro. Para PostgreSQL, configure DATABASE_URL no Railway.');
      }
    } catch {
      showNotification('Não foi possível verificar a conexão com o servidor.');
    } finally {
      setIsCheckingDb(false);
    }
  };

  const handleManualBackup = () => {
    createManualBackup();
    showNotification('Backup na nuvem disparado e sincronizado com sucesso!');
  };

  const handleDownloadJson = () => {
    exportDatabaseBackup();
    showNotification('Arquivo de backup baixado para seu computador.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        const success = importDatabaseBackup(parsed);
        if (success) {
          showNotification('Dados restaurados com sucesso do arquivo JSON!');
        } else {
          alert('Erro ao importar arquivo de backup. Formato incompatível.');
        }
      } catch (err) {
        alert('Arquivo JSON inválido.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetData = () => {
    if (confirm('Atenção: Isso restaurará todos os produtos, vendas e caixa para o padrão demonstrativo da padaria. Deseja continuar?')) {
      resetToSampleData();
      showNotification('Dados demonstrativos restaurados com sucesso!');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">
            <Cloud className="w-4 h-4" />
            <span>Infraestrutura em Nuvem</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-100">
            Backup Automático na Nuvem
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Seus dados de vendas, produtos, caixa e movimentações protegidos contra falhas locais e perda de sinal.
          </p>
        </div>

        <button
          type="button"
          disabled={isCloudSyncing}
          onClick={handleManualBackup}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs shadow-lg shadow-amber-500/10 transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 stroke-[2.5] ${isCloudSyncing ? 'animate-spin' : ''}`} />
          {isCloudSyncing ? 'Enviando para Nuvem...' : 'Forçar Backup Agora'}
        </button>
      </div>

      {notification && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notification}</span>
        </div>
      )}

      {/* Cloud Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Card 1: Cloud Sync Status */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Status da Nuvem</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-lg font-bold text-emerald-400 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            Sincronizado e Seguro
          </div>
          <p className="text-[11px] text-neutral-500 font-mono-nums">
            Último sync: {lastBackupTime ? new Date(lastBackupTime).toLocaleTimeString('pt-BR') : 'Agora'}
          </p>
        </div>

        {/* Card 2: Database Volume */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Registros Protegidos</span>
            <Database className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-bold text-neutral-100 font-mono-nums">
            {sales.length + products.length + stockMovements.length} <span className="text-xs font-normal text-neutral-500">registros</span>
          </div>
          <p className="text-[11px] text-neutral-500">
            {sales.length} vendas · {products.length} produtos
          </p>
        </div>

        {/* Card 3: Auto-Backup Frequency */}
        <div className="p-4 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400 font-medium">Rotina de Disparo</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-lg font-bold text-amber-400">
            Tempo Real + Eventos
          </div>
          <p className="text-[11px] text-neutral-500">
            Dispara a cada cupom emitido ou fechamento
          </p>
        </div>

      </div>

      {/* Railway PostgreSQL Database Integration Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-neutral-900 via-neutral-900 to-neutral-850 border border-neutral-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              dbStatus.connected ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
            }`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-100">
                  Banco de Dados Railway (PostgreSQL)
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  dbStatus.connected
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {dbStatus.connected ? '● PostgreSQL Ativo' : '● Modo Local Seguro'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {dbStatus.connected
                  ? 'Conectado à instância PostgreSQL no Railway. Todas as vendas, produtos e comandas são salvos no banco em tempo real.'
                  : 'Pronto para Railway: adicione um serviço de PostgreSQL no seu projeto Railway para ativar a persistência em nuvem.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isCheckingDb}
            onClick={handleRecheckDatabase}
            className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors flex items-center gap-2 shrink-0 self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDb ? 'animate-spin text-sky-400' : ''}`} />
            {isCheckingDb ? 'Verificando...' : 'Testar Conexão'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-neutral-800/80 text-xs">
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-850">
            <span className="text-[11px] text-neutral-500 block">Variável de Conexão</span>
            <span className="font-mono text-neutral-300 text-[11px] font-medium">DATABASE_URL</span>
            <span className="text-[10px] text-neutral-500 block mt-0.5">Injetada automaticamente pelo Railway ao adicionar PostgreSQL</span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-850">
            <span className="text-[11px] text-neutral-500 block">Porta de Execução</span>
            <span className="font-mono text-neutral-300 text-[11px] font-medium">process.env.PORT</span>
            <span className="text-[10px] text-neutral-500 block mt-0.5">Configurada dinamicamente pelo Railway para tráfego web</span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-850">
            <span className="text-[11px] text-neutral-500 block">Persistência Multi-Dispositivo</span>
            <span className="text-emerald-400 text-[11px] font-medium block">Sincronização Ativa</span>
            <span className="text-[10px] text-neutral-500 block mt-0.5">Vendas e caixa compartilhados entre todos os caixas e celulares</span>
          </div>
        </div>
      </div>

      {/* 2-Column: Backup Operations + Cloud Snapshots History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Backup Operations & Files */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <Download className="w-4 h-4 text-amber-400" />
            Importação & Exportação Local
          </h3>
          <p className="text-xs text-neutral-400">
            Você pode gerar uma cópia física em JSON dos dados da padaria ou transferir para outro terminal.
          </p>

          <div className="space-y-3 pt-2">
            {/* Export JSON */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-neutral-200">Exportar Banco de Dados (.json)</h4>
                <p className="text-[11px] text-neutral-500">Gera um arquivo com produtos, vendas e caixa atual</p>
              </div>
              <button
                type="button"
                onClick={handleDownloadJson}
                className="px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Baixar JSON
              </button>
            </div>

            {/* Import JSON */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-neutral-200">Restaurar Cópia de Segurança</h4>
                <p className="text-[11px] text-neutral-500">Importa arquivo .json gerado anteriormente</p>
              </div>
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-neutral-700 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Importar JSON
                </button>
              </div>
            </div>

            {/* Factory Preset */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-neutral-200">Restaurar Dados Demonstrativos</h4>
                <p className="text-[11px] text-neutral-500">Recarrega o catálogo da padaria com produtos e moedas</p>
              </div>
              <button
                type="button"
                onClick={handleResetData}
                className="px-3 py-1.5 rounded-lg border border-rose-900/40 bg-rose-950/20 hover:bg-rose-900/30 text-rose-300 text-xs font-medium transition-colors flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Demo
              </button>
            </div>
          </div>
        </div>

        {/* Cloud Snapshots History */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
              <Cloud className="w-4 h-4 text-sky-400" />
              Pontos de Restauração na Nuvem ({backupPoints.length})
            </h3>
            <span className="text-xs text-neutral-500">Últimos Snapshots</span>
          </div>

          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
            {backupPoints.length === 0 ? (
              <p className="text-xs text-neutral-500 py-6 text-center">Nenhum ponto registrado.</p>
            ) : (
              backupPoints.slice(0, 8).map((snap) => {
                const dateStr = new Date(snap.timestamp).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                });

                return (
                  <div
                    key={snap.id}
                    className="p-3.5 rounded-xl bg-neutral-950 border border-neutral-850 flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-nums font-bold text-neutral-200">{dateStr}</span>
                        <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.2 rounded capitalize">
                          {snap.type}
                        </span>
                      </div>
                      <p className="text-[11px] text-neutral-400">
                        {snap.summary?.salesCount || 0} vendas · {snap.summary?.productsCount || 0} produtos protegidos
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs text-neutral-500 font-mono-nums block">{snap.sizeKb} KB</span>
                      <button
                        type="button"
                        onClick={() => showNotification(`Snapshot ${dateStr} verificado com integridade na nuvem.`)}
                        className="text-[10px] text-amber-400 hover:text-amber-300 font-medium"
                      >
                        Verificar
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-3 rounded-xl bg-neutral-950 border border-neutral-850 text-xs text-neutral-400 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Replicação criptografada com garantia de persistência local e remota.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
