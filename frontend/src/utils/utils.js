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
  }, []);

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
    // Update user info
    dispatch({
      type: ActionTypes.SET_LOADING_USER,
      payload: true,
    });

    axios
      .get(`${process.env.REACT_APP_BACKEND_URL}/api/user/info`, {
        withCredentials: true,
      })
      .then((res) => {
        const user = res.data;
        if (user) {
          /* ----------------------------- User logged in ----------------------------- */

          // Update user info
          dispatch({
            type: ActionTypes.SET_USER,
            payload: user,
          });

          dispatch({
            type: ActionTypes.SET_LOADING_USER,
            payload: false,
          });
          
        } else {
          /* --------------------------- User not logged in --------------------------- */
          console.log("not logged in");
        }
      })

      /* ----------------------------- Error handling ----------------------------- */
      .catch((err) => {
        // Open snackbar
        // openAlert("error", "User info could not be loaded");
        console.log(err);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openAlert]);

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

  function calculateCredits(input) {
    // Declare credits for each service
    const priceList = {
      generate: {
        1: 1,
      },
      download: {
        false: 0,
        true: 10,
      },
      upscale: {
        0: 0,
        512: 10,
        1024: 15,
        2048: 20,
        4096: 25,
      },
    };
  
    let totalCredits = 0;
  
    Object.keys(input).forEach((service) => {
      const option = input[service];
  
      if (priceList[service] && priceList[service][option]) {
        totalCredits += priceList[service][option];
      } else {
        console.error(`Service '${service}' with option '${option}' not found in the price list.`);
      }
    });
  
    return totalCredits;
  }

  return {
    getUserInfo,
    logout,
    calculateCredits,
    openAlert,
    closeAlert,
  };
};
