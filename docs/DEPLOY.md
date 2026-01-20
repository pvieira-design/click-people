# Click People - Guia de Deploy

## Ambientes

| Ambiente | URL | Banco |
|----------|-----|-------|
| **Local** | http://localhost:3001 | PostgreSQL local |
| **Producao** | https://click-people-web.vercel.app | Neon (PostgreSQL serverless) |

## Infraestrutura

- **Hospedagem:** Vercel (deploy automatico via GitHub)
- **Banco de Dados:** Neon PostgreSQL (sa-east-1)
- **Repositorio:** GitHub (pvieira-design/click-people)

---

## Fluxo de Deploy

### 1. Mudancas no Codigo (Automatico)

Qualquer alteracao em codigo (componentes, paginas, API, etc.) e deployada automaticamente:

```bash
# 1. Faca suas alteracoes localmente
# 2. Commit e push
git add .
git commit -m "Descricao da mudanca"
git push origin main

# 3. Vercel detecta o push e faz deploy automatico (~1-2 min)
```

**Acompanhe o deploy:** https://vercel.com/pvieira-clickcannabis-projects/click-people-web/deployments

### 2. Mudancas no Schema do Banco (Manual)

Quando alterar a estrutura do banco (novos campos, tabelas, enums):

```bash
# 1. Edite o schema em packages/db/prisma/schema/

# 2. Teste localmente primeiro
npm run db:push

# 3. Aplique no banco de producao
./scripts/prod-db.sh push
```

### 3. Rodar Seeds/Scripts no Producao (Manual)

```bash
# Seed principal (areas, cargos, configs)
./scripts/prod-db.sh seed

# Importar prestadores
./scripts/prod-db.sh providers

# Ativar usuario como admin
./scripts/prod-db.sh admin email@exemplo.com

# Listar usuarios
./scripts/prod-db.sh list

# Abrir Prisma Studio (producao)
./scripts/prod-db.sh studio
```

---

## Variaveis de Ambiente

### Local (apps/web/.env)

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/click_people
BETTER_AUTH_SECRET=sua-chave-local
BETTER_AUTH_URL=http://localhost:3001
CORS_ORIGIN=http://localhost:3001
```

### Producao (Vercel Dashboard)

Configuradas em: Settings > Environment Variables

```env
DATABASE_URL=postgresql://neondb_owner:***@ep-bold-glade-acp5knk0-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require
BETTER_AUTH_SECRET=***
BETTER_AUTH_URL=https://click-people-web.vercel.app
CORS_ORIGIN=https://click-people-web.vercel.app
```

---

## Checklist de Deploy

### Antes de fazer push:

- [ ] Codigo funciona localmente
- [ ] Nao ha erros de TypeScript (`npm run build`)
- [ ] Testou as funcionalidades alteradas

### Se alterou o schema:

- [ ] Rodou `npm run db:push` localmente
- [ ] Aplicou no Neon: `./scripts/prod-db.sh push`

### Se adicionou dados iniciais:

- [ ] Rodou seed no Neon: `./scripts/prod-db.sh seed`

---

## Troubleshooting

### Build falhou no Vercel

1. Verifique os logs em: Vercel Dashboard > Deployments > Build Logs
2. Erros comuns:
   - **TypeScript error:** Corrija o erro e faca novo push
   - **Route not found:** Verifique se o arquivo da rota existe e nao esta no .gitignore
   - **Prisma generate failed:** Verifique se o schema esta correto

### Banco nao conecta

1. Verifique se DATABASE_URL esta correta no Vercel
2. Verifique se o IP do Vercel nao esta bloqueado no Neon (Neon permite todos por padrao)

### Usuario nao consegue logar

1. Verifique se o usuario existe: `./scripts/prod-db.sh list`
2. Verifique se o status e ACTIVE
3. Se necessario, ative como admin: `./scripts/prod-db.sh admin email@ex.com`

---

## Comandos Uteis

```bash
# Desenvolvimento local
npm run dev                    # Iniciar app (porta 3001)
npm run db:studio              # Prisma Studio (banco local)

# Producao
./scripts/prod-db.sh push      # Aplicar schema
./scripts/prod-db.sh seed      # Rodar seed
./scripts/prod-db.sh studio    # Prisma Studio (Neon)
./scripts/prod-db.sh list      # Listar usuarios
./scripts/prod-db.sh admin X   # Ativar admin

# Git
git status                     # Ver alteracoes
git add . && git commit -m ""  # Commit
git push origin main           # Deploy automatico
```

---

## Contatos

- **Vercel:** https://vercel.com/pvieira-clickcannabis-projects
- **Neon:** https://console.neon.tech
- **GitHub:** https://github.com/pvieira-design/click-people
