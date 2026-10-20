import type { Metadata, Viewport } from "next";
import { Cairo, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { GlobalBackground } from "@/components/GlobalBackground";
import { COMPANY, OFFICES, REGISTRATION } from "@/lib/content";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { AdvisorWidget } from "@/components/AdvisorWidget";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { PWARegister } from "@/components/PWARegister";
import { NativeBridge } from "@/components/NativeBridge";
import { CookieConsent } from "@/components/CookieConsent";
import { Analytics } from "@/components/Analytics";
import { dir } from "@/lib/i18n";
import { getLocale } from "@/lib/i18n.server";
import { getSkipToContent } from "@/lib/ui-i18n";
import { getContactSettings } from "@/lib/settings";
import { headers } from "next/headers";

/**
 * Brand typography.
 *
 * A high-contrast classical serif over a quiet sans. Cormorant Garamond
 * carries the English display voice and Cairo does the reading in both
 * scripts — the office is national and Arabic is the primary language here,
 * not a fallback bolted on afterwards.
 *
 * All three are SIL Open Font License 1.1, which permits commercial use and
 * embedding. next/font downloads them at build time and serves them from our
 * own origin, so there is no request to Google at runtime and nothing to
 * disclose in a cookie banner.
 */
const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap"
});

/**
 * Cairo covers both scripts, so it is the body face for the whole site rather
 * than an Arabic-only fallback. That matters
 * more than it sounds: one family across ar and en means the two versions share
 * a typographic rhythm instead of looking like two different sites, which is
 * the usual failure when Arabic is bolted on.
 *
 * Cormorant Garamond stays for English display only — the serif in the mark.
 * It has no Arabic coverage at all, so the Arabic rules in globals.css keep
 * headings on Cairo.
 */
const body = Cairo({
  subsets: ["latin", "arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap"
});

// The central console is its own shell — hide the public marketing top bar + footer.
const APP_PREFIXES = ["/central"];

export const metadata: Metadata = {
  title: {
    default: `${COMPANY.name} — ${COMPANY.tagline}`,
    template: `%s · ${COMPANY.name}`
  },
  description: COMPANY.positioning,
  metadataBase: new URL(`https://www.${COMPANY.domain}`),
  openGraph: {
    title: `${COMPANY.name} — ${COMPANY.tagline}`,
    description: COMPANY.positioning,
    type: "website"
  },
  applicationName: COMPANY.name,
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: COMPANY.shortName },
  icons: {
    // Light-only site: one favicon set, no prefers-color-scheme variants.
    icon: [
      { url: "/favicon-light-32.png?v=5", sizes: "32x32", type: "image/png" },
      { url: "/favicon-light-192.png?v=5", sizes: "192x192", type: "image/png" }
    ],
    apple: [{ url: "/apple-touch-icon.png?v=5", sizes: "180x180" }]
  }
};

export const viewport: Viewport = {
  // Light-only: the browser UI colour matches the page background in every context.
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const pathname = (await headers()).get("x-pathname") || "";
  const isApp = APP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
  const contact = await getContactSettings();
  return (
    <html
      lang={locale}
      dir={dir(locale)}
      className={`${display.variable} ${body.variable}`}
    >
      <body className="app-minh flex flex-col">
        <GlobalBackground />
        {/* eslint-disable-next-line react/no-danger */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              // ProfessionalService, not Organization: this is a practice with
              // offices people visit, and the address block is what search
              // engines need from it.
              "@type": "ProfessionalService",
              name: COMPANY.name,
              alternateName: COMPANY.nameAr,
              url: `https://${COMPANY.domain}`,
              logo: `https://${COMPANY.domain}/icon-512.png`,
              description: COMPANY.positioning,
              foundingDate: String(COMPANY.foundedYear),
              email: COMPANY.email,
              telephone: COMPANY.whatsapp,
              areaServed: ["EG", "SA", "JO"],
              // Only the locality is confirmed, so streetAddress is omitted
              // rather than guessed — an invented street is worse than a
              // missing one in structured data too.
              address: OFFICES.map((o) => ({
                "@type": "PostalAddress",
                addressLocality: o.city,
                addressCountry: o.country
              })),
              knowsAbout: REGISTRATION.legalForm
            })
          }}
        />
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-sky-400 focus:px-4 focus:py-2 focus:text-[#080f1e] focus:font-bold"
        >
          {getSkipToContent(locale)}
        </a>
        {!isApp && <Nav />}
        <main id="main" className="flex-1">{children}</main>
        {!isApp && <Footer />}
        <AdvisorWidget locale={locale} />
        {!isApp && <WhatsAppButton locale={locale} number={contact.whatsapp} />}
        <CookieConsent locale={locale} />
        <PWARegister />
        <NativeBridge />
        <Analytics />
      </body>
    </html>
  );
}
