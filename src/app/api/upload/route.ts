import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/**
 * Local storage fallback for when Supabase Storage isn't configured.
 * Accepts a multipart/form-data body with an `audio` file field and
 * saves it under /public/uploads so it's served as a static asset.
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("audio");

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json(
        { error: "Missing audio file." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    await mkdir(UPLOAD_DIR, { recursive: true });

    const extension = mimeToExtension(file.type);
    const filename = `${randomUUID()}.${extension}`;
    const filePath = path.join(UPLOAD_DIR, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    return NextResponse.json(
      { path: `/uploads/${filename}` },
      { headers: CORS_HEADERS }
    );
  } catch (error) {
    console.error("Local upload failed:", error);
    return NextResponse.json(
      { error: "Upload failed." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

function mimeToExtension(mimeType: string): string {
  if (mimeType.includes("mp4")) return "mp4";
  if (mimeType.includes("aac")) return "aac";
  if (mimeType.includes("ogg")) return "ogg";
  return "webm";
}
