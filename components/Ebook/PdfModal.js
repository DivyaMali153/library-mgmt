"use client";

import PdfReader from "./PdfReader";
import CloseIcon from "@mui/icons-material/Close";
import { Dialog, DialogContent, DialogTitle, IconButton } from "@mui/material";

export default function PdfModal({ open, onClose, pdfUrl, title, author }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ m: 0, p: 2 }}>
        {title}
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <PdfReader pdfUrl={pdfUrl} title={title} author={author} />
      </DialogContent>
    </Dialog>
  );
}
