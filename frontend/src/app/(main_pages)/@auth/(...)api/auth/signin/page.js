"use client";
import SignIn from "@/app/api/auth/signin/signIn";
import { Dialog } from "@mui/material";
import { useRouter } from "next/navigation";

export default function LoginModal(props) {
  const router = useRouter();

  return (
    <Dialog
      open={true}
      onClose={() => router.back()}
      aria-labelledby="signin-dialog-title"
      aria-describedby="signin-dialog-description"
    >
      <SignIn />
    </Dialog>
  );
}
