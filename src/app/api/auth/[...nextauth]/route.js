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
        console.log('authorize: Creating new guest user:', JSON.stringify(user, null, 2));
        return user;
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user, account, trigger, session }) {
      console.log('jwt callback: Starting with trigger:', trigger);
      console.log('jwt callback: Current token:', JSON.stringify(token, null, 2));
      console.log('jwt callback: Session data:', JSON.stringify(session, null, 2));
      console.log('jwt callback: User data:', JSON.stringify(user, null, 2));
      
      // Handle initial sign in with credentials (guest)
      if (user?.is_guest) {
        console.log('jwt callback: Setting up new guest token');
        token.is_guest = true;
        token.credits = user?.credits;
        token._id = user?._id;
      }
      console.log("Is not guest")

      // Handle session update (this handles the useSession().update() calls)
      if (trigger === "update" && session?.user) {
        console.log('jwt callback: Handling session update with data:', JSON.stringify(session, null, 2));
        // Merge the updated user data into the token
        token = {
          ...token,
          ...session.user,
          // Ensure these properties are preserved
          is_guest: token.is_guest,
          _id: token._id
        };
        console.log('jwt callback: Updated token:', JSON.stringify(token, null, 2));
      }

      // Handle Google sign in
      if (account?.provider === "google") {
        console.log('jwt callback: Google sign in with pending guest ID:', session?.user?._id);
        token.is_guest = false;
        delete token.credits;
      }

      return token;
    },

    async session({ session, token }) {
      console.log('session callback: Starting');
      console.log('session callback: Token:', JSON.stringify(token, null, 2));
      
      // Send properties to the client
      session.user = {
        ...session.user,
        is_guest: token.is_guest,
        _id: token._id,
        credits: token.is_guest ? token.credits : undefined
      };
      
      console.log('session callback: Returning session:', JSON.stringify(session, null, 2));
      return session;
    },

    async signIn({ user, account }) {
      const session = await getServerSession(authOptions)
      console.log("USER")
      console.log(session)
      if (account?.provider === "google") {
        const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/auth`;
        
        console.log('signIn callback: Using guest ID:', session?.user._id);

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
          console.log('signIn callback: Authentication successful:', JSON.stringify(responseData, null, 2));

          return true;
        } catch (error) {
          console.error("Error authenticating user:", error);
          return false;
        }
      }

      if (user?.is_guest) {
        console.log('signIn callback: New guest sign in, storing ID:', session?.user._id);
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
