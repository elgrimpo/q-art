import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

// Store guest ID during the auth flow
let pendingGuestId = null;

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
      // On initial sign in with credentials (guest)
      if (user?.is_guest) {
        token.is_guest = true;
        token.credits = user.credits;
        token._id = user._id;
        // Store the guest ID when guest signs in
        pendingGuestId = user._id;
        console.log('JWT callback - New guest session, storing ID:', pendingGuestId);
      }

      // On Google sign in, preserve the guest ID but update other properties
      if (account?.provider === "google") {
        console.log('JWT callback - Google sign in with pending guest ID:', pendingGuestId);
        token.is_guest = false;
        delete token.credits;
        // Don't clear pendingGuestId here, let it persist until after signIn callback
      }

      return token;
    },

    async session({ session, token }) {
      // Send properties to the client
      session.user.is_guest = token.is_guest;
      session.user._id = token._id;
      if (token.is_guest) {
        session.user.credits = token.credits;
      }
      return session;
    },

    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/auth`;
        
        console.log('SignIn callback - Using guest ID:', pendingGuestId);

        // Create the user object with guest_id included
        const userData = {
          name: user.name,
          email: user.email,
          auth_providers: [
            {
              provider: account.provider,
              providerId: account.providerAccountId,
            },
          ],
          guest_id: pendingGuestId,  // Include guest_id in the user object
        };

        console.log('SignIn callback - Request body:', JSON.stringify(userData));

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
          console.log('SignIn callback - Authentication successful:', responseData);

          // Only clear pendingGuestId after successful authentication
          pendingGuestId = null;
          return true;
        } catch (error) {
          console.error("Error authenticating user:", error);
          // Don't clear pendingGuestId on error to allow retry
          return false;
        }
      }

      // For guest sign in
      if (user?.is_guest) {
        pendingGuestId = user._id;
        console.log('SignIn callback - New guest sign in, storing ID:', pendingGuestId);
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
