import { promises as fs } from "fs";
import path from "path";
import { createRecord } from "../../../../lib/jsonStore";

export async function POST(request) {
  try {
    const payload = await request.json();
    const {
      filename,
      contentBase64,
      title,
      author,
      coverImage,
      category,
      description,
    } = payload;
    if (!filename || !contentBase64 || !title) {
      return Response.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const outDir = path.join(process.cwd(), "public", "ebooks");
    await fs.mkdir(outDir, { recursive: true });
    const filePath = path.join(outDir, filename);
    const buffer = Buffer.from(contentBase64, "base64");
    await fs.writeFile(filePath, buffer);

    const record = await createRecord("ebooks.json", {
      title,
      author,
      coverImage: coverImage || "",
      category: category || "General",
      description: description || "",
      pdfUrl: `/ebooks/${filename}`,
      availability: "Available",
      status: "Available",
    });

    return Response.json(record, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
