//Libraries imports
import axios from "axios";

// App imports
import { ActionTypes } from "../context/reducers";
import { useImages, useImagesDispatch } from "../context/AppProvider";

export const useUtils = () => {
  const { userImages, communityImages, userImagesPage, communityImagesPage } =
    useImages();
  const dispatch = useImagesDispatch();

  // Check if user session exists
  const getUserInfo = async () => {
    axios
      .get("http://localhost:8000/user/info", { withCredentials: true })
      .then((res) => {
        if (res.data._id) {
          // User logged in
          dispatch({
            type: ActionTypes.SET_USER,
            payload: res.data,
          });
        } else {
          // User not logged in
          console.log("not logged in");
        }
      })
      .catch((err) => {
        openAlert('error', 'User info could not be loaded')
        console.log(err);
      });
  }

  // Logout
  const logout = async () => {
    axios
      .get("http://localhost:8000/logout", { withCredentials: true })
      .then(window.location.reload())
      .catch((err) => {
        openAlert('error', 'User info could not be loaded')
        console.log(err);
      });
  };



  const openAlert = (severity, message) => {
    dispatch({
      type: ActionTypes.OPEN_ALERT,
      payload: {
        severity: severity,
        message: message
      }
    });
  }
  
  const closeAlert = () => {
    dispatch({
      type: ActionTypes.CLOSE_ALERT
    })
  }

  return {
    getUserInfo,
    logout,
    openAlert,
    closeAlert
  };
};
