import { config } from "dotenv";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from apps/web/.env
config({ path: resolve(__dirname, "../../../apps/web/.env") });

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, DocumentStatus } from "./generated/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL not found in environment variables");
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

// Path to the Excel file
const EXCEL_PATH = "C:\\Users\\rafae\\Desktop\\Teste folha\\Folha Click.xlsx";

interface RowData {
  nome: string;
  dataInicio: string;
  salario: string;
  area: string;
  cargo: string;
  contrato: string;
  nda: string;
}

function parseDate(dateStr: string): Date {
  // Check if it's an Excel serial date (number)
  const serial = parseFloat(dateStr);
  if (!isNaN(serial) && serial > 1000) {
    // Excel serial date: days since 1900-01-01 (with Excel bug for 1900 leap year)
    // JavaScript Date epoch is 1970-01-01
    // Excel epoch is 1900-01-01 = serial 1
    // Days between 1900-01-01 and 1970-01-01 = 25569
    const excelEpoch = new Date(1899, 11, 30); // Excel counts from Dec 30, 1899
    const jsDate = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
    return jsDate;
  }

  // Format: M/D/YY (e.g., 4/1/25 = April 1, 2025)
  const parts = dateStr.split("/");
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}`);
  }
  const month = parseInt(parts[0]!, 10);
  const day = parseInt(parts[1]!, 10);
  let year = parseInt(parts[2]!, 10);

  // Convert 2-digit year to 4-digit
  if (year < 100) {
    year = year < 50 ? 2000 + year : 1900 + year;
  }

  return new Date(year, month - 1, day);
}

function parseSalary(salaryStr: string): number {
  // Remove quotes, commas (thousands separator), and convert to number
  // "2,500" -> 2500, "50,000" -> 50000
  const cleaned = salaryStr.replace(/"/g, "").replace(/,/g, "");
  const value = parseFloat(cleaned);
  if (isNaN(value)) {
    throw new Error(`Invalid salary format: ${salaryStr}`);
  }
  return value;
}

function mapContractStatus(status: string): DocumentStatus {
  const normalized = status.toLowerCase().trim();
  if (normalized === "assinado") {
    return "SIGNED";
  }
  return "NOT_SIGNED";
}

function mapNdaStatus(status: string): DocumentStatus {
  const normalized = status.toLowerCase().trim();
  if (normalized === "assinado") {
    return "SIGNED";
  }
  return "NOT_SIGNED";
}

async function main() {
  console.log("📊 Importando prestadores da planilha...\n");
  console.log(`📁 Arquivo: ${EXCEL_PATH}\n`);

  // Read the Excel file
  const workbook = XLSX.readFile(EXCEL_PATH);
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("No sheets found in the Excel file");
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("Could not read sheet");
  }

  // Convert to JSON (array of arrays)
  const rawData: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Skip header row
  const dataRows = rawData.slice(1).filter(row => row[0]); // Filter out empty rows

  console.log(`📋 Total de linhas encontradas: ${dataRows.length}\n`);

  // Get all areas from database
  const areas = await prisma.area.findMany();
  const areaMap = new Map(areas.map(a => [a.name, a.id]));
  console.log(`🏢 Áreas no banco: ${areas.length}`);

  // Get the default position (Analista Pleno)
  const defaultPosition = await prisma.position.findUnique({
    where: { name: "Analista Pleno" }
  });
  if (!defaultPosition) {
    throw new Error("Position 'Analista Pleno' not found in database");
  }
  console.log(`📋 Cargo padrão: ${defaultPosition.name}\n`);

  // Process each row
  const providers: {
    name: string;
    salary: number;
    startDate: Date;
    areaId: string;
    positionId: string;
    contractStatus: DocumentStatus;
    ndaStatus: DocumentStatus;
  }[] = [];

  const errors: string[] = [];
  const duplicates: string[] = [];
  const existingNames = new Set<string>();

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i]!;
    const lineNum = i + 2; // +2 because Excel is 1-indexed and we skipped header

    try {
      const nome = String(row[0] || "").trim();
      const dataInicio = String(row[1] || "").trim();
      const salario = String(row[2] || "").trim();
      const area = String(row[3] || "").trim();
      const contrato = String(row[5] || "").trim();
      const nda = String(row[6] || "").trim();

      // Validate required fields
      if (!nome) {
        errors.push(`Linha ${lineNum}: Nome vazio`);
        continue;
      }

      // Check for duplicates in the file
      if (existingNames.has(nome.toLowerCase())) {
        duplicates.push(`Linha ${lineNum}: "${nome}" duplicado`);
        continue;
      }
      existingNames.add(nome.toLowerCase());

      if (!dataInicio) {
        errors.push(`Linha ${lineNum}: Data de início vazia para "${nome}"`);
        continue;
      }

      if (!salario) {
        errors.push(`Linha ${lineNum}: Salário vazio para "${nome}"`);
        continue;
      }

      if (!area) {
        errors.push(`Linha ${lineNum}: Área vazia para "${nome}"`);
        continue;
      }

      // Get area ID
      const areaId = areaMap.get(area);
      if (!areaId) {
        errors.push(`Linha ${lineNum}: Área "${area}" não encontrada para "${nome}"`);
        continue;
      }

      // Parse data
      const parsedDate = parseDate(dataInicio);
      const parsedSalary = parseSalary(salario);
      const contractStatus = mapContractStatus(contrato);
      const ndaStatusValue = mapNdaStatus(nda);

      providers.push({
        name: nome,
        salary: parsedSalary,
        startDate: parsedDate,
        areaId: areaId,
        positionId: defaultPosition.id,
        contractStatus: contractStatus,
        ndaStatus: ndaStatusValue,
      });

    } catch (err) {
      errors.push(`Linha ${lineNum}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Check for existing providers in database
  const existingProviders = await prisma.provider.findMany({
    select: { name: true }
  });
  const existingInDb = new Set(existingProviders.map(p => p.name.toLowerCase()));

  const toInsert = providers.filter(p => {
    if (existingInDb.has(p.name.toLowerCase())) {
      duplicates.push(`"${p.name}" já existe no banco`);
      return false;
    }
    return true;
  });

  // Display summary before insert
  console.log("📊 Resumo da análise:");
  console.log(`   - Linhas processadas: ${dataRows.length}`);
  console.log(`   - Prestadores válidos: ${providers.length}`);
  console.log(`   - A inserir: ${toInsert.length}`);
  console.log(`   - Duplicados: ${duplicates.length}`);
  console.log(`   - Erros: ${errors.length}`);
  console.log("");

  if (errors.length > 0) {
    console.log("❌ Erros encontrados:");
    errors.forEach(e => console.log(`   ${e}`));
    console.log("");
  }

  if (duplicates.length > 0) {
    console.log("⚠️  Duplicados (ignorados):");
    duplicates.forEach(d => console.log(`   ${d}`));
    console.log("");
  }

  if (toInsert.length === 0) {
    console.log("⚠️  Nenhum prestador para inserir.");
    return;
  }

  // Insert providers
  console.log(`🚀 Inserindo ${toInsert.length} prestadores...`);

  const result = await prisma.provider.createMany({
    data: toInsert.map(p => ({
      name: p.name,
      salary: p.salary,
      startDate: p.startDate,
      areaId: p.areaId,
      positionId: p.positionId,
      contractStatus: p.contractStatus,
      ndaStatus: p.ndaStatus,
      seniority: "NA",
      isActive: true,
    })),
  });

  console.log(`\n✅ ${result.count} prestadores inseridos com sucesso!`);

  // List inserted providers
  console.log("\n📋 Prestadores inseridos:");
  toInsert.forEach((p, i) => {
    const areaName = areas.find(a => a.id === p.areaId)?.name || "?";
    console.log(`   ${i + 1}. ${p.name} - ${areaName} - R$ ${p.salary.toLocaleString("pt-BR")}`);
  });
}

main()
  .catch((e) => {
    console.error("❌ Erro durante a importação:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
