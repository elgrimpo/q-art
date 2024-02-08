//Libraries imports
import axios from "axios";
import { useCallback } from "react";

// App imports
import { ActionTypes } from "@/_context/reducers";
import { useImagesDispatch } from "@/_context/AppProvider";

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
  /*                                   LOGOUT                                   */
  /* -------------------------------------------------------------------------- */

  const logout = async () => {
    axios
      .get(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/logout`, {
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
        console.error(
          `Service '${service}' with option '${option}' not found in the price list.`
        );
      }
    });

    return totalCredits;
  }

  return {
    logout,
    calculateCredits,
    openAlert,
    closeAlert,
  };
};
