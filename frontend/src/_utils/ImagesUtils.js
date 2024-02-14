"use server";
//Libraries imports

import axios from "axios";
import { notFound } from "next/navigation";

// App imports

/* -------------------------------------------------------------------------- */
/*                               GET IMAGE BY ID                              */
/* -------------------------------------------------------------------------- */

export const getImageById = (imageId) => {
  return axios
    .get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/get/${imageId}`)
    .then((response) => {
      
      return response.data;
    })
    .catch((error) => {
      if (error.response.status === 404) {
        notFound();
      }
      return error;
    });
};
/* -------------------------------------------------------------------------- */
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
        // next: { revalidate: 3600 },
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

export const generateImage = (generateFormValues, user) => {
  return new Promise((resolve, reject) => {
    const queryParams = new URLSearchParams(generateFormValues);
    const url = `http://localhost:8000/api/generate/?user_id=${
      user._id
    }&${queryParams.toString()}`;

    fetch(url, {
      method: "GET",
      credentials: "include",
    })
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        // Handle Insufficient Credits
        if (data.detail && data.detail === "Insufficient credits") {
          reject(new Error("InsufficientCredits"));
        } else {
          resolve(data); // Resolve with the image data
        }
      })
      .catch((error) => {
        reject(error); // Reject with the error
      });
  });
};

/* -------------------------------------------------------------------------- */
/*                                DELETE IMAGE                                */
/* -------------------------------------------------------------------------- */

export const deleteImage = (id) => {
  return new Promise((resolve, reject) => {
    axios
      .delete(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/delete/${id}`)
      .then(() => {
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
  return new Promise((resolve, reject) => {
    axios.put(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/like/${imageId}`,
      null,
      {
        params: { user_id: userId },
      }
    )
      .then(() => {
        resolve(true);
      })
      .catch((err) => {
        reject(err);
      });
  });
};