"use server";

import axios from "axios";
import { getBackendToken } from "./backendAuth";

export const createCheckout = async (item) => {
  const token = await getBackendToken();
  const response = await axios.post(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/checkout`,
    null,
    {
      params: {
        stripeId: item.stripeId,
        credit_amount: item.creditAmount,
      },
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data?.session_url ?? null;
};
