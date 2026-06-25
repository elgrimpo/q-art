"use server";
//Libraries imports

import axios from "axios";
import { notFound } from "next/navigation";
import { revalidateTag } from 'next/cache'
import { getBackendToken } from "./backendAuth";
import { sliderToQrWeight } from "./qrWeight";


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
/*                               GENERATE IMAGE                               */
/* -------------------------------------------------------------------------- */

export const generateImage = async (generateFormValues, user) => {
  const token = await getBackendToken();
  return new Promise((resolve, reject) => {
    // The slider lives on a -3..+3 UI scale; the backend only accepts qr_weight
    // in [0, 1]. Translate before sending so the request passes validation.
    // loras is an array of objects, which URLSearchParams can't serialize — send
    // it as a single JSON string param (style_loras) the backend decodes.
    const { loras, ...rest } = generateFormValues;
    const payload = {
      ...rest,
      qr_weight: sliderToQrWeight(generateFormValues.qr_weight),
      style_loras: JSON.stringify(loras ?? []),
    };
    const queryParams = new URLSearchParams(payload);
    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/generate/?${queryParams.toString()}`;

    fetch(url, {
      method: "GET",
      credentials: "include",
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((data) => {
            const detail = data?.detail || "GenerationFailed";
            throw new Error(
              detail === "Insufficient credits" ? "InsufficientCredits" : "GenerationFailed"
            );
          });
        }
        return response.json();
      })
      .then((data) => {
        revalidateTag('images')
        revalidateTag('user')
        resolve(data);
      })
      .catch((error) => {
        reject(error);
      });
  });
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
