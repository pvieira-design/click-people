import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { join } from "path";

const MAX_FILE_SIZE_DOCUMENT = 10 * 1024 * 1024; // 10MB para documentos
const MAX_FILE_SIZE_PHOTO = 2 * 1024 * 1024; // 2MB para fotos
const ALLOWED_DOCUMENT_TYPES = ["application/pdf"];
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

type UploadType = "document" | "photo";
type DocumentType = "nda" | "contract" | "photo";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const documentType = formData.get("documentType") as string | null;
    const providerId = formData.get("providerId") as string | null;
    const uploadType = (formData.get("type") as UploadType) || "document";

    if (!file) {
      return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
    }

    if (!providerId) {
      return NextResponse.json({ error: "ID do prestador é obrigatório" }, { status: 400 });
    }

    // Validação baseada no tipo de upload
    if (uploadType === "photo") {
      // Validar tipo de imagem
      if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Tipo de arquivo não permitido. Use JPEG, PNG ou WebP." },
          { status: 400 }
        );
      }

      // Validar tamanho de imagem
      if (file.size > MAX_FILE_SIZE_PHOTO) {
        return NextResponse.json(
          { error: "Imagem muito grande. Tamanho máximo: 2MB" },
          { status: 400 }
        );
      }
    } else {
      // Validação de documentos
      if (!documentType || !["nda", "contract"].includes(documentType)) {
        return NextResponse.json(
          { error: "Tipo de documento inválido. Use 'nda' ou 'contract'" },
          { status: 400 }
        );
      }

      // Validar tipo de documento
      if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Tipo de arquivo não permitido. Apenas PDF é aceito." },
          { status: 400 }
        );
      }

      // Validar tamanho de documento
      if (file.size > MAX_FILE_SIZE_DOCUMENT) {
        return NextResponse.json(
          { error: "Arquivo muito grande. Tamanho máximo: 10MB" },
          { status: 400 }
        );
      }
    }

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${sanitizedName}`;

    // Determinar pasta de destino
    const folder = uploadType === "photo" ? "provider-photos" : "documents";
    const subfolder = uploadType === "photo" ? "" : `/${documentType}`;

    // Check if Vercel Blob token is available
    const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;

    if (hasBlobToken) {
      // Production: Upload to Vercel Blob
      const blobPath = `${folder}/${providerId}${subfolder}/${filename}`;
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
      const uploadDir = join(
        process.cwd(),
        "public",
        "uploads",
        folder,
        providerId,
        ...(subfolder ? [subfolder.replace("/", "")] : [])
      );

      // Create directory if it doesn't exist
      await mkdir(uploadDir, { recursive: true });

      // Write file to disk
      const filePath = join(uploadDir, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(filePath, buffer);

      // Return local URL
      const localUrl = `/uploads/${folder}/${providerId}${subfolder}/${filename}`;

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
