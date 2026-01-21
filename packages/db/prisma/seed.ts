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
  // 1. CRIAR NÍVEIS HIERÁRQUICOS (simplificados)
  // =============================================
  console.log("📊 Criando níveis hierárquicos...");

  const targetLevels = [
    { name: "Junior", level: 10, canApprove: false },
    { name: "Pleno", level: 20, canApprove: false },
    { name: "Senior", level: 30, canApprove: false },
    { name: "Especialista", level: 35, canApprove: false },
    { name: "Coordenador", level: 40, canApprove: false },
    { name: "Gerente", level: 50, canApprove: false },
    { name: "Head", level: 70, canApprove: false },
    { name: "Diretoria", level: 80, canApprove: true },
    { name: "C-level", level: 90, canApprove: true },
    { name: "Vice Presidente", level: 105, canApprove: true },
    { name: "Sócio", level: 110, canApprove: true },
  ];

  // Mapeamento de nomes antigos para novos (para migração)
  const nameRenames: Record<string, string> = {
    "Diretor": "Diretoria",
    "Diretor RH": "C-level",
    "CTO": "C-level",
    "CMO": "C-level",
    "COO": "C-level",
    "CFO": "C-level",
    "CEO": "C-level",
  };

  // Níveis que devem ser removidos (consolidados em outros)
  const levelsToRemove = ["Diretor RH", "CTO", "CMO", "COO", "CFO", "CEO"];

  // 1. Primeiro, migrar usuários e prestadores dos níveis que serão removidos
  for (const oldName of levelsToRemove) {
    const oldLevel = await prisma.hierarchyLevel.findUnique({ where: { name: oldName } });
    if (oldLevel) {
      const newName = nameRenames[oldName] || "C-level";
      let newLevel = await prisma.hierarchyLevel.findUnique({ where: { name: newName } });

      // Se o novo nível não existe ainda, criar com level temporário
      if (!newLevel) {
        newLevel = await prisma.hierarchyLevel.create({
          data: { name: newName, level: 900 + levelsToRemove.indexOf(oldName), canApprove: true },
        });
      }

      // Migrar usuários
      await prisma.user.updateMany({
        where: { hierarchyLevelId: oldLevel.id },
        data: { hierarchyLevelId: newLevel.id },
      });

      // Migrar prestadores
      await prisma.provider.updateMany({
        where: { hierarchyLevelId: oldLevel.id },
        data: { hierarchyLevelId: newLevel.id },
      });

      console.log(`  ↪ Migrados usuários/prestadores de "${oldName}" para "${newName}"`);
    }
  }

  // 2. Renomear "Diretor" para "Diretoria"
  const diretor = await prisma.hierarchyLevel.findUnique({ where: { name: "Diretor" } });
  if (diretor) {
    await prisma.hierarchyLevel.update({
      where: { id: diretor.id },
      data: { name: "Diretoria" },
    });
    console.log(`  ↪ Renomeado "Diretor" para "Diretoria"`);
  }

  // 3. Remover níveis antigos (agora sem usuários vinculados)
  for (const oldName of levelsToRemove) {
    try {
      await prisma.hierarchyLevel.delete({ where: { name: oldName } });
      console.log(`  🗑 Removido nível "${oldName}"`);
    } catch {
      // Pode não existir
    }
  }

  // 4. Criar/atualizar os níveis alvo
  for (const level of targetLevels) {
    await prisma.hierarchyLevel.upsert({
      where: { name: level.name },
      update: { level: level.level, canApprove: level.canApprove },
      create: level,
    });
    console.log(`  ✓ ${level.name} (nível ${level.level})`);
  }

  // 5. Remover níveis que não estão na lista alvo
  const finalLevels = await prisma.hierarchyLevel.findMany();
  const targetNames = targetLevels.map((l) => l.name);
  for (const level of finalLevels) {
    if (!targetNames.includes(level.name)) {
      try {
        await prisma.hierarchyLevel.delete({ where: { id: level.id } });
        console.log(`  🗑 Removido nível extra "${level.name}"`);
      } catch {
        console.log(`  ⚠ Não foi possível remover "${level.name}" (pode ter usuários vinculados)`);
      }
    }
  }

  // =============================================
  // 2. CRIAR CARGOS (funções - sem hierarquia)
  // =============================================
  console.log("\n📋 Criando cargos...");

  const positions = [
    // Tecnologia
    "Dev Frontend",
    "Dev Backend",
    "Dev Fullstack",
    "Dev Mobile",
    "QA Engineer",
    "DevOps Engineer",
    "Data Engineer",
    "Data Analyst",
    "Product Owner",
    "Product Manager",
    "Tech Lead",
    "Designer UI/UX",
    "Designer",

    // Atendimento / Comercial
    "Atendente",
    "Consultor de Vendas",
    "Customer Success",
    "Supervisor",

    // Marketing
    "Content Manager",
    "Social Media",
    "Growth Analyst",
    "Copywriter",

    // Operações / Admin
    "Analista Administrativo",
    "Analista Financeiro",
    "Analista de RH",
    "Assistente",

    // Médico / Saúde
    "Médico",
    "Coordenador Médico",

    // Cargos genéricos
    "Analista",
    "Coordenador",
    "Gerente",
    "Head",
    "Diretor",
    "Diretor RH",
    "CTO",
    "CMO",
    "COO",
    "CFO",
    "CEO",
    "Vice Presidente",
    "Sócio",
  ];

  for (const positionName of positions) {
    await prisma.position.upsert({
      where: { name: positionName },
      update: {},
      create: { name: positionName },
    });
    console.log(`  ✓ ${positionName}`);
  }

  // =============================================
  // 3. CRIAR ÁREAS (12 áreas)
  // =============================================
  console.log("\n🏢 Criando áreas...");

  const areas = [
    "Atendimento - Consulta Médica",
    "Atendimento - Documentação",
    "Atendimento - Inicial",
    "Atendimento - Pós Venda",
    "Atendimento - Receita & Orçamento",
    "Design",
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
  // 4. ASSOCIAÇÕES CARGO-ÁREA (cargos multi-área)
  // =============================================
  console.log("\n🔗 Configurando associações cargo-área...");

  // Definir cargos que pertencem a múltiplas áreas
  const positionAreaMappings: Record<string, string[]> = {
    "Designer UI/UX": ["Tecnologia", "Marketing", "Design"],
  };

  for (const [positionName, areaNames] of Object.entries(positionAreaMappings)) {
    const position = await prisma.position.findUnique({
      where: { name: positionName },
    });

    if (!position) {
      console.log(`  ⚠ Cargo "${positionName}" não encontrado, pulando...`);
      continue;
    }

    // Remover associações antigas
    await prisma.areaPosition.deleteMany({
      where: { positionId: position.id },
    });

    // Criar novas associações
    for (const areaName of areaNames) {
      const area = await prisma.area.findUnique({
        where: { name: areaName },
      });

      if (!area) {
        console.log(`  ⚠ Área "${areaName}" não encontrada, pulando...`);
        continue;
      }

      await prisma.areaPosition.create({
        data: {
          positionId: position.id,
          areaId: area.id,
        },
      });
    }

    console.log(`  ✓ ${positionName} → ${areaNames.join(", ")}`);
  }

  // =============================================
  // 5. CONFIGURAÇÕES DO SISTEMA
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
            steps: ["REQUEST_AREA", "RH", "Diretoria"],
          },
          TERMINATION: {
            enabled: true,
            steps: ["REQUEST_AREA", "RH", "Diretoria"],
          },
          HIRING: {
            enabled: true,
            steps: ["REQUEST_AREA", "RH", "Financeiro", "Diretoria"],
          },
          PURCHASE: {
            enabled: true,
            steps: ["REQUEST_AREA", "Financeiro"],
          },
          REMUNERATION: {
            enabled: true,
            steps: ["REQUEST_AREA", "RH", "Financeiro", "Diretoria"],
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
  // 6. RESUMO
  // =============================================
  console.log("\n✅ Seed concluído com sucesso!");
  console.log("\n📊 Resumo:");
  console.log(`   - ${targetLevels.length} níveis hierárquicos criados`);
  console.log(`   - ${positions.length} cargos criados`);
  console.log(`   - ${areas.length} áreas criadas`);
  console.log(`   - ${Object.keys(positionAreaMappings).length} cargos com áreas configuradas`);
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
