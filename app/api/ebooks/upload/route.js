import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { createRecord, readJsonCollection } from "../../../../lib/jsonStore";
import { forbiddenResponse, getSessionUser, isStaff, unauthorizedResponse } from "../../../../lib/serverAuth";

export async function POST(request) {
  const user = await getSessionUser(request);
  if (!user) return unauthorizedResponse();
  if (!isStaff(user)) return forbiddenResponse();
  try {
    const payload = await request.json();
    const {
      filename,
      contentBase64,
      title,
      author,
      coverImage,
      category,
      subject,
      description,
    } = payload;
    const normalizedCategory = String(category || subject || '').trim();
    const normalizedTitle = String(title || '').trim();
    const normalizedAuthor = String(author || '').trim();
    if (!filename || !contentBase64 || !normalizedTitle || !normalizedAuthor || !normalizedCategory) {
      return Response.json(
        { error: "Title, author, category, and PDF file are required" },
        { status: 400 },
      );
    }

    const ebooks = await readJsonCollection("ebooks.json");
    if (ebooks.some((ebook) => String(ebook.title || '').trim().toLowerCase() === normalizedTitle.toLowerCase()
      && String(ebook.author || '').trim().toLowerCase() === normalizedAuthor.toLowerCase())) {
      return Response.json({ error: "An e-book with this title and author already exists" }, { status: 409 });
    }

    const outDir = path.join(process.cwd(), "data", "ebooks");
    await fs.mkdir(outDir, { recursive: true });
    const buffer = Buffer.from(contentBase64, "base64");
    if (buffer.length === 0 || buffer.length > 25 * 1024 * 1024 || buffer.subarray(0, 5).toString() !== "%PDF-") {
      return Response.json({ error: "Upload must be a valid PDF no larger than 25MB" }, { status: 400 });
    }
    const storageFilename = `${randomUUID()}.pdf`;
    const filePath = path.join(outDir, storageFilename);
    await fs.writeFile(filePath, buffer);

    const id = randomUUID();
    const record = await createRecord("ebooks.json", {
      id,
      title: normalizedTitle,
      author: normalizedAuthor,
      coverImage: coverImage || "",
      category: normalizedCategory,
      subject: normalizedCategory,
      description: String(description || "").trim(),
      pdfUrl: `/api/ebooks/${id}/file`,
      storageFilename,
      originalFilename: path.basename(filename),
      createdAt: new Date().toISOString(),
      availability: "Available",
      status: "Available",
    });

    return Response.json(record, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
