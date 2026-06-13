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
  const queryParams = new URLSearchParams(params).toString();

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
    const queryParams = new URLSearchParams(generateFormValues);
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
