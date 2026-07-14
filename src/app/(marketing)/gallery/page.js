import { redirect } from "next/navigation";

// /gallery has been retired in favor of /explore. A permanent (308) redirect is
// also configured in next.config.mjs, which supersedes this route; this stub is
// a safety net that keeps /gallery pointing to /explore if that config changes.
export default function GalleryRedirect() {
  redirect("/explore");
}
