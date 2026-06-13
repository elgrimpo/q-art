"use server";

import axios from "axios";
import { getBackendToken } from "./backendAuth";

export const createUnlockCheckout = async (imageId) => {
  const token = await getBackendToken();
  const response = await axios.post(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/checkout/unlock`,
    null,
    {
      params: { image_id: imageId },
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data?.session_url ?? null;
};
