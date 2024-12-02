'use client'

import { useEffect } from 'react'
import { useStore } from "../store"
import { signIn, useSession } from "next-auth/react"

export function StoreInitializer({ user, children }) {
    // console.log('StoreInitializer: Received user:', user);
    const { data: session } = useSession();
    
    useEffect(() => {
        // console.log('StoreInitializer useEffect: Setting user in store');
        if (user?.needsAnonymousAuth) {
            // console.log('StoreInitializer: Detected need for anonymous auth');
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
            // console.log('StoreInitializer: Using session user:', session.user);
            useStore.setState({ user: session.user });
        }
    }, [session, user]);

    return children;
}
