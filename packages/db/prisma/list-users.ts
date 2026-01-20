import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL not found");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, status: true, isAdmin: true },
  });

  console.log("Usuarios no banco:\n");
  if (users.length === 0) {
    console.log("  Nenhum usuario encontrado.");
  } else {
    users.forEach((u) =>
      console.log(`  - ${u.email} (${u.name}) - Status: ${u.status}, Admin: ${u.isAdmin}`)
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
