"use server";
//Libraries imports

import axios from "axios";
import { notFound } from "next/navigation";
import { revalidateTag } from 'next/cache'
import { getBackendToken } from "./backendAuth";


// App imports

/* -------------------------------------------------------------------------- */
/*                               GET IMAGE BY ID                              */
/* -------------------------------------------------------------------------- */

export const getImageById = async (imageId) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/get/${imageId}`,
      {
        method: "GET",
        credentials: "include",
        next: { revalidate: 3600, tags: ["images"] },
      }
    );
    if (!response.ok) {
      const err = new Error("Failed to fetch images");
      err.status = response.status;
      throw err;
    }
    const image = await response.json();
    return image;
  } catch (error) {
    if (error.status === 404) {
      notFound();
    }
    console.error("Error fetching images:", error);
    throw error;
  }
};

// /* -------------------------------------------------------------------------- */
/*                                 GET IMAGES                                 */
/* -------------------------------------------------------------------------- */
export const getImages = async (params) => {
  "use server";
  const cleaned = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  );
  const queryParams = new URLSearchParams(cleaned).toString();

  /* -------------------------------- API Call -------------------------------- */
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/get?${queryParams}`,
      {
        method: "GET",
        credentials: "include",
        next: { revalidate: 60, tags: ["images"] },
      }
    );
    if (!response.ok) {
      throw new Error("Failed to fetch images");
    }
    const images = await response.json();
    return images;
  } catch (error) {
    console.error("Error fetching images:", error);
    throw error;
  }
};

/* -------------------------------------------------------------------------- */
/*                              START GENERATION                              */
/* -------------------------------------------------------------------------- */

export const startGeneration = async (generateFormValues, user) => {
  const token = await getBackendToken();
  // style_title is kept client-side for display/local logic (e.g. seed-reset
  // comparisons) but the backend resolves the canonical title from the DB —
  // drop it before sending.
  const { style_title, ...rest } = generateFormValues;
  const payload = {
    ...rest,
    qr_weight: Math.round(Number(generateFormValues.qr_weight) || 0),
  };
  const queryParams = new URLSearchParams(payload);
  const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate/start?${queryParams.toString()}`;

  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const detail = data?.detail || "GenerationFailed";
    throw new Error(
      detail === "Insufficient credits" ? "InsufficientCredits" : "GenerationFailed"
    );
  }
  return response.json(); // { job_id }
};

/* -------------------------------------------------------------------------- */
/*                            GET GENERATION PROGRESS                         */
/* -------------------------------------------------------------------------- */

export const getGenerationProgress = async (jobId) => {
  const token = await getBackendToken();
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate/progress/${jobId}`,
    {
      method: "GET",
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }
  );
  if (!response.ok) {
    const err = new Error("Failed to fetch generation progress");
    err.status = response.status;
    throw err;
  }
  return response.json(); // { status, percent, stage, eta, result?, error? }
};

/* -------------------------------------------------------------------------- */
/*                       GENERATE IMAGE (poll to completion)                  */
/* -------------------------------------------------------------------------- */

// Convenience wrapper for callers that just want the finished image and don't
// need incremental progress (IteratePanel's New Variation / Retry).
// GenerateForm.js polls startGeneration/getGenerationProgress directly instead,
// so it can show live percent while waiting.
export const generateImage = async (generateFormValues, user) => {
  const { job_id } = await startGeneration(generateFormValues, user);
  for (;;) {
    const progress = await getGenerationProgress(job_id);
    if (progress.status === "succeeded") {
      revalidateTag('images');
      revalidateTag('user');
      return progress.result;
    }
    if (progress.status === "failed") {
      throw new Error(progress.error || "GenerationFailed");
    }
    await new Promise((resolve) => setTimeout(resolve, 1200));
  }
};

/* -------------------------------------------------------------------------- */
/*                                DELETE IMAGE                                */
/* -------------------------------------------------------------------------- */

export const deleteImage = async (id) => {
  const token = await getBackendToken();
  return new Promise((resolve, reject) => {
    axios
      .delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        revalidateTag('images')
        resolve(true);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

/* -------------------------------------------------------------------------- */
/*                                 LIKE IMAGE                                 */
/* -------------------------------------------------------------------------- */

export const likeImage = async (imageId, userId) => {
  const token = await getBackendToken();
  return new Promise((resolve, reject) => {
    axios
      .put(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/like/${imageId}`,
        null,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then(() => {
        revalidateTag('images')
        resolve(true);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

/* -------------------------------------------------------------------------- */
/*                              BOOKMARK IMAGE (admin)                        */
/* -------------------------------------------------------------------------- */

export const bookmarkImage = async (id) => {
  const token = await getBackendToken();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/bookmark/${id}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) throw new Error("Failed to toggle bookmark");
  return res.json();
};

/* -------------------------------------------------------------------------- */
/*                             BOOKMARK HERO (admin)                          */
/* -------------------------------------------------------------------------- */

export const bookmarkHero = async (id) => {
  const token = await getBackendToken();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/hero/${id}`,
    {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) throw new Error("Failed to toggle hero");
  return res.json();
};

/* -------------------------------------------------------------------------- */
/*                           ADMIN DOWNLOAD IMAGE                             */
/* -------------------------------------------------------------------------- */

export const adminDownloadImage = async (id) => {
  const token = await getBackendToken();
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/download/${id}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) throw new Error("Failed to download image");
  return res.blob();
};

/* -------------------------------------------------------------------------- */
/*                               UNLOCK IMAGE                                 */
/* -------------------------------------------------------------------------- */

export const unlockImage = async (imageId, stripeSessionId) => {
  const token = await getBackendToken();
  return new Promise((resolve, reject) => {
    const params = stripeSessionId ? { stripe_session_id: stripeSessionId } : {};
    axios
      .post(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/unlock/${imageId}`,
        null,
        {
          params,
          headers: { Authorization: `Bearer ${token}` },
        }
      )
      .then((response) => {
        revalidateTag("images");
        resolve(response.data);
      })
      .catch((err) => reject(err));
  });
};
