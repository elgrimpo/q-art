'use server'
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { useStore } from "@/store";

export const getUserInfo = async () => {
  'use server'
  try {
    // Retrieve the user session
    const session = await getServerSession();

    // If session doesn't exist, return an empty object
    if (!session) {
      console.log("Session does not exist");
      return {};
    }

    // Fetch User
    const response = await fetch(`http://localhost:8000/api/user/info?email=${encodeURIComponent(session.user.email)}`, {
      method: "GET",
      headers: { Cookie: cookies().toString() },
      credentials: "include",
      next: { revalidate: 3600, tags: ["images"] },
    });

    // Handle response
    if (response.ok) {
      const user = await response.json();
      useStore.setState({ user: user });


      return user || {}; // Return user object if found, otherwise return an empty object
    } else {
      throw new Error("User info could not be loaded");
    }
  } catch (error) {
    throw error;
  }
};