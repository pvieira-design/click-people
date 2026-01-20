#!/bin/bash

# ==============================================
# Click People - Script para Banco de Producao
# ==============================================
# Uso: ./scripts/prod-db.sh [comando]
#
# Comandos disponiveis:
#   push      - Aplica schema no banco de producao
#   seed      - Roda seed principal (areas, cargos, configs)
#   providers - Importa prestadores
#   studio    - Abre Prisma Studio conectado ao Neon
#   admin     - Ativa usuario como admin
#   list      - Lista usuarios do banco
#   query     - Executa query SQL customizada
# ==============================================

# URL do banco Neon (producao)
export DATABASE_URL="postgresql://neondb_owner:npg_N5Pzocxgpa3i@ep-bold-glade-acp5knk0-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require"

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}  Click People - Banco de Producao${NC}"
echo -e "${YELLOW}========================================${NC}"
echo ""

case "$1" in
  push)
    echo -e "${GREEN}Aplicando schema no banco de producao...${NC}"
    npx prisma db push --schema=packages/db/prisma/schema
    ;;

  seed)
    echo -e "${GREEN}Rodando seed principal...${NC}"
    npx tsx packages/db/prisma/seed.ts
    ;;

  providers)
    echo -e "${GREEN}Importando prestadores...${NC}"
    npx tsx packages/db/prisma/seed-providers.ts
    ;;

  studio)
    echo -e "${GREEN}Abrindo Prisma Studio (banco de producao)...${NC}"
    npx prisma studio --schema=packages/db/prisma/schema
    ;;

  admin)
    if [ -z "$2" ]; then
      echo -e "${RED}Erro: Informe o email do usuario${NC}"
      echo "Uso: ./scripts/prod-db.sh admin email@exemplo.com"
      exit 1
    fi
    echo -e "${GREEN}Ativando $2 como admin...${NC}"
    npx tsx -e "
      import { PrismaPg } from '@prisma/adapter-pg';
      import { PrismaClient } from './packages/db/prisma/generated/client/index.js';
      const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
      const prisma = new PrismaClient({ adapter });
      async function main() {
        const user = await prisma.user.update({
          where: { email: '$2' },
          data: { status: 'ACTIVE', isAdmin: true }
        });
        console.log('Usuario atualizado:', user.name, '-', user.email);
      }
      main().finally(() => prisma.\$disconnect());
    "
    ;;

  list)
    echo -e "${GREEN}Listando usuarios...${NC}"
    npx tsx packages/db/prisma/list-users.ts
    ;;

  *)
    echo "Uso: ./scripts/prod-db.sh [comando]"
    echo ""
    echo "Comandos disponiveis:"
    echo "  push      - Aplica schema no banco de producao"
    echo "  seed      - Roda seed principal (areas, cargos, configs)"
    echo "  providers - Importa prestadores"
    echo "  studio    - Abre Prisma Studio conectado ao Neon"
    echo "  admin     - Ativa usuario como admin (ex: ./scripts/prod-db.sh admin email@ex.com)"
    echo "  list      - Lista usuarios do banco"
    echo ""
    echo "Exemplos:"
    echo "  ./scripts/prod-db.sh push"
    echo "  ./scripts/prod-db.sh admin joao@empresa.com"
    ;;
esac
