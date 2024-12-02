import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

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
          id: Date.now().toString(),
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
    async jwt({ token, user, account }) {
      if (user) {
        // Initial sign in
        token.is_guest = user.is_guest || false;
        token.credits = user.credits;
        token.id = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      // Send properties to the client
      session.user.is_guest = token.is_guest;
      session.user.id = token.id;
      if (token.is_guest) {
        session.user.credits = token.credits;
      }
      return session;
    },

    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/auth`;

        const data = {
          name: user.name,
          email: user.email,
          auth_providers: [
            {
              provider: account.provider,
              providerId: account.providerAccountId,
            },
          ],
        };

        try {
          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });

          return response.ok;
        } catch (error) {
          console.error("Error authenticating user:", error);
          return false;
        }
      }
      // Always allow anonymous sign-ins
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
