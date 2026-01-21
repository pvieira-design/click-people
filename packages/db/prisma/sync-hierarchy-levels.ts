import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from apps/web/.env
config({ path: resolve(__dirname, "../../../apps/web/.env") });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL not found");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Sincronizando niveis hierarquicos entre usuarios e prestadores...\n");

  // Buscar todos os prestadores que tem usuario vinculado
  const providers = await prisma.provider.findMany({
    where: {
      userId: { not: null },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          hierarchyLevelId: true,
          hierarchyLevel: true,
        },
      },
    },
  });

  console.log(`Encontrados ${providers.length} prestadores com usuario vinculado.\n`);

  let updated = 0;
  for (const provider of providers) {
    const userLevel = provider.user?.hierarchyLevelId;
    const userLevelName = provider.user?.hierarchyLevel?.name || "N/A";

    if (userLevel && !provider.hierarchyLevelId) {
      await prisma.provider.update({
        where: { id: provider.id },
        data: { hierarchyLevelId: userLevel },
      });
      console.log(`  OK ${provider.name} -> ${userLevelName}`);
      updated++;
    } else if (!userLevel) {
      console.log(`  !! ${provider.name} - usuario sem nivel hierarquico`);
    } else {
      console.log(`  -- ${provider.name} - ja sincronizado`);
    }
  }

  console.log(`\n${updated} prestadores atualizados.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
