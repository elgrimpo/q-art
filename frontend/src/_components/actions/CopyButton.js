"use client";

//Libraries imports
import React from "react";
import { useRouter } from "next/navigation";

// App imports
import StyledIconButton from "@/_components/StyledIconButton.js";
import { useStore } from "@/store";

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */
export default function CopyButton(props) {
  const { index, item } = props;
  const router = useRouter()
  const { setGenerateFormValues } = useStore();

  const handleCopy = (item) => {
    const copyValues = {
      website: item.content,
      prompt: item.prompt,
      // style_id: 1,
      style_title: item.style_title,
      style_prompt: item.style_prompt,
      qr_weight: item.qr_weight,
      negative_prompt: item.negative_prompt,
      seed: item.seed,
      sd_model: item.sd_model,
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
      handleClick={() => handleCopy(item)}
      key={index}
    />
  );
}
