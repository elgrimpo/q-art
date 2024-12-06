"use server";
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { useStore } from "../store";
import { revalidateTag } from "next/cache";
import { authOptions } from "../app/api/auth/[...nextauth]/route";

const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_URL || "http://localhost:3000";
};

export const getUserInfo = async () => {
  try {
    const session = await getServerSession(authOptions);

    // Check if session exists
    if (!session?.user) {
      return {
        needsAnonymousAuth: true,
        callbackUrl: getBaseUrl(),
      };
    }

    // For guest sessions, return the session user data
    if (session.user.is_guest) {
      useStore.setState({ user: session.user });
      return session.user;
    }

    // For logged-in users, fetch user info from database
    if (!session.user.email) {

      return {
        needsAnonymousAuth: true,
        callbackUrl: getBaseUrl(),
      };
    }

    const response = await fetch(
      `${
        process.env.NEXT_PUBLIC_BACKEND_URL
      }/api/user/info?email=${encodeURIComponent(session.user.email)}`,
      {
        method: "GET",
        headers: { Cookie: cookies().toString() },
        credentials: "include",
        next: { revalidate: 3600, tags: ["user"] },
      }
    );

    if (response.ok) {
      const user = await response.json();
      useStore.setState({ user: user });
      return user;
    } else {
      console.error(
        "getUserInfo: Failed to fetch user info from backend:",
        response.status
      );
      throw new Error("User info could not be loaded");
    }
  } catch (error) {
    console.error("Error in getUserInfo:", error);
    throw error;
  }
};

export const revalidateUser = async () => {
  "use server";
  revalidateTag("user");
};
