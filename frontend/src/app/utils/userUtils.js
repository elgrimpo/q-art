import "server-only";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";

export const getUserInfo = async () => {
  try {
    // Retrieve the user session
    const session = await getServerSession();

    // If session doesn't exist, return an empty object
    if (!session) {
      console.log("Session does not exist");
      return {};
    }

    // Execute the fetch function with the user's email as a query parameter
    const response = await fetch(`http://localhost:8000/api/user/info?email=${encodeURIComponent(session.user.email)}`, {
      method: "GET",
      headers: { Cookie: cookies().toString() },
      credentials: "include",
      next: { revalidate: 3600 }
    });

    // Handle response from the API
    if (response.ok) {
      const user = await response.json();
      // console.log("User found:", user);
      return user || {}; // Return user object if found, otherwise return an empty object
    } else {
      // console.error("User info could not be loaded");
      throw new Error("User info could not be loaded");
    }
  } catch (error) {
    // console.error("Error while fetching user info:", error);
    throw error; // Rethrow the error for handling in the calling function
  }
};