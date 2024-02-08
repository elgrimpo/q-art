'use client'

import { useStore } from "@/store"

export function StoreInitializer({ user, children }) {
    useStore.setState({ 
      user,
      // ...
    })

    return children
  }