"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Box,
  Card,
  CardContent,
  Grid,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import EbookCard from "./EbookCard";

export default function EbookList({ showHeader = true, ebooks: propEbooks, onRefresh }) {
  const [internalEbooks, setInternalEbooks] = useState([]);

  const fetchEbooks = useCallback(async () => {
    try {
      const res = await fetch("/api/ebooks", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setInternalEbooks(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (propEbooks === undefined) {
      fetchEbooks();
    }

    const handleUpdate = () => {
      if (onRefresh) {
        onRefresh();
      } else {
        fetchEbooks();
      }
    };

    window.addEventListener("ebook-updated", handleUpdate);
    return () => {
      window.removeEventListener("ebook-updated", handleUpdate);
    };
  }, [propEbooks, fetchEbooks, onRefresh]);

  const rawEbooks = propEbooks !== undefined ? propEbooks : internalEbooks;

  const ebooks = useMemo(() => {
    return (rawEbooks || []).filter((ebook) => {
      const status = String(ebook.availability || ebook.status || "Available").toLowerCase();
      return status !== "unavailable" && status !== "archived" && status !== "not available";
    });
  }, [rawEbooks]);

  const [query, setQuery] = useState("");

  const filteredBooks = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return ebooks;

    return ebooks.filter((ebook) => {
      const haystack = [
        ebook.title,
        ebook.author,
        ebook.category,
        ebook.subject,
        ebook.description,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [query, ebooks]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {showHeader ? (
        <Card>
          <CardContent>
            <Typography variant="h5" fontWeight={700}>
              E-book library
            </Typography>
            <Typography color="text.secondary">
              Browse available titles, read them in-browser, and keep your
              learning going.
            </Typography>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", md: "center" }}
            spacing={2}
          >
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Search e-books
              </Typography>
              <Typography color="text.secondary">
                Search by title, author, or category
              </Typography>
            </Box>
            <TextField
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search e-books"
              sx={{ width: { xs: "100%", md: 420 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
          </Stack>
        </CardContent>
      </Card>

      <Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {filteredBooks.length} e-book{filteredBooks.length === 1 ? "" : "s"}{" "}
          available
        </Typography>
        <Grid container spacing={3}>
          {filteredBooks.map((ebook) => (
            <Grid item xs={12} sm={6} lg={4} key={ebook.id}>
              <EbookCard ebook={ebook} />
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
