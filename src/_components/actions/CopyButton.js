"use client";

//Libraries imports
import React from "react";
import { useRouter } from "next/navigation";
import * as amplitude from "@amplitude/analytics-browser";

// App imports
import StyledIconButton from "@/_components/StyledIconButton.js";
import { useStore } from "@/store";
import { styles } from "@/_utils/ImageStyles";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */
export default function CopyButton(props) {
  const { index, image } = props;
  const router = useRouter()
  const { setGenerateFormValues } = useStore();

  const handleCopy = (image) => {
    amplitude.track("Copy Image");
    const sourceStyle =
      styles.find((s) => s.id === image.style_id) ??
      styles.find((s) => s.title === image.style_title) ??
      styles[0];
    const copyValues = {
      website: image.content,
      prompt: image.prompt,
      style_id: sourceStyle.id,
      style_title: sourceStyle.title,
      qr_weight: image.qr_weight,
      negative_prompt: image.negative_prompt,
      seed: image.seed,
    };
    setGenerateFormValues(copyValues);

    router.push("/generate");
  };

  return (
    <StyledIconButton
      type="copy"
      variant="contained"
      color="secondary"
      tooltip="Copy data to generate similar image"
      handleClick={() => handleCopy(image)}
      key={index}
    />
  );
}
