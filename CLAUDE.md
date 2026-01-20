# Click People - Sistema de Gestao de Capital Humano

## Stack

- **Framework:** Next.js 16 (App Router)
- **Linguagem:** TypeScript
- **Banco:** PostgreSQL com Prisma ORM
- **API:** tRPC v11
- **Auth:** Better Auth
- **UI:** Tailwind CSS + shadcn/ui (Radix)
- **Forms:** TanStack Form
- **Monorepo:** Workspaces npm

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

```bash
npm install          # Instalar dependencias
npm run dev          # Iniciar desenvolvimento (porta 3001)
npm run build        # Build de producao
npm run db:push      # Aplicar schema ao banco
npm run db:seed      # Popular banco com dados iniciais
npm run db:studio    # Abrir Prisma Studio
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
| `Position` | Cargos (10=Analista, 50=Gerente, 70=Head, 80=Diretor, 90=Dir.RH, 95=CFO, 100=CEO) |
| `Area` | 12 areas da empresa |
| `UserArea` | Relacao N:N entre usuarios e areas |
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

## tRPC Routers

| Router | Arquivo | Descricao |
|--------|---------|-----------|
| `user` | `packages/api/src/routers/user.ts` | Gestao de usuarios (CRUD, aprovar, rejeitar) |
| `area` | `packages/api/src/routers/area.ts` | CRUD de areas |
| `position` | `packages/api/src/routers/position.ts` | CRUD de cargos |
| `provider` | `packages/api/src/routers/provider.ts` | CRUD de prestadores |
| `recess` | `packages/api/src/routers/recess.ts` | Solicitacoes de recesso/ferias |
| `termination` | `packages/api/src/routers/termination.ts` | Solicitacoes de desligamento |
| `hiring` | `packages/api/src/routers/hiring.ts` | Solicitacoes de contratacao |
| `purchase` | `packages/api/src/routers/purchase.ts` | Solicitacoes de compra |
| `remuneration` | `packages/api/src/routers/remuneration.ts` | Solicitacoes de mudanca de remuneracao |
| `payroll` | `packages/api/src/routers/payroll.ts` | Folha e Bonus |
| `audit` | `packages/api/src/routers/audit.ts` | Logs de auditoria |

## Fluxos de Aprovacao

| Modulo | Etapas |
|--------|--------|
| Recesso | Dir. Area -> Dir. RH -> CEO |
| Desligamento | Dir. Area -> Dir. RH -> CEO |
| Contratacao | Dir. Area -> Dir. RH -> CFO -> CEO |
| Compra | Dir. Area -> CFO |
| Remuneracao | Dir. Area -> Dir. RH -> CFO -> CEO |

### Regras de Auto-Aprovacao

- **Diretor da propria area:** Pula etapa do Dir. Area
- **CFO em compras:** Aprovacao total automatica

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
- `packages/db/prisma/schema/` - Schema Prisma dividido em arquivos
- `apps/web/src/components/approval-timeline.tsx` - Componente de timeline de aprovacoes
