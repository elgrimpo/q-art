'use client'

import { useEffect } from 'react'
import { useStore } from "../store"

export function StoreInitializer({ user, children }) {
    console.log('StoreInitializer: Received user:', user);
    
    useEffect(() => {
        console.log('StoreInitializer useEffect: Setting user in store');
        useStore.setState({ user });
    }, [user]);

    return children;
}
