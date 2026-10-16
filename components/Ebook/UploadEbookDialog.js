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
  const [category, setCategory] = useState("");
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
    if (!category || !category.trim()) newErrors.category = "Category is required";
    if (!file) newErrors.file = "PDF is required";
    if (file && file.type && file.type !== "application/pdf") newErrors.file = "Choose a PDF file";
    if (file && file.size > 25 * 1024 * 1024)
      newErrors.file = "File too large (max 25MB)";
    setErrors(newErrors);
    if (Object.keys(newErrors).length) return;

    setLoading(true);
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1]);
        reader.onerror = () => reject(new Error("Unable to read the selected file"));
        reader.readAsDataURL(file);
      });
      const response = await fetch("/api/ebooks/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: file.name, contentBase64: base64, title, author, description, category }),
      });
      const result = await response.json();
      if (!response.ok) {
        setErrors({ submit: result.error || "Upload failed" });
        return;
      }
      onUploaded && onUploaded(result);
      setTitle("");
      setAuthor("");
      setDescription("");
      setCategory("");
      setFile(null);
      onClose();
    } catch {
      setErrors({ submit: "Unable to read or upload this PDF." });
    } finally {
      setLoading(false);
    }
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
            label="Category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            error={!!errors.category}
            helperText={errors.category}
          />
          <div>
            <input type="file" accept="application/pdf" onChange={handleFile} />
            {file ? <div>{file.name}</div> : null}
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
          disabled={loading || !title || !author || !category || !file}
        >
          {loading ? "Uploading..." : "Upload"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
