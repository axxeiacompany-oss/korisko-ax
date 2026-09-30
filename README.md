# Korisko Gestão & PDV 🍞⚡

Sistema completo de Gestão, Ponto de Venda (PDV), Controle de Estoque, Fichas Técnicas, CRM de Clientes, Metas, Comissões e Afiliados para Padarias, Confeitarias e Comércios.

---

## 🚀 Como Abrir e Rodar no Visual Studio Code (VS Code)

### 1. Pré-requisitos
Certifique-se de ter instalado em seu computador:
- **Node.js** (versão 18 ou superior): [Baixar Node.js](https://nodejs.org/)
- **Visual Studio Code**: [Baixar VS Code](https://code.visualstudio.com/)

---

### 2. Abrir o Projeto no VS Code
1. Extraia o arquivo `.zip` baixado em uma pasta de sua preferência (ex: `C:\Projetos\korisko-pdv` ou `~/korisko-pdv`).
2. Abra o VS Code.
3. Clique em **File > Open Folder...** (ou `Arquivo > Abrir Pasta...`) e selecione a pasta do projeto.

---

### 3. Configurar Variáveis de Ambiente
1. No VS Code, abra o Terminal integrado pressionando `Ctrl + \`` (ou menu `Terminal > New Terminal`).
2. Copie o arquivo de exemplo de ambiente:
   - **No Linux/macOS:**
     ```bash
     cp .env.example .env
     ```
   - **No Windows (PowerShell):**
     ```powershell
     copy .env.example .env
     ```
*(As credenciais do Supabase já vêm pré-configuradas no `.env.example`).*

---

### 4. Instalar as Dependências
No terminal do VS Code, execute:
```bash
npm install
```

---

### 5. Iniciar o Sistema
Para iniciar o servidor local com recarregamento em tempo real:
```bash
npm run dev
```

O terminal exibirá:
```
➜  Local:   http://localhost:3000/
```

Abra o seu navegador e acesse: **[http://localhost:3000](http://localhost:3000)**.

---

## 🔑 Credenciais de Acesso Inicial

| Perfil | Usuário / E-mail | Senha / PIN | Permissões |
| :--- | :--- | :--- | :--- |
| **Administrador (Ax)** | `Ax` ou `axxeiacompany@gmail.com` | `9APG_47z-EgF4yz` | Acesso Total (PDV, Estoque, CRM, Metas, Afiliados, Backup) |
| **Afiliada (Claudia)** | `claudia` ou `claudia@korisko.com` | `446183` | PDV, Venda Rápida, Dashboard, CRM |

---

## 📁 Estrutura do Projeto

```
├── data/                    # Banco local de fallback (JSON)
│   ├── korisko_state.json   # Estado persistido (produtos, vendas, funcionários)
│   └── korisko_backups.json # Pontos de restauração automáticos
├── public/                  # Arquivos estáticos e ícones
├── src/
│   ├── components/          # Componentes visuais do sistema
│   │   ├── modals/          # Modais de PDV, Comandas, Perfil, etc.
│   │   └── views/           # Telas: Dashboard, PDV, Estoque, CRM, Afiliados, etc.
│   ├── context/             # BakeryContext (Gerenciamento global de estado)
│   ├── services/            # Serviços de armazenamento e sincronização Supabase
│   ├── types.ts             # Tipagens TypeScript completas do sistema
│   ├── utils/               # Traduções i18n (Português / Espanhol), formatação
│   ├── App.tsx              # Componente raiz com roteamento e controle de sessão
│   └── main.tsx             # Ponto de entrada do React 19
├── server.ts                # Servidor Express Full-Stack com proxy Vite e endpoints da API
├── package.json             # Dependências e scripts de execução
├── tsconfig.json            # Configuração do TypeScript
└── vite.config.ts           # Configuração do empacotador Vite e Tailwind CSS
```

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 19, TypeScript, Tailwind CSS v4, Lucide React, Motion.
- **Backend / API:** Node.js, Express, tsx.
- **Banco de Dados:** Supabase (PostgreSQL em Nuvem) com espelho local em `data/korisko_state.json`.
- **Empacotador:** Vite 8.
