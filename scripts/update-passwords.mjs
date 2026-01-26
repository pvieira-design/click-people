import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../packages/db/prisma/generated/client.js";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const DATABASE_URL = process.env.DATABASE_URL || "";

const adapter = new PrismaPg({ connectionString: DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = await scryptAsync(password, salt, 64);
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function main() {
  try {
    console.log("Atualizando senhas de todos os usuarios...");

    const password = "Abcd@1234";
    const hashedPassword = await hashPassword(password);

    const result = await prisma.account.updateMany({
      where: { providerId: "credential" },
      data: { password: hashedPassword },
    });

    console.log("Senhas atualizadas:", result.count);
  } catch (error) {
    console.error("Erro:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
