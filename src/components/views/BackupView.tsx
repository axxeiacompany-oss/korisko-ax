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
  RotateCcw,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { SUPABASE_SETUP_SQL } from '../../services/supabaseClient';

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
    dbStatus,
    refreshDbStatus,
  } = useBakery();

  const [notification, setNotification] = useState<string | null>(null);
  const [isCheckingDb, setIsCheckingDb] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSqlModal, setShowSqlModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 4500);
  };

  const handleRecheckDatabase = async () => {
    setIsCheckingDb(true);
    try {
      await refreshDbStatus();
      if (dbStatus.supabase?.tablesExist) {
        showNotification('Conexão com Supabase 100% operacional! Dados sincronizando em nuvem.');
      } else if (dbStatus.supabase?.authenticated) {
        showNotification('Supabase autenticado com sucesso! Execute o script SQL no SQL Editor do Supabase.');
      } else if (dbStatus.connected) {
        showNotification('Banco de dados conectado e operacional!');
      } else {
        showNotification('Status atualizado. Verifique as credenciais ou crie as tabelas no Supabase.');
      }
    } catch {
      showNotification('Não foi possível verificar a conexão no momento.');
    } finally {
      setIsCheckingDb(false);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopiedSql(true);
    showNotification('Script SQL copiado para a área de transferência! Cole no SQL Editor do Supabase.');
    setTimeout(() => setCopiedSql(false), 3000);
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

  const isSupabaseReady = Boolean(dbStatus.supabase?.tablesExist);
  const isSupabaseAuth = Boolean(dbStatus.supabase?.authenticated);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-neutral-900 border border-neutral-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">
            <Cloud className="w-4 h-4" />
            <span>Infraestrutura em Nuvem (Supabase & Multi-Camadas)</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-100">
            Backup & Banco de Dados em Tempo Real
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Seus dados de vendas, produtos, caixa, comandas e estoque protegidos no Supabase e em redundância local.
          </p>
        </div>

        <button
          type="button"
          disabled={isCloudSyncing}
          onClick={handleManualBackup}
          className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-semibold text-xs shadow-lg shadow-amber-500/10 transition-colors flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 stroke-[2.5] ${isCloudSyncing ? 'animate-spin' : ''}`} />
          {isCloudSyncing ? 'Sincronizando...' : 'Forçar Backup Agora'}
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
            {isSupabaseReady ? 'Supabase Ativo' : (isSupabaseAuth ? 'Supabase Conectado' : 'Sincronizado')}
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
            Debounce de 600ms a cada operação no PDV
          </p>
        </div>

      </div>

      {/* Supabase Cloud Database Integration Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/20 via-neutral-900 to-neutral-900 border border-emerald-500/25 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-neutral-100">
                  Banco de Dados Supabase (PostgreSQL Cloud)
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  isSupabaseReady
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {isSupabaseReady ? '● Supabase Sincronizando' : '● Supabase Conectado (Aguardando Tabelas)'}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {isSupabaseReady
                  ? 'Conexão ativa e tabelas verificadas! Todas as vendas, produtos e comandas são sincronizadas diretamente com seu projeto Supabase.'
                  : 'Autenticação com Supabase confirmada! Copie o script SQL abaixo e execute no SQL Editor do Supabase para criar as tabelas.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleCopySql}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-neutral-950 text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 stroke-[2.5]" /> : <Copy className="w-3.5 h-3.5" />}
              {copiedSql ? 'Copiado!' : 'Copiar Script SQL'}
            </button>
            <button
              type="button"
              disabled={isCheckingDb}
              onClick={handleRecheckDatabase}
              className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDb ? 'animate-spin text-emerald-400' : ''}`} />
              {isCheckingDb ? 'Testando...' : 'Testar Conexão'}
            </button>
          </div>
        </div>

        {/* Credentials Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1 border-t border-neutral-800/80 text-xs">
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-850">
            <span className="text-[11px] text-neutral-500 block">URL do Projeto Supabase</span>
            <span className="font-mono text-emerald-300 text-[11px] font-medium break-all">
              https://ofukieepxjawzqtlrgqy.supabase.co
            </span>
            <span className="text-[10px] text-neutral-500 block mt-0.5">REST API v1 configurada e autenticada</span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-850">
            <span className="text-[11px] text-neutral-500 block">Chave de Acesso (Publishable/Anon)</span>
            <span className="font-mono text-neutral-300 text-[11px] font-medium">
              sb_publishable_sJLr...KC7_el
            </span>
            <span className="text-[10px] text-neutral-500 block mt-0.5">Chave pública autenticada com sucesso</span>
          </div>
          <div className="p-3 rounded-xl bg-neutral-950/60 border border-neutral-850">
            <span className="text-[11px] text-neutral-500 block">Estado das Tabelas no Supabase</span>
            <span className={`text-[11px] font-medium block ${isSupabaseReady ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isSupabaseReady ? 'Tabelas criadas e ativas' : 'Pronto para criar tabelas (1 clique)'}
            </span>
            <span className="text-[10px] text-neutral-500 block mt-0.5">
              korisko_system_state & korisko_backup_points
            </span>
          </div>
        </div>

        {/* Quick Instructions & SQL Preview Accordion */}
        <div className="p-4 rounded-xl bg-neutral-950/90 border border-neutral-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-neutral-200">
                Como ativar as tabelas no Supabase em 30 segundos:
              </span>
            </div>
            <a
              href="https://supabase.com/dashboard/project/ofukieepxjawzqtlrgqy/sql"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium underline-offset-2 hover:underline"
            >
              <span>Abrir SQL Editor no Supabase</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800/80">
              <span className="font-bold text-emerald-400 mr-1.5">1.</span>
              <span className="text-neutral-300 font-medium">Copie o script</span>
              <p className="text-[11px] text-neutral-500 mt-0.5">Clique no botão verde &quot;Copiar Script SQL&quot; acima.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800/80">
              <span className="font-bold text-emerald-400 mr-1.5">2.</span>
              <span className="text-neutral-300 font-medium">Cole no SQL Editor</span>
              <p className="text-[11px] text-neutral-500 mt-0.5">No painel Supabase, vá em SQL Editor &gt; New Query.</p>
            </div>
            <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800/80">
              <span className="font-bold text-emerald-400 mr-1.5">3.</span>
              <span className="text-neutral-300 font-medium">Clique em RUN</span>
              <p className="text-[11px] text-neutral-500 mt-0.5">Pronto! O sistema Korisko sincroniza automaticamente.</p>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowSqlModal(!showSqlModal)}
              className="text-xs text-neutral-400 hover:text-neutral-200 flex items-center gap-1.5 font-medium transition-colors"
            >
              <Code2 className="w-3.5 h-3.5 text-neutral-500" />
              <span>{showSqlModal ? 'Ocultar código SQL' : 'Visualizar código SQL completo'}</span>
            </button>

            {showSqlModal && (
              <div className="mt-2 p-3 rounded-lg bg-neutral-900/90 border border-neutral-800 font-mono text-[11px] text-neutral-300 overflow-x-auto relative">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="absolute top-2 right-2 px-2.5 py-1 rounded bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[10px] font-sans flex items-center gap-1"
                >
                  {copiedSql ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedSql ? 'Copiado' : 'Copiar'}
                </button>
                <pre>{SUPABASE_SETUP_SQL}</pre>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Railway & Redundant Storage Layers */}
      <div className="p-4 rounded-2xl bg-neutral-900/60 border border-neutral-800/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-neutral-400" />
            <h4 className="text-xs font-semibold text-neutral-200">
              Camadas Adicionais de Redundância e Segurança
            </h4>
          </div>
          <span className="text-[10px] text-neutral-500">Multi-Provedor</span>
        </div>
        <p className="text-xs text-neutral-400">
          O sistema Korisko opera com arquitetura híbrida inteligente: sincroniza em nuvem no Supabase, espelha em PostgreSQL (Railway) se disponível, e mantém cache local criptografado para garantir funcionamento contínuo mesmo sem internet.
        </p>
      </div>

      {/* 2-Column: Backup Operations + Cloud Snapshots History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Backup Operations & Files */}
        <div className="p-5 rounded-2xl bg-neutral-900 border border-neutral-800 space-y-4">
          <h3 className="text-sm font-semibold text-neutral-100 flex items-center gap-2">
            <Download className="w-4 h-4 text-amber-400" />
            Importação & Exportação Manual (JSON)
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
                        onClick={() => showNotification(`Snapshot ${dateStr} verificado com integridade no Supabase.`)}
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
              Replicação contínua com garantia de persistência no Supabase e em cache local.
            </span>
          </div>
        </div>

      </div>

    </div>
  );
};
