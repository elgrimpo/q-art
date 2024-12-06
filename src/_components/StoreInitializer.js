'use client'

import { useEffect } from 'react'
import { useStore } from "../store"
import { signIn, useSession } from "next-auth/react"

export function StoreInitializer({ user, children }) {
    const { data: session } = useSession();
    
    useEffect(() => {
        if (user?.needsAnonymousAuth) {
            signIn("anonymous", { 
                callbackUrl: user.callbackUrl,
                redirect: true
            });
        } else {
            useStore.setState({ user });
        }
    }, [user]);

    // If we have a session but no user, update the store with session user
    useEffect(() => {
        if (session?.user && !user) {
            useStore.setState({ user: session.user });
        }
    }, [session, user]);

    return children;
}
