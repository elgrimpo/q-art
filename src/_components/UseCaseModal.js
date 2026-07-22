"use client";

import Image from "next/image";
import { Box, Typography, IconButton, Dialog } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import { useSwipeable } from "react-swipeable";

/**
 * Enlarged-image modal shared by the /generate use-case carousel and the
 * /styles/[slug] Perfect For grid. Each consumer owns its own open/index
 * state and passes in its own `items` list — this component is purely
 * presentational plus swipe gestures.
 */
export default function UseCaseModal({ open, items, index, onClose, onNext, onPrevious }) {
  const activeItem = open ? items[index] : null;

  // No scrollable content and no sidebar competing for horizontal gestures
  // here (unlike ImageModal.js), so a single handler covers close + nav.
  const swipeHandlers = useSwipeable({
    onSwipedDown: onClose,
    onSwipedLeft: onNext,
    onSwipedRight: onPrevious,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      slotProps={{
        backdrop: { sx: { backgroundColor: "rgba(0,0,0,0.85)" } },
      }}
      PaperProps={{
        sx: {
          bgcolor: "transparent",
          backgroundImage: "none",
          boxShadow: "none",
          width: { xs: "100vw", md: "auto" },
          m: { xs: 0, md: 2 },
          "&.MuiDialog-paper": { maxWidth: "100vw", maxHeight: "100vh" },
        },
      }}
    >
      {activeItem && (
        <Box
          {...swipeHandlers}
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: { xs: "100vw", md: "min(90vw, 640px)" },
            height: { xs: "100vh", md: "85vh" },
          }}
        >
          <IconButton
            onClick={onClose}
            aria-label="Close"
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
              zIndex: 10,
              bgcolor: "rgba(0,0,0,0.45)",
              color: "primary.main",
              "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
            }}
          >
            <CloseIcon />
          </IconButton>

          <IconButton
            onClick={onPrevious}
            aria-label="Previous"
            sx={{
              position: "absolute",
              left: 8,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              bgcolor: "rgba(0,0,0,0.45)",
              color: "primary.main",
              "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
            }}
          >
            <ChevronLeftIcon />
          </IconButton>

          <IconButton
            onClick={onNext}
            aria-label="Next"
            sx={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              bgcolor: "rgba(0,0,0,0.45)",
              color: "primary.main",
              "&:hover": { bgcolor: "rgba(0,0,0,0.7)" },
            }}
          >
            <ChevronRightIcon />
          </IconButton>

          <Box sx={{ position: "relative", width: "100%", height: "100%" }}>
            <Image
              src={activeItem.image}
              alt={`${activeItem.category} QR code example`}
              fill
              unoptimized
              style={{ objectFit: "contain" }}
              sizes="90vw"
            />
          </Box>

          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              background:
                "linear-gradient(0deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%)",
              px: 3,
              pb: 3,
              pt: 6,
              textAlign: "center",
            }}
          >
            <Typography variant="overline" sx={{ color: "primary.main", letterSpacing: "0.08em" }}>
              {activeItem.category}
            </Typography>
            <Typography variant="body1" sx={{ color: "white" }}>
              {activeItem.description}
            </Typography>
          </Box>
        </Box>
      )}
    </Dialog>
  );
}
