import type { Metadata } from "next";
import "./globals.css";
import { PortalBackground } from "@/components/PortalBackground";
import { getLocale } from "@/lib/i18n.server";
import { dir } from "@/lib/i18n";

/**
 * Runs before paint, so a manual theme choice is applied to <html> before the
 * first frame. Without it the page renders in the OS theme and then jumps to
 * the chosen one, which is worse than having no toggle at all.
 */
const THEME_INIT =
  "(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();";

export const metadata: Metadata = {
  title: {
    default: "GM-OS — Unskinned team portal",
    template: "%s · GM-OS",
  },
  description: "Internal team portal.",
  // An internal system has no business in a search index.
  robots: { index: false, follow: false, nocache: true },
  // Same marks as the public site, so a pinned tab or a home-screen icon reads
  // as the same company rather than an unrelated tool.
  icons: {
    icon: [
      { url: "/favicon-light-32.png?v=4", media: "(prefers-color-scheme: light)", sizes: "32x32", type: "image/png" },
      { url: "/favicon-dark-32.png?v=4", media: "(prefers-color-scheme: dark)", sizes: "32x32", type: "image/png" },
      { url: "/favicon-light-192.png?v=4", media: "(prefers-color-scheme: light)", sizes: "192x192", type: "image/png" },
      { url: "/favicon-dark-192.png?v=4", media: "(prefers-color-scheme: dark)", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png?v=2", sizes: "180x180" }],
  },
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "GM-OS" },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover" as const,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#070c18" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // The locale cookie is set on the apex domain by the public site's switcher,
  // so somebody who chose Arabic there arrives here already in Arabic.
  const locale = await getLocale();

  return (
    <html lang={locale} dir={dir(locale)}>
      <body>
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
        <PortalBackground />
        {children}
      </body>
    </html>
  );
}
