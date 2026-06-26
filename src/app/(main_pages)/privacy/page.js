import { Box, Typography } from "@mui/material";

export const metadata = {
  title: "Privacy Policy | QR AI",
  description:
    "Learn how QR AI collects, uses, and protects your personal data. We use Google OAuth, Amplitude analytics, Stripe payments, and AWS S3 image storage.",
  alternates: {
    canonical: "https://www.qr-ai.co/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <Box
      sx={{
        maxWidth: "800px",
        mx: "auto",
        px: { xs: 2, md: 4 },
        py: { xs: 4, md: 8 },
        color: "#ccc",
      }}
    >
      <Typography variant="h1" sx={{ fontSize: { xs: "2rem", md: "2.5rem" }, mb: 1 }}>
        Privacy Policy
      </Typography>
      <Typography sx={{ mb: 4, color: "#888", fontSize: "0.9rem" }}>
        Last updated: June 2025
      </Typography>

      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        QR AI (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) operates the website at qr-ai.co (the &ldquo;Service&rdquo;).
        This Privacy Policy explains what information we collect, how we use it, and your rights
        regarding that information. By using the Service, you agree to the practices described here.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        1. Information We Collect
      </Typography>
      <Typography component="p" sx={{ mb: 2, lineHeight: 1.8 }}>
        <strong>Account information.</strong> If you sign in with Google, we receive your name, email
        address, and profile picture from Google OAuth. We store your email to identify your account
        and link images you generate to it.
      </Typography>
      <Typography component="p" sx={{ mb: 2, lineHeight: 1.8 }}>
        <strong>Guest sessions.</strong> If you use the Service without signing in, we assign your
        session an anonymous guest identifier (a randomly generated ID beginning with &ldquo;guest_&rdquo;).
        This ID is stored in your browser session and is used to associate images you generate during
        that session. No personally identifiable information is collected for guest users. If you later
        sign in, your guest-generated images are transferred to your account.
      </Typography>
      <Typography component="p" sx={{ mb: 2, lineHeight: 1.8 }}>
        <strong>Generated images and URLs.</strong> When you generate a QR code, we store the
        resulting image files and the URL you provided. Images are retained in your personal gallery
        until you delete them. We do not inspect or use the URLs you enter for any purpose other
        than generating your QR code.
      </Typography>
      <Typography component="p" sx={{ mb: 2, lineHeight: 1.8 }}>
        <strong>Usage data.</strong> We collect anonymized analytics events (such as page views,
        feature interactions, and generation events) to understand how the Service is used and to
        improve it.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        2. How We Use Your Information
      </Typography>
      <Typography
        component="ul"
        sx={{ pl: 3, mb: 3, "& li": { mb: 1, lineHeight: 1.8 } }}
      >
        <li>To operate and deliver the QR code generation service</li>
        <li>To associate generated images with your account and maintain your gallery</li>
        <li>To process credit purchases and manage your subscription status</li>
        <li>To improve the Service based on aggregated usage analytics</li>
        <li>To communicate with you about your account if necessary</li>
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        We do not sell, rent, or share your personal information with third parties for their own
        marketing purposes.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        3. Third-Party Services and Data Processors
      </Typography>
      <Typography component="p" sx={{ mb: 2, lineHeight: 1.8 }}>
        We rely on the following third-party services to operate QR AI. Each processes data on our
        behalf under their own privacy policies:
      </Typography>
      <Typography
        component="ul"
        sx={{ pl: 3, mb: 3, "& li": { mb: 2, lineHeight: 1.8 } }}
      >
        <li>
          <strong>Google OAuth (Google LLC)</strong> — handles sign-in authentication. When you
          choose &ldquo;Sign in with Google,&rdquo; Google authenticates your identity and shares your basic
          profile with us. Subject to Google&rsquo;s Privacy Policy.
        </li>
        <li>
          <strong>Amplitude</strong> — provides product analytics. We send anonymized event data
          (e.g., page views, feature usage) to Amplitude to understand how the Service is used.
          Amplitude may set cookies or use device identifiers. Subject to Amplitude&rsquo;s Privacy Policy.
        </li>
        <li>
          <strong>Stripe (Stripe, Inc.)</strong> — processes credit purchases and payments. When
          you purchase credits, payment details are submitted directly to Stripe; we never store
          your full card number. Subject to Stripe&rsquo;s Privacy Policy.
        </li>
        <li>
          <strong>AWS S3 (Amazon Web Services)</strong> — stores generated image files. Both the
          original AI-generated image and a watermarked version are uploaded to private S3 buckets
          in the US West (N. California) region. Subject to AWS&rsquo;s Privacy Policy.
        </li>
        <li>
          <strong>MongoDB Atlas (MongoDB, Inc.)</strong> — stores user account data and image
          metadata (URLs, timestamps, credit balances). Data is hosted on Atlas infrastructure in
          the United States. Subject to MongoDB&rsquo;s Privacy Policy.
        </li>
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        4. Cookies and Local Storage
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        We use session cookies to maintain your authenticated state. Amplitude may set analytics
        cookies to track usage across sessions. We do not currently use advertising cookies. You can
        disable cookies in your browser settings; note that this may prevent some Service features
        from working correctly.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        5. Data Retention
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        Account data is retained as long as your account is active. Generated images are stored until
        you delete them from your gallery. Guest session data (anonymous ID and associated images) is
        retained for 30 days and then deleted automatically. You may request deletion of your account
        and associated data at any time by contacting us.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        6. Your Rights
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        Depending on your location, you may have rights to access, correct, or delete your personal
        data, or to restrict how we process it. To exercise these rights, please contact us at the
        address below. We will respond to verifiable requests within 30 days.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        7. Children&rsquo;s Privacy
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        The Service is not directed to children under the age of 13. We do not knowingly collect
        personal information from children. If you believe a child has provided personal information
        through our Service, please contact us and we will delete it promptly.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        8. Changes to This Policy
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        We may update this Privacy Policy from time to time. Material changes will be noted by
        updating the &ldquo;Last updated&rdquo; date at the top of this page. Continued use of the Service
        after changes constitutes acceptance of the revised policy.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        9. Contact
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        For privacy-related questions or data requests, please contact us at:{" "}
        <strong>support@qr-ai.co</strong>
      </Typography>

      <Typography
        component="p"
        sx={{ mt: 6, pt: 3, borderTop: "1px solid #333", color: "#666", fontSize: "0.85rem", lineHeight: 1.7 }}
      >
        Note: This policy is provided for informational purposes. We recommend consulting a legal
        professional before finalizing privacy policies for commercial use.
      </Typography>
    </Box>
  );
}
