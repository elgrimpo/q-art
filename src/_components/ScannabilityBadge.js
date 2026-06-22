import React from 'react'
import { Box, Typography, Stack } from '@mui/material'

function getCategory(score) {
  if (score >= 85) return { label: 'Excellent', color: '#4A8C5C', level: 5 }
  if (score >= 70) return { label: 'Good',       color: '#8BC989', level: 4 }
  if (score >= 50) return { label: 'Fair',        color: '#D4B44A', level: 3 }
  if (score >= 20) return { label: 'Poor',        color: '#D97B7B', level: 2 }
  return             { label: 'Unscannable',   color: '#8B2020', level: 1 }
}

export default function ScannabilityBadge({ score }) {
  if (score == null) return null

  const { label, color, level } = getCategory(score)

  return (
    <Box>
      <Stack direction="row" spacing={0.5} sx={{ mb: 0.5 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Box
            key={i}
            data-testid="score-square"
            sx={{
              width: 36,
              height: 22,
              borderRadius: 1,
              backgroundColor: i < level ? color : '#CCCCCC',
            }}
          />
        ))}
      </Stack>
      <Typography
        variant="caption"
        sx={{ color, fontWeight: 700, display: 'block' }}
      >
        {label}
      </Typography>
    </Box>
  )
}
