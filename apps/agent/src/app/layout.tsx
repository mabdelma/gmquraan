// Bootstrap is bundled, not fetched from a CDN: a blocked or slow CDN used to
// mean the advisor rendered completely unstyled, which is exactly the case on
// the corporate and regional networks this page needs to work from.
import "bootstrap/dist/css/bootstrap.min.css";
import "./globals.css";
import type { Viewport } from "next";
import { getAgentMessages } from "@/lib/i18n";
import { getAgentLocale } from "@/lib/i18n.server";

// Runs before paint. Sets both attribute systems: data-theme drives the Unskinned
// tokens, data-bs-theme drives bundled Bootstrap. Setting only one leaves the
// page light with every control still dark.
const THEME_INIT =
  "(function(){try{var t=localStorage.getItem('theme');" +
  "if(t!=='dark'&&t!=='light'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}" +
  "document.documentElement.setAttribute('data-theme',t);" +
  "document.documentElement.setAttribute('data-bs-theme',t);}catch(e){}})();";

export const metadata = {
  title: "Unskinned Solutions Advisor",
  description: "Realtime AI advisor for the Unskinned marketplace.",
};

// Renders at device width rather than a desktop viewport, and lets the layout
// paint into the notch area — globals.css then insets the content with
// env(safe-area-inset-*) so nothing sits under the notch or home indicator.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#070c18" },
  ],
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getAgentLocale();
  const dir = getAgentMessages(locale).dir;
  return (
    <html lang={locale} dir={dir} data-bs-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>
        {/* Decorative background aura — never announced to assistive tech. */}
        <div className="app-aura" aria-hidden="true">
          <div className="glow" />
          <div className="blob b1" />
          <div className="blob b2" />
          <div className="blob b3" />
          <div className="fade" />
        </div>
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
