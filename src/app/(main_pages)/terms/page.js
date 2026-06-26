import { Box, Typography } from "@mui/material";

export const metadata = {
  title: "Terms of Service | QR AI",
  description:
    "Read the Terms of Service for QR AI. Understand your rights, permitted uses, credit system, and limitations when using our AI QR code art generator.",
  alternates: {
    canonical: "https://www.qr-ai.co/terms",
  },
};

export default function TermsPage() {
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
        Terms of Service
      </Typography>
      <Typography sx={{ mb: 4, color: "#888", fontSize: "0.9rem" }}>
        Last updated: June 2025
      </Typography>

      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the QR AI website and service located
        at qr-ai.co (the &ldquo;Service&rdquo;), operated by QR AI (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;). By accessing or
        using the Service, you agree to be bound by these Terms. If you do not agree, please do not
        use the Service.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        1. Description of the Service
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        QR AI is an AI-powered QR code art generator. You provide a URL and an art style preference;
        our AI pipeline generates a stylized, scannable QR code image. The Service is provided via a
        credit-based system. Free credits are included at registration. Additional credits can be
        purchased.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        2. Eligibility
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        You must be at least 13 years of age to use the Service. If you are under 18, you must have
        parental or guardian consent. By using the Service, you represent and warrant that you meet
        these eligibility requirements.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        3. Accounts and Guest Access
      </Typography>
      <Typography component="p" sx={{ mb: 2, lineHeight: 1.8 }}>
        You may use the Service as a guest (anonymous session) or by signing in with a Google
        account. Guest sessions are temporary; images and credits associated with a guest session
        may be transferred to your account upon sign-in, but guest data is not guaranteed to persist
        indefinitely.
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        You are responsible for maintaining the security of your account. We are not liable for any
        loss resulting from unauthorized access to your account.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        4. Credits and Payments
      </Typography>
      <Typography component="p" sx={{ mb: 2, lineHeight: 1.8 }}>
        Credits are consumed when you generate images, download originals, or upscale images.
        Credit costs are displayed in the Service before each action. Credits have no cash value and
        are non-refundable except as required by applicable law.
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        Payments are processed by Stripe. By purchasing credits, you agree to Stripe&rsquo;s terms of
        service. We do not store your payment card details. All prices are in US dollars unless
        otherwise stated. Purchased credits do not expire, but may be forfeited upon account
        termination for cause.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        5. Acceptable Use
      </Typography>
      <Typography component="p" sx={{ mb: 2, lineHeight: 1.8 }}>
        You may use the Service for lawful personal and commercial purposes. You agree not to:
      </Typography>
      <Typography
        component="ul"
        sx={{ pl: 3, mb: 3, "& li": { mb: 1, lineHeight: 1.8 } }}
      >
        <li>Generate QR codes that link to illegal, harmful, or fraudulent content</li>
        <li>Use the Service to harass, defraud, or harm others</li>
        <li>Attempt to reverse-engineer, scrape, or abuse the Service&rsquo;s infrastructure</li>
        <li>Circumvent any rate limiting, access controls, or credit system mechanisms</li>
        <li>Use automated tools or scripts to generate images in bulk without prior written permission</li>
        <li>Impersonate any person or entity or misrepresent your affiliation with any person or entity</li>
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        We reserve the right to suspend or terminate access for violations of these rules without
        prior notice.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        6. Intellectual Property and Generated Images
      </Typography>
      <Typography component="p" sx={{ mb: 2, lineHeight: 1.8 }}>
        You retain ownership of the URLs and prompts you submit. You are granted a non-exclusive,
        worldwide license to use the images generated by the Service for personal and commercial
        purposes, subject to these Terms.
      </Typography>
      <Typography component="p" sx={{ mb: 2, lineHeight: 1.8 }}>
        By using the Service, you grant us a limited license to store and display your generated
        images as necessary to operate the Service (e.g., showing images in your gallery). We do
        not share your generated images publicly without your consent.
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        The QR AI name, logo, and Service design are our intellectual property. You may not use them
        without our prior written permission.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        7. AI-Generated Content Disclaimer
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        Images are generated by AI models (Stable Diffusion with ControlNet). Outputs are
        non-deterministic and may vary. We make no guarantees about the artistic quality, style
        consistency, or similarity of outputs to any specific reference. While we design the
        pipeline to produce scannable QR codes, we do not guarantee that every generated image will
        be scannable by all QR readers in all conditions. You are responsible for testing
        scannability before publishing.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        8. Disclaimer of Warranties
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND,
        EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR
        A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE WILL BE
        UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        9. Limitation of Liability
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        TO THE FULLEST EXTENT PERMITTED BY LAW, WE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
        SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE, EVEN IF
        ADVISED OF THE POSSIBILITY OF SUCH DAMAGES. OUR TOTAL LIABILITY FOR ANY CLAIM ARISING FROM
        THESE TERMS OR YOUR USE OF THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12
        MONTHS PRECEDING THE CLAIM.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        10. Termination
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        We may terminate or suspend your access to the Service at any time, with or without cause,
        with or without notice. Upon termination, your right to use the Service ceases immediately.
        Provisions of these Terms that by their nature should survive termination will survive
        (including intellectual property provisions, disclaimers, and limitations of liability).
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        11. Changes to These Terms
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        We reserve the right to modify these Terms at any time. We will indicate changes by updating
        the &ldquo;Last updated&rdquo; date. Your continued use of the Service after changes are posted
        constitutes acceptance of the revised Terms.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        12. Governing Law
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        These Terms are governed by the laws of the United States and the State of California,
        without regard to conflict-of-law principles. Any disputes will be resolved in the courts
        located in California.
      </Typography>

      <Typography variant="h2" color="primary" sx={{ fontSize: "1.4rem", mt: 4, mb: 1 }}>
        13. Contact
      </Typography>
      <Typography component="p" sx={{ mb: 3, lineHeight: 1.8 }}>
        Questions about these Terms? Contact us at: <strong>support@qr-ai.co</strong>
      </Typography>

      <Typography
        component="p"
        sx={{ mt: 6, pt: 3, borderTop: "1px solid #333", color: "#666", fontSize: "0.85rem", lineHeight: 1.7 }}
      >
        Note: These Terms are provided as a starting point. We recommend consulting a legal
        professional before finalizing terms of service for commercial use.
      </Typography>
    </Box>
  );
}
