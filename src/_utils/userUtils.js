'use server'
import { cookies } from "next/headers";
import { getServerSession } from "next-auth";
import { useStore } from "../store";
import { revalidateTag } from 'next/cache'
import { authOptions } from "../app/api/auth/[...nextauth]/route";

const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
};

export const getUserInfo = async () => {
  try {
    console.log('getUserInfo: Starting to fetch session');
    const session = await getServerSession(authOptions);
    // console.log('getUserInfo: Session received:', session);
    
    // Check if session exists
    if (!session?.user) {
      // console.log('getUserInfo: No session found, returning needsAnonymousAuth');
      return {
        needsAnonymousAuth: true,
        callbackUrl: getBaseUrl()
      };
    }

    // For guest sessions, return the session user data
    if (session.user.is_guest) {
      console.log('getUserInfo: Guest session found:', session.user);
      useStore.setState({ user: session.user });
      return session.user;
    }

    // For logged-in users, fetch user info from database
    if (!session.user.email) {
      // console.log('getUserInfo: No email in session, returning needsAnonymousAuth');
      return {
        needsAnonymousAuth: true,
        callbackUrl: getBaseUrl()
      };
    }

    // console.log('getUserInfo: Fetching user info from backend for email:', session.user.email);
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/info?email=${encodeURIComponent(session.user.email)}`,
      {
        method: "GET",
        headers: { Cookie: cookies().toString() },
        credentials: "include",
        next: { revalidate: 3600, tags: ["user"] },
      }
    );

    if (response.ok) {
      const user = await response.json();
      // console.log('getUserInfo: User info received from backend:', user);
      useStore.setState({ user: user });
      return user;
    } else {
      console.error('getUserInfo: Failed to fetch user info from backend:', response.status);
      throw new Error("User info could not be loaded");
    }
  } catch (error) {
    console.error("Error in getUserInfo:", error);
    throw error;
  }
};

export const updateGuestCredits = async () => {
  
}

export const revalidateUser = async () => {
  'use server'
  console.log('Revalidating user data');
  revalidateTag('user')
}
