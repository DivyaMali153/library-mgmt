"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import { useRole } from "../RoleProvider";
import DeleteIcon from "@mui/icons-material/Delete";
import { IconButton } from "@mui/material";
import PdfModal from "./PdfModal";

export default function EbookCard({ ebook }) {
  if (!ebook) return null;

  const [open, setOpen] = useState(false);

  const { role } = useRole();

  const routeId = null;

  const handleDelete = async () => {
    if (!confirm(`Delete "${ebook.title}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(
        `/api/ebooks?id=${encodeURIComponent(ebook.id)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (res.ok) {
        window.location.reload();
      } else {
        console.error("Delete failed", data);
        alert("Delete failed");
      }
    } catch (e) {
      console.error(e);
      alert("Delete failed");
    }
  };

  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardMedia
        component="img"
        height="220"
        image={
          ebook.coverImage ||
          "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=80"
        }
        alt={ebook.title}
        sx={{ objectFit: "cover" }}
      />
      <CardContent sx={{ flexGrow: 1 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
          sx={{ mb: 1 }}
        >
          <Chip
            label={ebook.category || "General"}
            size="small"
            color="primary"
            variant="outlined"
          />
          <Chip
            label={
              ebook.availability === "Available" ? "Available" : "Unavailable"
            }
            size="small"
            color={ebook.availability === "Available" ? "success" : "default"}
          />
        </Stack>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
          {ebook.title}
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          by {ebook.author}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {ebook.description}
        </Typography>
      </CardContent>
      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          onClick={() => setOpen(true)}
          size="small"
          variant="contained"
          fullWidth
        >
          Read Book
        </Button>
        {role === "Librarian" ? (
          <IconButton onClick={handleDelete} color="error" aria-label="delete">
            <DeleteIcon />
          </IconButton>
        ) : null}
      </CardActions>

      <PdfModal
        open={open}
        onClose={() => setOpen(false)}
        pdfUrl={ebook.pdfUrl}
        title={ebook.title}
        author={ebook.author}
      />
    </Card>
  );
}
