//Libraries imports
'use server'
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
  
