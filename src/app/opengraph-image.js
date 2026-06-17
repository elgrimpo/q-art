import { ImageResponse } from 'next/og';

// Site-wide default Open Graph / Twitter image. Lives at the app root so every
// route inherits it unless a segment overrides it. Combined with `metadataBase`
// in the root layout, Next.js emits an absolute https://www.qr-ai.co/... URL.
export const runtime = 'nodejs';
export const alt = 'QR AI — Transform any URL into AI-generated QR code artwork';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  const exampleImageUrl =
    'https://qrartimages.s3.us-west-1.amazonaws.com/654f3d47bef0549f910f70ca.png';

  return new ImageResponse(
    (
      <div
        style={{
          background: '#161616',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '60px 80px',
        }}
      >
        {/* Left: branding */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, paddingRight: 60 }}>
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              color: '#A5FFC3',
              lineHeight: 1,
              marginBottom: 24,
              letterSpacing: '-2px',
            }}
          >
            QR AI
          </div>
          <div
            style={{
              fontSize: 34,
              color: '#ffffff',
              lineHeight: 1.35,
              marginBottom: 32,
            }}
          >
            Transform any URL into AI-generated QR code artwork
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                background: '#A5FFC3',
                color: '#161616',
                fontSize: 22,
                fontWeight: 700,
                padding: '12px 28px',
                borderRadius: 8,
              }}
            >
              Free to try
            </div>
            <div style={{ fontSize: 22, color: '#888' }}>qr-ai.co</div>
          </div>
        </div>

        {/* Right: example QR art image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={exampleImageUrl}
          alt="Example AI QR code artwork"
          width={420}
          height={420}
          style={{ borderRadius: 16, objectFit: 'cover' }}
        />
      </div>
    ),
    { ...size }
  );
}
