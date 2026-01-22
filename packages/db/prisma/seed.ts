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
  // 0. LIMPAR DADOS EXISTENTES
  // =============================================
  console.log("🧹 Limpando dados existentes...");

  // Limpar associações de usuários
  await prisma.user.updateMany({
    data: { areaId: null, positionId: null, hierarchyLevelId: null },
  });
  console.log("  ✓ Associações de usuários removidas");

  // Excluir dados existentes (ordem respeitando foreign keys)
  // 1. Primeiro deletar approval steps (referenciam requests e areas)
  await prisma.approvalStep.deleteMany({});
  console.log("  ✓ Etapas de aprovação removidas");

  // 2. Deletar todas as solicitações (referenciam providers e areas)
  await prisma.recessRequest.deleteMany({});
  await prisma.terminationRequest.deleteMany({});
  await prisma.hiringRequest.deleteMany({});
  await prisma.purchaseRequest.deleteMany({});
  await prisma.remunerationRequest.deleteMany({});
  console.log("  ✓ Solicitações removidas");

  // 3. Deletar bonus records (referenciam areas)
  await prisma.bonusRecord.deleteMany({});
  console.log("  ✓ Registros de bônus removidos");

  // 4. Agora podemos deletar prestadores
  await prisma.provider.deleteMany({});
  console.log("  ✓ Prestadores removidos");

  // 5. Deletar associações cargo-área
  await prisma.areaPosition.deleteMany({});
  console.log("  ✓ Associações cargo-área removidas");

  await prisma.area.deleteMany({});
  console.log("  ✓ Áreas removidas");

  await prisma.position.deleteMany({});
  console.log("  ✓ Cargos removidos");

  await prisma.hierarchyLevel.deleteMany({});
  console.log("  ✓ Níveis hierárquicos removidos");

  // =============================================
  // 1. CRIAR NÍVEIS HIERÁRQUICOS (9 níveis)
  // =============================================
  console.log("\n📊 Criando níveis hierárquicos...");

  const hierarchyLevels = [
    { name: "Junior", level: 10, canApprove: false },
    { name: "Pleno", level: 20, canApprove: false },
    { name: "Senior", level: 30, canApprove: false },
    { name: "Líder", level: 40, canApprove: false },
    { name: "Coordenador", level: 50, canApprove: false },
    { name: "Head", level: 60, canApprove: false },
    { name: "Diretor", level: 70, canApprove: true },
    { name: "VP", level: 80, canApprove: true },
    { name: "CEO", level: 90, canApprove: true },
  ];

  for (const level of hierarchyLevels) {
    await prisma.hierarchyLevel.create({
      data: level,
    });
    console.log(`  ✓ ${level.name} (nível ${level.level})`);
  }

  // =============================================
  // 2. CRIAR CARGOS (10 cargos)
  // =============================================
  console.log("\n📋 Criando cargos...");

  const positions = [
    "CEO",
    "VP",
    "Diretor",
    "Head",
    "Coordenador",
    "Líder",
    "Analista Senior",
    "Analista Pleno",
    "Analista Junior",
    "Designer",
  ];

  for (const positionName of positions) {
    await prisma.position.create({
      data: { name: positionName },
    });
    console.log(`  ✓ ${positionName}`);
  }

  // =============================================
  // 3. CRIAR ÁREAS (12 áreas)
  // =============================================
  console.log("\n🏢 Criando áreas...");

  const areas = [
    "Financeiro",
    "Marketing",
    "Operações - Inicial",
    "Operações - Consulta Médica",
    "Operações - Receita e Orçamento",
    "Operações - Documentação",
    "Operações - Pós Venda",
    "Operações - Gestão de Médicos",
    "Tecnologia",
    "Presidência",
    "Médicos",
    "Recursos Humanos",
  ];

  for (const areaName of areas) {
    await prisma.area.create({
      data: { name: areaName },
    });
    console.log(`  ✓ ${areaName}`);
  }

  // =============================================
  // 4. CONFIGURAÇÕES DO SISTEMA
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
    {
      key: "APPROVAL_FLOWS",
      value: {
        version: 1,
        lastUpdatedAt: new Date().toISOString(),
        lastUpdatedBy: "system",
        flows: {
          RECESS: {
            enabled: true,
            steps: ["REQUEST_AREA", "Recursos Humanos", "Presidência"],
          },
          TERMINATION: {
            enabled: true,
            steps: ["REQUEST_AREA", "Recursos Humanos", "Presidência"],
          },
          HIRING: {
            enabled: true,
            steps: ["REQUEST_AREA", "Recursos Humanos", "Financeiro", "Presidência"],
          },
          PURCHASE: {
            enabled: true,
            steps: ["REQUEST_AREA", "Financeiro"],
          },
          REMUNERATION: {
            enabled: true,
            steps: ["REQUEST_AREA", "Recursos Humanos", "Financeiro", "Presidência"],
          },
        },
      },
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
  // 5. RESUMO
  // =============================================
  console.log("\n✅ Seed concluído com sucesso!");
  console.log("\n📊 Resumo:");
  console.log(`   - ${hierarchyLevels.length} níveis hierárquicos criados`);
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
