"use client";

// Libraries imports
import React from "react";
import Link from "next/link";
import { Button } from "@mui/material";
import { useStore } from "@/store";
// App import

/* -------------------------------------------------------------------------- */
/*                               COMPONENT START                              */
/* -------------------------------------------------------------------------- */

export default function Account(props) {
  /* ---------------------------- DECLARE VARIABLE ---------------------------- */

  // User
  const user = useStore.getState().user;


  /* -------------------------------------------------------------------------- */
  /*                              COMPONENT RENDER                              */
  /* -------------------------------------------------------------------------- */
  return (
    <div>
      {/* ACCOUNT */}
      {user?._id ? (
        <Link
          href="http://localhost:3000/api/auth/signout"
          passHref
          legacyBehavior
        >
          <Button>Log out</Button>
        </Link>
      ) : (
        //   TODO: Load account menut
        // <AccountMenu handleLogout={logout} />

        <div>
          <Link
            href="http://localhost:3000/api/auth/signin"
            passHref
            legacyBehavior
          >
            <Button>Login</Button>
          </Link>
        </div>
      )}
    </div>
  );
}