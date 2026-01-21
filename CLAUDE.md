# Click People - Sistema de Gestao de Capital Humano

## Stack

- **Framework:** Next.js 16 (App Router)
- **Linguagem:** TypeScript
- **Banco:** PostgreSQL com Prisma ORM
- **API:** tRPC v11
- **Auth:** Better Auth
- **UI:** Tailwind CSS + Base UI (React)
- **Forms:** TanStack Form
- **Monorepo:** Workspaces npm

## Ambientes

| Ambiente | URL | Banco |
|----------|-----|-------|
| Local | http://localhost:3001 | PostgreSQL local |
| Producao | https://click-people-web.vercel.app | Neon PostgreSQL |

- **Hospedagem:** Vercel (deploy automatico via GitHub)
- **Banco Producao:** Neon (sa-east-1)
- **Repositorio:** github.com/pvieira-design/click-people

## Estrutura do Projeto

```
clickpeople/
├── apps/web/              # Aplicacao Next.js
│   ├── src/app/
│   │   ├── (auth)/        # Rotas publicas (login, register, pending, etc)
│   │   ├── (dashboard)/   # Rotas protegidas
│   │   │   ├── dashboard/
│   │   │   ├── solicitacoes/  # Modulos de solicitacao
│   │   │   ├── folha/         # Folha e Bonus
│   │   │   ├── admin/         # Painel administrativo
│   │   │   └── perfil/
│   │   └── api/           # API routes (auth, trpc)
│   └── src/components/    # Componentes React
├── packages/
│   ├── api/               # tRPC routers e procedures
│   ├── auth/              # Configuracao Better Auth
│   ├── db/                # Prisma schema e client
│   ├── env/               # Validacao de variaveis de ambiente
│   └── config/            # Configuracoes compartilhadas
└── docs/                  # Documentacao (regras de negocio)
```

## Comandos

### Desenvolvimento Local

```bash
npm install          # Instalar dependencias
npm run dev          # Iniciar desenvolvimento (porta 3001)
npm run build        # Build de producao
npm run db:push      # Aplicar schema ao banco local
npm run db:seed      # Popular banco local com dados iniciais
npm run db:studio    # Abrir Prisma Studio (banco local)
```

### Producao (Neon)

```bash
./scripts/prod-db.sh push       # Aplicar schema no Neon
./scripts/prod-db.sh seed       # Rodar seed no Neon
./scripts/prod-db.sh providers  # Importar prestadores no Neon
./scripts/prod-db.sh studio     # Prisma Studio (Neon)
./scripts/prod-db.sh admin X    # Ativar usuario X como admin
./scripts/prod-db.sh list       # Listar usuarios
```

### Deploy

```bash
git add . && git commit -m "msg"  # Commit das mudancas
git push origin main              # Push = deploy automatico no Vercel
```

## Variaveis de Ambiente

```env
DATABASE_URL=postgresql://user:pass@localhost:5432/clickpeople
BETTER_AUTH_SECRET=secret-min-32-chars
BETTER_AUTH_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001
```

## Banco de Dados - Models Principais

| Model | Descricao |
|-------|-----------|
| `User` | Usuarios do sistema (status: PENDING/ACTIVE/REJECTED/DISABLED) |
| `Position` | Cargos/Funcoes (o que a pessoa faz - sem hierarquia) |
| `HierarchyLevel` | Niveis hierarquicos para aprovacao (nivel numerico + canApprove) |
| `Area` | 13 areas da empresa |
| `Provider` | Prestadores de servico |
| `RecessRequest` | Solicitacoes de recesso/ferias |
| `TerminationRequest` | Solicitacoes de desligamento |
| `HiringRequest` | Solicitacoes de contratacao |
| `PurchaseRequest` | Solicitacoes de compra |
| `RemunerationRequest` | Solicitacoes de mudanca de remuneracao |
| `ApprovalStep` | Etapas de aprovacao |
| `BonusRecord` | Registros de bonus por area/mes |
| `AuditLog` | Logs de auditoria |
| `SystemConfig` | Configuracoes do sistema (chave/valor JSON) |

### Niveis Hierarquicos (HierarchyLevel)

Niveis simplificados - o cargo (Position) define a funcao especifica (CFO, CEO, etc.)

| Nivel | Nome | Pode Aprovar |
|-------|------|--------------|
| 10 | Junior | Nao |
| 20 | Pleno | Nao |
| 30 | Senior | Nao |
| 35 | Especialista | Nao |
| 40 | Coordenador | Nao |
| 50 | Gerente | Nao |
| 70 | Head | Nao |
| 80 | Diretoria | Sim |
| 90 | C-level | Sim |
| 105 | Vice Presidente | Sim |
| 110 | Socio | Sim |

## tRPC Routers

