//Libraries imports
import axios from "axios";
import { useCallback } from "react";

// App imports
import { ActionTypes } from "../context/reducers";
import { useImagesDispatch } from "../context/AppProvider";

export const useUtils = () => {
  /* ---------------------------- DECLARE VARIABLES --------------------------- */

  const dispatch = useImagesDispatch();

   /* -------------------------------------------------------------------------- */
  /*                                OPEN SNACKBAR                               */
  /* -------------------------------------------------------------------------- */

  const openAlert = useCallback((severity, message) => {
    // Set Snackbar open with severity and message
    dispatch({
      type: ActionTypes.OPEN_ALERT,
      payload: {
        severity: severity,
        message: message,
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* -------------------------------------------------------------------------- */
  /*                               CLOSE SNACKBAR                               */
  /* -------------------------------------------------------------------------- */

  const closeAlert = () => {
    // Set Snackbar to closed
    dispatch({
      type: ActionTypes.CLOSE_ALERT,
    });
  };

  /* -------------------------------------------------------------------------- */
  /*                            GET USER FROM SESSION                           */
  /* -------------------------------------------------------------------------- */
  const getUserInfo = useCallback(() => {
    axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/api/user/info`, {
        withCredentials: true,
      })
      .then((res) => {
        const user = JSON.parse(res.data);
        console.log(user)
        if (user) {
          /* ----------------------------- User logged in ----------------------------- */

          // Update user info
          dispatch({
            type: ActionTypes.SET_USER,
            payload: user,
          });
        } else {
          /* --------------------------- User not logged in --------------------------- */
          console.log("not logged in");
        }
      })

      /* ----------------------------- Error handling ----------------------------- */
      .catch((err) => {
        // Open snackbar
        openAlert("error", "User info could not be loaded");
        console.log(err);
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
  },[openAlert]);

  /* -------------------------------------------------------------------------- */
  /*                                   LOGOUT                                   */
  /* -------------------------------------------------------------------------- */

  const logout = async () => {
    axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/api/logout`, {
        withCredentials: true,
      })
      .then(window.location.reload())
      .catch((err) => {
        // Open Snackbar
        openAlert("error", "User info could not be loaded");
        console.log(err);
      });
  };


  /* -------------------------------------------------------------------------- */
  /*                              CALCULATE CREDITS                             */
  /* -------------------------------------------------------------------------- */

  function calculateCredits(service, option) {
    // Declare credits for each service
    const priceList = {
      imageQuality: {
        low: 1,
        medium: 2,
        high: 3,
      },
      upscaleResize: {
        2: 2,
      },
    };

    // Check if the service exists in the priceList
    if (priceList[service]) {
      // Check if the option exists within the service
      if (priceList[service][option]) {
        // Return credits needed for service / option
        return priceList[service][option];
      } else {
        console.error(`Option '${option}' not found in service '${service}'.`);
      }
    } else {
      console.error(`Service '${service}' not found in the price list.`);
    }
  }

  return {
    getUserInfo,
    logout,
    calculateCredits,
    openAlert,
    closeAlert,
  };
};
