import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/content";
import { TAGLINE, POSITIONING } from "@/lib/brand-content";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // Arabic-only app: the install prompt and home-screen label are Arabic. The
    // short_name is kept brief so it fits under a home-screen icon.
    name: `${COMPANY.nameAr} — ${TAGLINE.ar}`,
    short_name: "جمعية القرآن",
    description: POSITIONING.ar,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    lang: "ar",
    dir: "rtl",
    categories: ["education", "lifestyle"],
    icons: [
      { src: "/icon-192.png?v=5", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png?v=5", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png?v=5", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
