import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../packages/db/prisma/generated/client/index.js";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { writeFileSync } from "fs";

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
  try {
    writeFileSync("output.log", "Iniciando...\n");

    const password = "Abcd@1234";
    const hashedPassword = await hashPassword(password);

    writeFileSync("output.log", `Hash gerado: ${hashedPassword.substring(0, 20)}...\n`);

    const result = await prisma.account.updateMany({
      where: { providerId: "credential" },
      data: { password: hashedPassword },
    });

    writeFileSync("output.log", `SUCESSO! Senhas atualizadas: ${result.count}\n`);
  } catch (error: any) {
    writeFileSync("output.log", `ERRO: ${error.message}\n${error.stack}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
