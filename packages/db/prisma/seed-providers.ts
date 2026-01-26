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

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

// Dados dos prestadores da API
const providersData = [
  { name: "Aline Lasso", startDate: "01/04/2025", salary: 2500, department: "Médicos" },
  { name: "Ana Sarkisoff", startDate: "11/11/2024", salary: 3400, department: "PO" },
  { name: "Andreia Melo", startDate: "17/03/2025", salary: 2300, department: "Consulta" },
  { name: "Andressa Natalia", startDate: "26/06/2025", salary: 2500, department: "Inicial" },
  { name: "Andressa Silva", startDate: "16/06/2025", salary: 2500, department: "Inicial" },
  { name: "Andson Santana", startDate: "07/03/2025", salary: 2500, department: "Receita" },
  { name: "Anna Beatriz Pereira", startDate: "22/07/2025", salary: 3000, department: "Médicos" },
  { name: "Anna Thais Campos", startDate: "19/11/2025", salary: 2300, department: "Docs" },
  { name: "Beatriz Oliveira", startDate: "21/08/2025", salary: 2500, department: "Docs" },
  { name: "Bianca Carvalho", startDate: "08/09/2025", salary: 3200, department: "Pós" },
  { name: "Breno Rocha de Mesquita", startDate: "12/08/2023", salary: 8500, department: "Receita" },
  { name: "Cláudia Silva", startDate: "10/08/2023", salary: 3250, department: "Docs" },
  { name: "Caio Xavier", startDate: "05/01/2026", salary: 2500, department: "Pós" },
  { name: "Maria Eduarda Almeida", startDate: "05/01/2026", salary: 2500, department: "Receita" },
  { name: "Emyli Pires", startDate: "05/01/2026", salary: 2500, department: "Receita" },
  { name: "Claudio Mannarino", startDate: "01/01/2023", salary: 50000, department: "Diretoria" },
  { name: "Daiane Paulino", startDate: "13/10/2025", salary: 2300, department: "Consulta" },
  { name: "Davi Pedregal", startDate: "01/11/2025", salary: 18000, department: "Projetos" },
  { name: "Douglas Aguiar", startDate: "25/11/2024", salary: 3400, department: "Receita" },
  { name: "Eduardo Arruda da Gama de Azevedo Cunha Junior", startDate: "23/09/2024", salary: 3500, department: "Receita" },
  { name: "Fátima Barreiras", startDate: "01/10/2025", salary: 20000, department: "RH" },
  { name: "Gabriel Prates Araujo", startDate: "16/10/2024", salary: 2500, department: "Inicial" },
  { name: "Gabriela Mello", startDate: "05/02/2025", salary: 2800, department: "Pós" },
  { name: "Gabriela Simplicio", startDate: "10/11/2025", salary: 2500, department: "Docs" },
  { name: "Gabriella Jennifer Noronha", startDate: "29/09/2025", salary: 2300, department: "Consulta" },
  { name: "Guilherme Viriato", startDate: "04/08/2025", salary: 2500, department: "Docs" },
  { name: "Gustavo Fucher", startDate: "10/09/2025", salary: 2300, department: "Docs" },
  { name: "Iris Jhanie Santana Ferreira", startDate: "03/06/2024", salary: 4500, department: "Consulta" },
  { name: "Isabel Cristina", startDate: "18/08/2025", salary: 2300, department: "Docs" },
  { name: "Jack Duarte", startDate: "28/04/2025", salary: 18000, department: "PM" },
  { name: "Janaina Lopes", startDate: "04/08/2025", salary: 2500, department: "Docs" },
  { name: "Jessica Coelho", startDate: "10/11/2025", salary: 2500, department: "Inicial" },
  { name: "Jonathan Gomes", startDate: "10/11/2025", salary: 2300, department: "Docs" },
  { name: "José Miranda", startDate: "01/09/2025", salary: 2300, department: "Docs" },
  { name: "Juliana Aires", startDate: "09/12/2024", salary: 2500, department: "Inicial" },
  { name: "Kaique Feng", startDate: "27/08/2025", salary: 12000, department: "Dev" },
  { name: "Katlen da Silva Pfeifer", startDate: "14/10/2024", salary: 2600, department: "Consulta" },
  { name: "Laís Tamashiro", startDate: "12/05/2025", salary: 4000, department: "Financeiro" },
  { name: "Lara Medeiros", startDate: "11/08/2025", salary: 2500, department: "Receita" },
  { name: "Laura Borela", startDate: "04/04/2025", salary: 2300, department: "Docs" },
  { name: "Luana Gomes", startDate: "17/11/2025", salary: 2300, department: "Docs" },
  { name: "Lucas Khouri", startDate: "19/12/2025", salary: 8000, department: "Médicos" },
  { name: "Marcelo Gomes da Silva", startDate: "09/02/2024", salary: 5000, department: "Docs" },
  { name: "Marcelo Santos Silva", startDate: "30/01/2025", salary: 2300, department: "Docs" },
  { name: "Maria Clara Ferreira", startDate: "16/10/2025", salary: 2300, department: "Docs" },
  { name: "Maria Vitoria", startDate: "27/08/2025", salary: 2300, department: "Docs" },
  { name: "Matheus Godoy", startDate: "01/12/2025", salary: 3000, department: "Marketing" },
  { name: "Matheus Maximos Almeida Oliveira Macedo", startDate: "14/10/2024", salary: 5000, department: "Design" },
  { name: "Mauro Barcelos de Barros Cruz", startDate: "28/02/2024", salary: 10000, department: "Design" },
  { name: "Mauro Teixeira", startDate: "17/11/2025", salary: 3000, department: "Inicial" },
  { name: "Michele da Silva Xavier Costa", startDate: "17/11/2025", salary: 2300, department: "Consulta" },
  { name: "Natalia Strazza", startDate: "05/08/2025", salary: 2300, department: "Consulta" },
  { name: "Nathalya Oliveira", startDate: "24/11/2025", salary: 2300, department: "Consulta" },
  { name: "Nelson", startDate: "09/12/2024", salary: 7200, department: "Marketing" },
  { name: "Pedro Henrique", startDate: "01/09/2024", salary: 8000, department: "Dev" },
  { name: "Pedro Palhano", startDate: "14/01/2025", salary: 3500, department: "Receita" },
  { name: "Pedro Tatibano", startDate: "29/08/2025", salary: 5500, department: "Dev" },
  { name: "Pierre", startDate: "01/01/2024", salary: 20000, department: "Dev" }, // U$4000 convertido
  { name: "Rafael Lacoste", startDate: "13/03/2025", salary: 28000, department: "Financeiro" },
  { name: "Raissa Vasconcelos Mendes", startDate: "01/04/2024", salary: 2950, department: "Dev" },
  { name: "Rogerio Medeiros da Silva", startDate: "17/06/2024", salary: 22500, department: "Dev" }, // U$4500 convertido
  { name: "Samira", startDate: "17/03/2025", salary: 8000, department: "Marketing" },
  { name: "Stefanie Gueiros", startDate: "05/11/2025", salary: 2300, department: "Consulta" },
  { name: "Stephanye", startDate: "23/06/2025", salary: 2300, department: "Consulta" },
  { name: "Suellen", startDate: "05/08/2025", salary: 2500, department: "Docs" },
  { name: "Thaina Mendonça", startDate: "15/09/2025", salary: 10000, department: "Atendimento" },
  { name: "Thiago Henrique Silva", startDate: "05/11/2025", salary: 2500, department: "Inicial" },
  { name: "Vidjai", startDate: "17/07/2025", salary: 12000, department: "Design" },
  { name: "Vinicius Araujo", startDate: "06/10/2025", salary: 2500, department: "Inicial" },
];

