import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function isAdminEmail(email) {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function GET(request, { params }) {
  const session = await getServerSession(authOptions);
  if (!isAdminEmail(session?.user?.email)) {
    return new Response("Forbidden", { status: 403 });
  }

  const { imageId } = params;

  // Fetch image doc to get the watermarked URL (public endpoint, no auth needed)
  const imageRes = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/images/get/${imageId}`
  );
  if (!imageRes.ok) {
    return new Response("Image not found", { status: 404 });
  }
  const image = await imageRes.json();

  if (!image.watermarked_image_url) {
    return new Response("No watermarked image available", { status: 404 });
  }

  // Fetch from S3 server-side (no browser CORS restriction here)
  const s3Res = await fetch(image.watermarked_image_url);
  if (!s3Res.ok) {
    return new Response("Failed to fetch image", { status: 502 });
  }

  return new Response(s3Res.body, {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="QR-art-${imageId}-watermarked.png"`,
    },
  });
}
