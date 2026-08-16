"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Stack,
} from "@mui/material";

export default function UploadEbookDialog({ open, onClose, onUploaded }) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState("");
  const [format, setFormat] = useState("PDF");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleFile = (e) => {
    setFile(e.target.files?.[0] || null);
  };

  const submit = async () => {
    const newErrors = {};
    if (!title || !title.trim()) newErrors.title = "Title is required";
    if (!author || !author.trim()) newErrors.author = "Author is required";
    if (!subject || !subject.trim()) newErrors.subject = "Subject is required";
    if (!format || !format.trim()) newErrors.format = "Format is required";
    if (format.toLowerCase() === "pdf" && !file)
      newErrors.file = "PDF is required for PDF format";
    if (file && file.size > 25 * 1024 * 1024)
      newErrors.file = "File too large (max 25MB)";
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(",")[1];
      const payload = {
        filename: `${Date.now()}-${file.name}`,
        contentBase64: base64,
        title,
        author,
        description,
        subject,
        format,
      };

      const res = await fetch("/api/ebooks/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const record = await res.json();
        onUploaded && onUploaded(record);
        onClose();
      } else {
        console.error("Upload failed");
        setErrors({ submit: "Upload failed" });
      }
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add E-book</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            error={!!errors.title}
            helperText={errors.title}
          />
          <TextField
            label="Author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            required
            error={!!errors.author}
            helperText={errors.author}
          />
          <TextField
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            error={!!errors.subject}
            helperText={errors.subject}
          />
          <TextField
            label="Format"
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            required
            error={!!errors.format}
            helperText={errors.format || "Typical value: PDF"}
          />
          <div>
            <input type="file" accept="application/pdf" onChange={handleFile} />
            {errors.file ? (
              <div style={{ color: "red", fontSize: 12 }}>{errors.file}</div>
            ) : null}
          </div>
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
          />
          {errors.submit ? (
            <div style={{ color: "red", fontSize: 13 }}>{errors.submit}</div>
          ) : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          onClick={submit}
          variant="contained"
          disabled={loading || !title || !file}
        >
          {loading ? "Uploading..." : "Upload"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
