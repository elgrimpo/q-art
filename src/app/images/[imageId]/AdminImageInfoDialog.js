"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

export default function AdminImageInfoDialog({ open, onClose, imageId }) {
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !imageId) return;
    setDoc(null);
    setError(null);
    setLoading(true);

    fetch(`/api/admin/image/${imageId}/info`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setDoc(data.doc))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [open, imageId]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { bgcolor: "background.paper", color: "text.primary" } }}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6">Image Info</Typography>
        <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        )}
        {error && (
          <Typography color="error" variant="body2">
            Failed to load: {error}
          </Typography>
        )}
        {doc && (
          <Box
            component="pre"
            sx={{
              fontSize: "12px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              fontFamily: "monospace",
              m: 0,
              color: "text.primary",
            }}
          >
            {JSON.stringify(doc, null, 2)}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