| Router | Arquivo | Descricao |
|--------|---------|-----------|
| `user` | `packages/api/src/routers/user.ts` | Gestao de usuarios (CRUD, aprovar, rejeitar) |
| `area` | `packages/api/src/routers/area.ts` | CRUD de areas |
| `position` | `packages/api/src/routers/position.ts` | CRUD de cargos/funcoes |
| `hierarchyLevel` | `packages/api/src/routers/hierarchyLevel.ts` | CRUD de niveis hierarquicos |
| `provider` | `packages/api/src/routers/provider.ts` | CRUD de prestadores |
| `recess` | `packages/api/src/routers/recess.ts` | Solicitacoes de recesso/ferias |
| `termination` | `packages/api/src/routers/termination.ts` | Solicitacoes de desligamento |
| `hiring` | `packages/api/src/routers/hiring.ts` | Solicitacoes de contratacao |
| `purchase` | `packages/api/src/routers/purchase.ts` | Solicitacoes de compra |
| `remuneration` | `packages/api/src/routers/remuneration.ts` | Solicitacoes de mudanca de remuneracao |
| `payroll` | `packages/api/src/routers/payroll.ts` | Folha e Bonus |
| `audit` | `packages/api/src/routers/audit.ts` | Logs de auditoria |
| `dashboard` | `packages/api/src/routers/dashboard.ts` | Estatisticas do dashboard |
| `systemConfig` | `packages/api/src/routers/systemConfig.ts` | Configuracao de fluxos de aprovacao |

## Fluxos de Aprovacao

Os fluxos de aprovacao sao **CONFIGURAVEIS** via Admin > Configuracoes.

### Etapas Padrao

| Modulo | Etapas |
|--------|--------|
| Recesso | Area da Solicitacao -> RH -> Socio |
| Desligamento | Area da Solicitacao -> RH -> Socio |
| Contratacao | Area da Solicitacao -> RH -> Financeiro -> Socio |
| Compra | Area da Solicitacao -> Financeiro |
| Remuneracao | Area da Solicitacao -> RH -> Financeiro -> Socio |

### Regras dos Fluxos

1. **Primeira etapa fixa:** Sempre e REQUEST_AREA (area da solicitacao)
2. **Aprovacao manual obrigatoria:** Todas as etapas requerem aprovacao manual, nao existe auto-aprovacao
3. **Admin Override:** Quando um admin aprova uma etapa no lugar do aprovador designado, o sistema exibe um aviso visual
4. **Configuracao via UI:** Admin pode adicionar/remover/reordenar areas em cada fluxo via interface drag-and-drop

### Estrutura Position vs HierarchyLevel

- **Position (Cargo):** O que a pessoa faz (Dev Frontend, Analista, etc.)
- **HierarchyLevel (Nivel):** Senioridade para aprovacoes (Junior, Pleno, Diretor, etc.)

Um usuario tem ambos: `positionId` (funcao) + `hierarchyLevelId` (nivel para aprovacoes).

## Padroes de Codigo

- Componentes: PascalCase (ex: `ApprovalTimeline.tsx`)
- Rotas: kebab-case (ex: `/solicitacoes/contratacao`)
- tRPC procedures: camelCase (ex: `user.listPending`)
- Sempre usar `"use client"` para componentes interativos
- Toast notifications via Sonner
- Validacao de inputs com Zod

## Enums Importantes

### UserStatus
- `PENDING` - Aguardando aprovacao
- `ACTIVE` - Usuario ativo
- `REJECTED` - Rejeitado pelo admin
- `DISABLED` - Desabilitado

### RequestStatus
- `PENDING` - Aguardando aprovacao
- `APPROVED` - Aprovado
- `REJECTED` - Rejeitado

### ApprovalRole
- `AREA_DIRECTOR` - Diretor da Area
- `HR_DIRECTOR` - Diretor de RH
- `CFO` - Diretor Financeiro
- `CEO` - Chief Executive Officer
- `PARTNER` - Socio (aprovacao final)

### BonusTier
- `NONE` - 0%
- `BRONZE` - 10%
- `SILVER` - 15%
- `GOLD` - 20%

### HiringType
- `INCREASE` - Aumento de Quadro
- `REPLACEMENT` - Substituicao

### HiringStatus
- `WAITING` - Aguardando
- `IN_PROGRESS` - Em Andamento
- `HIRED` - Contratado

## Regras de Negocio

Ver `docs/REGRAS_NEGOCIO.md` para documentacao completa das regras de negocio.

## Arquivos Importantes

- `packages/api/src/lib/approval-engine.ts` - Engine de aprovacao
- `packages/api/src/routers/systemConfig.ts` - Router para configuracao de fluxos
- `packages/db/prisma/schema/` - Schema Prisma dividido em arquivos
- `apps/web/src/components/approval-timeline.tsx` - Componente de timeline de aprovacoes
- `apps/web/src/components/approval-flow-editor.tsx` - Editor drag-and-drop de fluxos de aprovacao
- `scripts/prod-db.sh` - Script para comandos no banco de producao
- `vercel.json` - Configuracao do deploy Vercel

## Fluxo de Deploy

### Codigo (Automatico)
1. Edita codigo localmente
2. `git push origin main`
3. Vercel detecta e faz deploy automatico (~1-2 min)

### Schema do Banco (Manual)
1. Edita `packages/db/prisma/schema/`
2. Testa local: `npm run db:push`
3. Aplica em producao: `./scripts/prod-db.sh push`

### Dados/Seeds (Manual)
1. Roda script com `./scripts/prod-db.sh [comando]`

**Importante:** Os bancos local e producao sao independentes. Mudancas de schema/dados devem ser aplicadas em ambos.

## Documentacao Adicional

- `docs/DEPLOY.md` - Guia completo de deploy
- `docs/GIT_WORKFLOW.md` - Guia de Git (branches, commits, como voltar atras)
- `docs/REGRAS_NEGOCIO.md` - Regras de negocio do sistema
