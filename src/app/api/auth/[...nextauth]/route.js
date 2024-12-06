import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { getServerSession } from "next-auth/next"

// Store guest ID during the auth flow

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
    CredentialsProvider({
      id: "anonymous",
      name: "Anonymous",
      credentials: {},
      async authorize() {
        const user = {
          _id: `guest_${Date.now()}`,
          name: "Guest User",
          email: `guest_${Date.now()}@anonymous.com`,
          is_guest: true,
          credits: 1,
        };
        return user;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      
      // Handle initial sign in with credentials (guest)
      if (user?.is_guest) {
        token.is_guest = true;
        token.credits = user?.credits;
        token._id = user?._id;
      }

      // Handle session update (this handles the useSession().update() calls)
      if (trigger === "update" && session?.user) {
        // Merge the updated user data into the token
        token = {
          ...token,
          ...session.user,
          // Ensure these properties are preserved
          is_guest: token.is_guest,
          _id: token._id
        };
      }

      // Handle Google sign in
      if (account?.provider === "google") {
        token.is_guest = false;
        delete token.credits;
      }

      return token;
    },

    async session({ session, token }) {
      
      // Send properties to the client
      session.user = {
        ...session.user,
        is_guest: token.is_guest,
        _id: token._id,
        credits: token.is_guest ? token.credits : undefined
      };
      
      return session;
    },

    async signIn({ user, account }) {
      const session = await getServerSession(authOptions)
      if (account?.provider === "google") {
        const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/auth`;
        

        const userData = {
          name: user.name,
          email: user.email,
          auth_providers: [
            {
              provider: account.provider,
              providerId: account.providerAccountId,
            },
          ],
          guest_id: session?.user._id,
        };

        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
            },
            body: JSON.stringify(userData),
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error("Failed to authenticate user:", errorText);
            return false;
          }

          const responseData = await response.json();

          return true;
        } catch (error) {
          console.error("Error authenticating user:", error);
          return false;
        }
      }

      if (user?.is_guest) {
      }

      return true;
    },
  },

  pages: {
    signIn: '/api/auth/signin',
  },

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
