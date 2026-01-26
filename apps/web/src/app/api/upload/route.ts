import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["application/pdf"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string | null;
    const providerId = formData.get("providerId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    if (!documentType || !["nda", "contract"].includes(documentType)) {
      return NextResponse.json(
        { error: "Tipo de documento inválido. Use 'nda' ou 'contract'" },
        { status: 400 }
      );
    }

    if (!providerId) {
      return NextResponse.json({ error: "ID do prestador é obrigatório" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Tipo de arquivo não permitido. Apenas PDF é aceito." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Arquivo muito grande. Tamanho máximo: 10MB" },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${sanitizedName}`;

    // Check if Vercel Blob token is available
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;

    if (hasBlobToken) {
      // Production: Upload to Vercel Blob
      const blobPath = `documents/${providerId}/${documentType}/${filename}`;
      const blob = await put(blobPath, file, {
        access: "public",
        addRandomSuffix: false,
      });

      return NextResponse.json({
        url: blob.url,
        filename: blob.pathname,
      });
    } else {
      // Development: Save to local public/uploads folder
      const uploadDir = join(process.cwd(), "public", "uploads", providerId, documentType);

      // Create directory if it doesn't exist
      await mkdir(uploadDir, { recursive: true });

      // Write file to disk
      const filePath = join(uploadDir, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      // Return local URL
      const localUrl = `/uploads/${providerId}/${documentType}/${filename}`;

      return NextResponse.json({
        url: localUrl,
        filename: filename,
      });
    }
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Erro ao fazer upload do arquivo" },
      { status: 500 }
    );
  }
}
