"use client";

import { useState } from "react";
import { useEffect } from "react";
import Link from "next/link";
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
  const [request, setRequest] = useState(null);
  const [message, setMessage] = useState("");
  const { role, user } = useRole();
  const isStudent = String(role || "").toLowerCase() === "student";
  const isStaff = ["administrator", "librarian"].includes(String(role || "").toLowerCase());
  const canRead = isStaff || (isStudent && ["Accepted", "Issued"].includes(request?.status));

  useEffect(() => {
    if (!isStudent) return;
    let active = true;
    const loadRequest = async () => {
      const response = await fetch("/api/requests");
      if (!response.ok) return;
      const requests = await response.json();
      if (active) setRequest(requests.find((item) => item.requestType === "ebook" && String(item.ebookId) === String(ebook.id)) || null);
    };
    loadRequest();
    const interval = window.setInterval(loadRequest, 15000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [isStudent, ebook.id]);

  const requestAccess = async () => {
    if (!user?.email) {
      setMessage("Sign in as a student to request access.");
      return;
    }
    const response = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestType: "ebook", ebookId: ebook.id, title: ebook.title, author: ebook.author, note: "Request access to e-book" }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error || "Unable to submit the request.");
      return;
    }
    setRequest(result);
    setMessage("Access request submitted.");
  };

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
              String(ebook.availability || ebook.status || "Available").toLowerCase() !== "unavailable"
                ? "Available"
                : "Unavailable"
            }
            size="small"
            color={
              String(ebook.availability || ebook.status || "Available").toLowerCase() !== "unavailable"
                ? "success"
                : "default"
            }
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
          disabled={!canRead}
        >
          {canRead ? "Read Book" : "Access after approval"}
        </Button>
        {isStaff ? (
          <IconButton onClick={handleDelete} color="error" aria-label="delete">
            <DeleteIcon />
          </IconButton>
        ) : null}
      </CardActions>

      {isStudent ? (
        <CardActions sx={{ px: 2, pt: 0, flexWrap: "wrap" }}>
          {!request || ["Rejected", "Not Available"].includes(request.status) ? <Button size="small" onClick={requestAccess}>Request access</Button> : <Chip size="small" label={request.status === "Accepted" || request.status === "Issued" ? "Access approved" : request.status} />}
          {message ? <Typography variant="caption" color="text.secondary">{message}</Typography> : null}
        </CardActions>
      ) : null}

      <CardActions sx={{ px: 2, pt: 0 }}>
        <Button component={Link} href={`/ebooks/${ebook.id}`} size="small" fullWidth>Details</Button>
      </CardActions>

      <PdfModal
        open={open}
        onClose={() => setOpen(false)}
        pdfUrl={`/api/ebooks/${ebook.id}/file`}
        title={ebook.title}
        author={ebook.author}
      />
    </Card>
  );
}
