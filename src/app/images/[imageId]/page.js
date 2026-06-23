import React from "react";
import { Box } from "@mui/material";
import { redirect } from "next/navigation";

import { getImageById } from "@/_utils/ImagesUtils";
import { getUserInfo } from "@/_utils/userUtils";
import ImageDetailContent from "./ImageDetailContent";

export async function generateMetadata({ params }) {
  const { imageId } = params;
  const image = await getImageById(imageId);

  return {
    title: "QR AI",
    description: "Generate Art with QR Codes",
    robots: { index: false, follow: true },
    twitter: {
      card: "summary_large_image",
      title: "QR AI",
      description: "Generate Art with QR Codes",
      images: [image?.watermarked_image_url],
    },
    openGraph: {
      images: [image?.watermarked_image_url],
      title: "QR AI",
      description: "Generate Art with QR Codes",
      url: `https://www.qr-ai.co/images/${imageId}`,
    },
  };
}

export default async function ImagePage({ params }) {
  const { imageId } = params;
  const image = await getImageById(imageId);
  const user = await getUserInfo();

  const customDeleteAction = async () => {
    "use server";
    redirect("/explore");
  };

  const userProp = user
    ? { _id: user._id, is_guest: user.is_guest || false, ...user }
    : null;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#161616" }}>
      <Box
        sx={{
          maxWidth: "1600px",
          mx: "auto",
          px: { xs: 2, md: 4 },
          pt: { xs: 2, sm: 3.5 },
          pb: 10,
        }}
      >
        <ImageDetailContent
          image={image}
          user={userProp}
          customDeleteAction={customDeleteAction}
        />
      </Box>
    </Box>
  );
}
