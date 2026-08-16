"use client";

import { useEffect, useMemo, useState } from "react";
import { useRole } from "../../components/RoleProvider";
import {
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Chip,
  TextField,
  IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import EbookList from "../../components/Ebook/EbookList";
import LibraryAddIcon from "@mui/icons-material/LibraryAdd";
import UploadEbookDialog from "../../components/Ebook/UploadEbookDialog";

export default function EbooksPage() {
  const { role, user } = useRole();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [ebooks, setEbooks] = useState([]);
  const [requests, setRequests] = useState([]);
  const [form, setForm] = useState({
    id: null,
    title: "",
    author: "",
    subject: "",
    format: "PDF",
    status: "Available",
  });
  const [requestMessage, setRequestMessage] = useState("");

  const load = async () => {
    const [ebooksRes, requestsRes] = await Promise.all([
      fetch("/api/ebooks"),
      fetch(`/api/requests?email=${encodeURIComponent(user?.email || "")}`),
    ]);
    setEbooks(await ebooksRes.json());
    setRequests(await requestsRes.json());
  };

  useEffect(() => {
    load();
  }, [user]);

  const submit = async (e) => {
    e.preventDefault();
    const method = form.id ? "PUT" : "POST";
    await fetch("/api/ebooks", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({
      id: null,
      title: "",
      author: "",
      subject: "",
      format: "PDF",
      status: "Available",
    });
    load();
  };

  const editEbook = (ebook) => setForm(ebook);

  const deleteEbook = async (id) => {
    await fetch(`/api/ebooks?id=${id}`, { method: "DELETE" });
    load();
  };

  const requestedEbookIds = useMemo(
    () =>
      requests.filter((r) => r.requestType === "ebook").map((r) => r.ebookId),
    [requests],
  );

  const requestAccess = async (ebook) => {
    if (!user?.email) {
      setRequestMessage("Please login to request ebook access.");
      return;
    }

    await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestType: "ebook",
        ebookId: ebook.id,
        title: ebook.title,
        studentName: user.name || "",
        studentId: user.id || "",
        requestedBy: user.email,
        note: "Request access to ebook",
      }),
    });
    setRequestMessage("E-book access request submitted.");
    load();
  };

  if (role !== "Librarian") {
    return <EbookList />;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Card>
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography variant="h5" fontWeight={700}>
                E-books catalog
              </Typography>
              <Typography color="text.secondary">
                Manage digital reading resources with rich metadata.
              </Typography>
            </Box>
            {role === "Librarian" ? (
              <Button
                variant="outlined"
                startIcon={<LibraryAddIcon />}
                onClick={() => setUploadOpen(true)}
              >
                Upload E-book (PDF)
              </Button>
            ) : null}
          </Stack>
          <form onSubmit={submit}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={2}
              sx={{ mt: 2 }}
            >
              <TextField
                label="Title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
              <TextField
                label="Author"
                required
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
              />
              <TextField
                label="Subject"
                required
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
              />
              <TextField
                label="Format"
                value={form.format}
                onChange={(e) => setForm({ ...form, format: e.target.value })}
              />
              <Button type="submit" variant="contained">
                {form.id ? "Update E-book" : "Add E-book"}
              </Button>
            </Stack>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Author</TableCell>
                <TableCell>Subject</TableCell>
                <TableCell>Format</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ebooks.map((ebook) => (
                <TableRow key={ebook.id}>
                  <TableCell>{ebook.title}</TableCell>
                  <TableCell>{ebook.author}</TableCell>
                  <TableCell>{ebook.subject}</TableCell>
                  <TableCell>{ebook.format}</TableCell>
                  <TableCell>
                    <Chip label={ebook.status} color="info" size="small" />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={1}>
                      <IconButton size="small" onClick={() => editEbook(ebook)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => deleteEbook(ebook.id)}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EbookList showHeader={false} />
      <UploadEbookDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => {
          load();
          setUploadOpen(false);
        }}
      />
    </Box>
  );
}
