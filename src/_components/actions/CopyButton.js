"use client";

//Libraries imports
import React from "react";
import { useRouter } from "next/navigation";
import * as amplitude from "@amplitude/analytics-browser";

// App imports
import StyledIconButton from "@/_components/StyledIconButton.js";
import { useStore } from "@/store";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */
export default function CopyButton(props) {
  const { index, image } = props;
  const router = useRouter()
  const { setGenerateFormValues } = useStore();

  const handleCopy = (image) => {
    amplitude.track("Copy Image");
    const copyValues = {
      website: image.content,
      prompt: image.prompt,
      // style_id: 1,
      style_title: image.style_title,
      style_prompt: image.style_prompt,
      qr_weight: image.qr_weight,
      negative_prompt: image.negative_prompt,
      seed: image.seed,
      sd_model: image.sd_model,
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
