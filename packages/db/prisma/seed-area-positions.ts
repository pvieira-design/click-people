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

// Mapeamento de cargos para áreas
// Cargos que NÃO estão listados aqui serão considerados "globais" (aparecem em todas as áreas)
const positionAreaMapping: Record<string, string[]> = {
  // Tecnologia
  "Dev Frontend": ["Tecnologia"],
  "Dev Backend": ["Tecnologia"],
  "Dev Fullstack": ["Tecnologia"],
  "Dev Mobile": ["Tecnologia"],
  "QA Engineer": ["Tecnologia"],
  "DevOps Engineer": ["Tecnologia"],
  "Data Engineer": ["Tecnologia"],
  "Data Analyst": ["Tecnologia"],
  "Product Owner": ["Tecnologia"],
  "Product Manager": ["Tecnologia"],
  "Tech Lead": ["Tecnologia"],
  "Designer UI/UX": ["Tecnologia", "Marketing"],
  Designer: ["Tecnologia", "Marketing"],

  // Atendimento (todas as áreas de atendimento)
  Atendente: [
    "Atendimento - Consulta Médica",
    "Atendimento - Documentação",
    "Atendimento - Inicial",
    "Atendimento - Pós Venda",
    "Atendimento - Receita & Orçamento",
  ],
  "Customer Success": [
    "Atendimento - Consulta Médica",
    "Atendimento - Documentação",
    "Atendimento - Inicial",
    "Atendimento - Pós Venda",
    "Atendimento - Receita & Orçamento",
  ],
  Supervisor: [
    "Atendimento - Consulta Médica",
    "Atendimento - Documentação",
    "Atendimento - Inicial",
    "Atendimento - Pós Venda",
    "Atendimento - Receita & Orçamento",
    "Operações",
  ],
  "Consultor de Vendas": [
    "Atendimento - Inicial",
    "Atendimento - Receita & Orçamento",
  ],

  // Marketing
  "Content Manager": ["Marketing"],
  "Social Media": ["Marketing"],
  "Growth Analyst": ["Marketing"],
  Copywriter: ["Marketing"],

  // Financeiro
  "Analista Financeiro": ["Financeiro"],

  // RH
  "Analista de RH": ["RH"],

  // Operações / Admin
  "Analista Administrativo": ["Operações", "Financeiro"],
  Assistente: ["Operações", "Geral", "RH", "Financeiro"],

  // Médico / Saúde
  Médico: ["Gestão de Médicos"],
  "Coordenador Médico": ["Gestão de Médicos"],

  // Cargos genéricos (múltiplas áreas)
  Analista: [
    "Geral",
    "Operações",
    "Financeiro",
    "RH",
    "Marketing",
    "Tecnologia",
  ],
  Coordenador: [
    "Geral",
    "Operações",
    "Financeiro",
    "RH",
    "Marketing",
    "Tecnologia",
    "Gestão de Médicos",
  ],
};

// Cargos globais (aparecem em todas as áreas) - NÃO adicionar no mapping
// Gerente, Head, Diretor, Diretor RH, CFO, CEO

async function main() {
  console.log("🔗 Vinculando cargos às áreas...\n");

  // Buscar todas as áreas e cargos
  const areas = await prisma.area.findMany();
  const positions = await prisma.position.findMany();

  console.log(`📋 Encontradas ${areas.length} áreas e ${positions.length} cargos\n`);

  // Criar mapa de nome -> id
  const areaIdByName = new Map(areas.map((a) => [a.name, a.id]));
  const positionIdByName = new Map(positions.map((p) => [p.name, p.id]));

  // Limpar vinculações existentes
  const deleted = await prisma.areaPosition.deleteMany();
  console.log(`🗑️  Removidas ${deleted.count} vinculações antigas\n`);

  // Criar novas vinculações
  let created = 0;
  const errors: string[] = [];

  for (const [positionName, areaNames] of Object.entries(positionAreaMapping)) {
    const positionId = positionIdByName.get(positionName);
    if (!positionId) {
      errors.push(`Cargo não encontrado: ${positionName}`);
      continue;
    }

    for (const areaName of areaNames) {
      const areaId = areaIdByName.get(areaName);
      if (!areaId) {
        errors.push(`Área não encontrada: ${areaName} (para cargo ${positionName})`);
        continue;
      }

      await prisma.areaPosition.create({
        data: { areaId, positionId },
      });
      created++;
    }

    console.log(`  ✓ ${positionName} → ${areaNames.join(", ")}`);
  }

  // Listar cargos globais (sem vinculação)
  const globalPositions = positions.filter(
    (p) => !Object.keys(positionAreaMapping).includes(p.name)
  );

  console.log("\n🌍 Cargos globais (disponíveis em todas as áreas):");
  for (const pos of globalPositions) {
    console.log(`  • ${pos.name}`);
  }

  // Resumo
  console.log("\n✅ Vinculação concluída!");
  console.log(`   - ${created} vinculações criadas`);
  console.log(`   - ${globalPositions.length} cargos globais`);

  if (errors.length > 0) {
    console.log("\n⚠️  Avisos:");
    for (const error of errors) {
      console.log(`   - ${error}`);
    }
  }
}

main()
  .catch((e) => {
    console.error("❌ Erro durante a vinculação:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
