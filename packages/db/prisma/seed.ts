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
  throw new Error("DATABASE_URL not found in environment variables");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Iniciando seed do banco de dados...\n");

  // =============================================
  // 1. CRIAR CARGOS (7 níveis)
  // =============================================
  console.log("📋 Criando cargos...");

  const positions = [
    // Tecnologia
    { name: "Dev Frontend", level: 10, canApprove: false },
    { name: "Dev Backend", level: 10, canApprove: false },
    { name: "Dev Fullstack", level: 10, canApprove: false },
    { name: "Dev Mobile", level: 10, canApprove: false },
    { name: "QA Engineer", level: 10, canApprove: false },
    { name: "DevOps Engineer", level: 10, canApprove: false },
    { name: "Data Engineer", level: 10, canApprove: false },
    { name: "Data Analyst", level: 10, canApprove: false },
    { name: "Product Owner", level: 30, canApprove: false },
    { name: "Product Manager", level: 40, canApprove: false },
    { name: "Tech Lead", level: 50, canApprove: false },
    { name: "Designer UI/UX", level: 10, canApprove: false },
    { name: "Designer", level: 10, canApprove: false },

    // Atendimento / Comercial
    { name: "Atendente", level: 10, canApprove: false },
    { name: "Consultor de Vendas", level: 10, canApprove: false },
    { name: "Customer Success", level: 10, canApprove: false },
    { name: "Supervisor", level: 30, canApprove: false },

    // Marketing
    { name: "Content Manager", level: 10, canApprove: false },
    { name: "Social Media", level: 10, canApprove: false },
    { name: "Growth Analyst", level: 10, canApprove: false },
    { name: "Copywriter", level: 10, canApprove: false },

    // Operações / Admin
    { name: "Analista Administrativo", level: 10, canApprove: false },
    { name: "Analista Financeiro", level: 10, canApprove: false },
    { name: "Analista de RH", level: 10, canApprove: false },
    { name: "Assistente", level: 5, canApprove: false },

    // Médico / Saúde
    { name: "Médico", level: 10, canApprove: false },
    { name: "Coordenador Médico", level: 40, canApprove: false },

    // Cargos genéricos (mantidos para compatibilidade)
    { name: "Analista", level: 10, canApprove: false },
    { name: "Coordenador", level: 40, canApprove: false },

    // Gestão
    { name: "Gerente", level: 50, canApprove: false },
    { name: "Head", level: 70, canApprove: false },
    { name: "Diretor", level: 80, canApprove: true },
    { name: "Diretor RH", level: 90, canApprove: true },
    { name: "CFO", level: 95, canApprove: true },
    { name: "CEO", level: 100, canApprove: true },
  ];

  for (const position of positions) {
    await prisma.position.upsert({
      where: { name: position.name },
      update: { level: position.level, canApprove: position.canApprove },
      create: position,
    });
    console.log(`  ✓ ${position.name} (nível ${position.level})`);
  }

  // =============================================
  // 2. CRIAR ÁREAS (12 áreas)
  // =============================================
  console.log("\n🏢 Criando áreas...");

  const areas = [
    "Atendimento - Consulta Médica",
    "Atendimento - Documentação",
    "Atendimento - Inicial",
    "Atendimento - Pós Venda",
    "Atendimento - Receita & Orçamento",
    "Financeiro",
    "Geral",
    "Gestão de Médicos",
    "Marketing",
    "Operações",
    "RH",
    "Tecnologia",
  ];

  for (const areaName of areas) {
    await prisma.area.upsert({
      where: { name: areaName },
      update: {},
      create: { name: areaName },
    });
    console.log(`  ✓ ${areaName}`);
  }

  // =============================================
  // 3. CONFIGURAÇÕES DO SISTEMA
  // =============================================
  console.log("\n⚙️  Criando configurações do sistema...");

  const configs = [
    {
      key: "BONUS_TIERS",
      value: {
        NONE: { name: "Sem Bônus", percentage: 0 },
        BRONZE: { name: "Bronze", percentage: 10 },
        SILVER: { name: "Prata", percentage: 15 },
        GOLD: { name: "Ouro", percentage: 20 },
      },
    },
    {
      key: "AUTO_APPROVAL_RULES",
      value: {
        enabled: false,
        rules: [],
      },
    },
    {
      key: "RECESS_WARNING_DAYS",
      value: 20,
    },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
    console.log(`  ✓ ${config.key}`);
  }

  // =============================================
  // 4. RESUMO
  // =============================================
  console.log("\n✅ Seed concluído com sucesso!");
  console.log("\n📊 Resumo:");
  console.log(`   - ${positions.length} cargos criados`);
  console.log(`   - ${areas.length} áreas criadas`);
  console.log(`   - ${configs.length} configurações criadas`);

  console.log("\n💡 Próximos passos:");
  console.log("   1. Inicie a aplicação: npm run dev");
  console.log("   2. Acesse http://localhost:3001");
  console.log("   3. Crie uma conta (será criada como PENDENTE)");
  console.log("   4. Use Prisma Studio para aprovar o usuário:");
  console.log("      npm run db:studio");
  console.log('      Altere o status para ACTIVE e isAdmin para true\n');
}

main()
  .catch((e) => {
    console.error("❌ Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
