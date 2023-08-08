import React, {
  createContext,
  useContext,
  useReducer,
} from "react";
import { imagesReducer, initialState } from "./reducers";

const ImagesContext = createContext(null);
const ImagesDispatchContext = createContext(null);

export const ImagesProvider = ({ children }) => {
  // Use useReducer to manage the app state
  const [state, dispatch] = useReducer(imagesReducer, initialState);

  return (
    <ImagesContext.Provider value={state}>
      <ImagesDispatchContext.Provider value={dispatch}>
        {children}
      </ImagesDispatchContext.Provider>
    </ImagesContext.Provider>
  );
};

export const useImages = () => {
  return useContext(ImagesContext);
};

export const useImagesDispatch = () => {
  return useContext(ImagesDispatchContext)}
