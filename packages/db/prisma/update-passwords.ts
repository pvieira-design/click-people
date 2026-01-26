import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

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
  console.log("Atualizando senhas de todos os usuarios para Abcd@1234...");

  const password = "Abcd@1234";
  const hashedPassword = await hashPassword(password);

  const result = await prisma.account.updateMany({
    where: { providerId: "credential" },
    data: { password: hashedPassword },
  });

  console.log("Senhas atualizadas:", result.count);
}

main()
  .catch((e) => {
    console.error("Erro:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
