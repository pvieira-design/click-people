import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from apps/web/.env (only if DATABASE_URL not already set)
if (!process.env.DATABASE_URL) {
  config({ path: resolve(__dirname, "../../../apps/web/.env") });
}

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL not found in environment variables");
}

console.log(`Conectando ao banco: ${databaseUrl.split("@")[1]?.split("/")[0] || "local"}...`);

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Atualizando usuario para admin...\n");

  const user = await prisma.user.update({
    where: { email: "pvieira@clickcannabis.com" },
    data: {
      status: "ACTIVE",
      isAdmin: true,
    },
  });

  console.log("Usuario atualizado com sucesso:");
  console.log(`  - ID: ${user.id}`);
  console.log(`  - Nome: ${user.name}`);
  console.log(`  - Email: ${user.email}`);
  console.log(`  - Status: ${user.status}`);
  console.log(`  - Admin: ${user.isAdmin}`);
}

main()
  .catch((e) => {
    console.error("Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
