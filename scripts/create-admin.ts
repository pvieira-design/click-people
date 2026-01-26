import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../packages/db/prisma/generated/client/index.js";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

// URL do banco - usar variável de ambiente
const DATABASE_URL = process.env.DATABASE_URL || "";

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  const password = "Abcd@1234";
  const fs = await import("fs");

  fs.writeFileSync("script-output.txt", "Iniciando script...\n");

  const hashedPassword = await hashPassword(password);

  const result = await prisma.account.updateMany({
    where: { providerId: "credential" },
    data: { password: hashedPassword },
  });

  fs.writeFileSync("script-output.txt", `Senhas atualizadas: ${result.count}\n`);
}

main()
  .catch((e) => {
    const fs = require("fs");
    fs.writeFileSync("script-error.txt", `Erro: ${e.message}\n${e.stack}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
