//Libraries imports
"use server";
import axios from "axios";

// App imports

/* -------------------------------------------------------------------------- */
/*                               GET IMAGE BY ID                              */
/* -------------------------------------------------------------------------- */

export const getImageById = (imageId) => {
  // API Call
  return axios
    .get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/get/${imageId}`)
    .then((response) => {
      return response.data;
    })
    .catch((error) => {
      // Handle error
      console.error(error);

      // Open alert
      openAlert("error", "Error", "Error loading image");

      return error;
    });
};
/* -------------------------------------------------------------------------- */
/*                                 GET IMAGES                                 */
/* -------------------------------------------------------------------------- */
export const getImages = async (params) => {
  "use server";
  console.log("Getimages triggered")
  const queryParams = new URLSearchParams(params).toString();

  /* -------------------------------- API Call -------------------------------- */
  try {
    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_BACKEND_URL
      }/api/images/get?${queryParams}`,
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
    console.log(images);
    return images;
  } catch (error) {
    console.error("Error fetching images:", error);
    throw error;
  }
};