// Mapeamento de departamentos da API para áreas do sistema
const departmentToArea: Record<string, string> = {
  "Médicos": "Operações - Gestão de Médicos",
  "Consulta": "Operações - Consulta Médica",
  "Inicial": "Operações - Inicial",
  "Receita": "Operações - Receita e Orçamento",
  "Docs": "Operações - Documentação",
  "Pós": "Operações - Pós Venda",
  "PO": "Tecnologia",
  "PM": "Tecnologia",
  "Projetos": "Tecnologia",
  "Dev": "Tecnologia",
  "Design": "Tecnologia",
  "RH": "Recursos Humanos",
  "Financeiro": "Financeiro",
  "Marketing": "Marketing",
  "Diretoria": "Presidência",
  "Atendimento": "Operações - Inicial",
};

// Função para converter data DD/MM/YYYY para Date
function parseDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(year, month - 1, day);
}

async function main() {
  console.log("🚀 Iniciando importação de prestadores...\n");

  // Buscar todas as áreas
  const areas = await prisma.area.findMany();
  const areaMap = new Map(areas.map((a) => [a.name, a.id]));
  console.log(`📍 ${areas.length} áreas encontradas`);

  // Buscar cargo Analista Junior (padrão para prestadores)
  const analistaPosition = await prisma.position.findUnique({
    where: { name: "Analista Junior" },
  });

  if (!analistaPosition) {
    throw new Error("Cargo 'Analista Junior' não encontrado. Execute o seed principal primeiro.");
  }
  console.log(`👤 Cargo padrão: ${analistaPosition.name}`);

  // Verificar mapeamento de áreas
  console.log("\n📋 Verificando mapeamento de áreas...");
  const missingAreas: string[] = [];
  for (const areaName of Object.values(departmentToArea)) {
    if (!areaMap.has(areaName)) {
      missingAreas.push(areaName);
    }
  }

  if (missingAreas.length > 0) {
    console.error("❌ Áreas não encontradas:", missingAreas);
    throw new Error("Algumas áreas não existem no banco. Execute o seed principal primeiro.");
  }
  console.log("✅ Todas as áreas mapeadas existem no banco\n");

  // Criar prestadores
  console.log("👥 Criando prestadores...\n");

  let created = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const provider of providersData) {
    const areaName = departmentToArea[provider.department];
    const areaId = areaMap.get(areaName);

    if (!areaId) {
      errors.push(`${provider.name}: Área '${areaName}' não encontrada`);
      continue;
    }

    try {
      // Verificar se já existe um prestador com esse nome
      const existing = await prisma.provider.findFirst({
        where: { name: provider.name },
      });

      if (existing) {
        console.log(`  ⏭️  ${provider.name} (já existe)`);
        skipped++;
        continue;
      }

      await prisma.provider.create({
        data: {
          name: provider.name,
          salary: provider.salary,
          startDate: parseDate(provider.startDate),
          areaId: areaId,
          positionId: analistaPosition.id,
          ndaStatus: "NOT_SIGNED",
          contractStatus: "NOT_SIGNED",
          isActive: true,
        },
      });

      console.log(`  ✅ ${provider.name} - ${areaName} - R$ ${provider.salary.toLocaleString("pt-BR")}`);
      created++;
    } catch (error: any) {
      errors.push(`${provider.name}: ${error.message}`);
      console.log(`  ❌ ${provider.name}: ${error.message}`);
    }
  }

  // Resumo
  console.log("\n" + "=".repeat(50));
  console.log("📊 RESUMO DA IMPORTAÇÃO");
  console.log("=".repeat(50));
  console.log(`✅ Criados: ${created}`);
  console.log(`⏭️  Ignorados (já existiam): ${skipped}`);
  console.log(`❌ Erros: ${errors.length}`);
  console.log(`📝 Total processado: ${providersData.length}`);

  if (errors.length > 0) {
    console.log("\n❌ Erros encontrados:");
    errors.forEach((e) => console.log(`   - ${e}`));
  }

  console.log("\n✅ Importação concluída!");
}

main()
  .catch((e) => {
    console.error("❌ Erro durante a importação:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
