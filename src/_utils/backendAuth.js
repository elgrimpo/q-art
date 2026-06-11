"use server";

import { SignJWT } from "jose";
import { getServerSession } from "next-auth";
import { authOptions } from "../app/api/auth/[...nextauth]/route";

const getKey = () => new TextEncoder().encode(process.env.BACKEND_JWT_SECRET);
const TTL_SECONDS = 5 * 60;

const sign = async (claims) => {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt(now)
    .setExpirationTime(now + TTL_SECONDS)
    .sign(getKey());
};

export const getBackendToken = async () => {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  const isGuest = !!session.user.is_guest;
  return sign({
    sub: isGuest ? session.user._id : session.user.email,
    email: session.user.email,
    is_guest: isGuest,
    scope: "user",
  });
};

export const getServiceToken = async () => {
  return sign({ scope: "service" });
};
