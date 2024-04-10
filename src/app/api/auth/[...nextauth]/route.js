import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {

  url: process.env.NEXTAUTH_URL,

  secret: process.env.NEXTAUTH_SECRET,
  // Configure one or more authentication providers
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          prompt: "select_account",
        }}
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/user/auth`;

      const data = {
        name: user.name,
        email: user.email,
        auth_providers: [{
          provider: account.provider,
          providerId: account.providerAccountId,
        }],
      };

      try {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        });

        if (response.ok) {
          return true;
        } else {
          console.error("Error authenticating user:", error);
          return false; 
        }
      } catch (error) {
        console.error("Error authenticating user:", error);
        return false; 
      }
    },
  },
};
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
