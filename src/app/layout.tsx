import { cvData } from "@/content/cv.data";
import { resolveSiteUrl } from "@/lib/site-url";
import "./globals.css";

/** Build-time `SITE_URL` guard (BR-016, AC-011.6). */
function assertSiteUrl(): void {
  const raw = process.env.SITE_URL;
  if (!raw) return; // local dev fallback handled in resolveSiteUrl
  if (!/^https:\/\/[a-z0-9.-]+$/.test(raw.replace(/\/+$/, ""))) {
    throw new Error(
      `E_META: SITE_URL must be an https origin without a path (got "${raw}")`,
    );
  }
}

assertSiteUrl();

const siteUrl = resolveSiteUrl();

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: cvData.site.title,
  description: cvData.site.description,
  icons: {
    icon: [
      {
        url: "/assets/avatar-light.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/assets/avatar-dark.png",
        media: "(prefers-color-scheme: dark)",
      },
    ],
    apple: "/assets/avatar-light.png",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: cvData.site.title,
    description: cvData.site.description,
    url: "/",
    type: "profile",
    images: [
      {
        url: cvData.site.ogImage,
        width: 1200,
        height: 630,
        alt: `${cvData.profile.fullName} — ${cvData.profile.headline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: cvData.site.title,
    description: cvData.site.description,
    images: [cvData.site.ogImage],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile, contacts, education, skills, languages } = cvData;

  const email = contacts.find((c) => c.kind === "email");
  const linkedin = contacts.find((c) => c.kind === "linkedin");

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.fullName,
    jobTitle: profile.headline,
    address: profile.location,
    email: email?.label,
    sameAs: linkedin?.href ? [linkedin.href] : undefined,
    alumniOf: education.map((e) => e.institution),
    knowsLanguage: languages.map((l) => l.name),
    knowsAbout: skills.filter((s) => s.category === "hard").map((s) => s.name),
  };

  return (
    <html lang="en">
      <head>
        {/* Kontrol native (scrollbar, backdrop <dialog>) ikut mode pilihan
            pengguna; hook [data-theme] hanya untuk uji (TECH-SPEC §5.6). */}
        <meta name="color-scheme" content="light dark" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
        />
        <script defer src="/enhance.js" />
      </head>
      <body>{children}</body>
    </html>
  );
}
