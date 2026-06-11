export default function manifest() {
  return {
    name: "QR AI — AI QR Code Art Generator",
    short_name: "QR AI",
    description: "Transform any URL into AI-generated QR code artwork instantly.",
    start_url: "/generate",
    display: "standalone",
    background_color: "#161616",
    theme_color: "#161616",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable",
      },
    ],
  };
}
