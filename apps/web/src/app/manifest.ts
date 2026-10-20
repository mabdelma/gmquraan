import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/content";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${COMPANY.name} — ${COMPANY.tagline}`,
    short_name: COMPANY.shortName,
    description: COMPANY.positioning,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#071f1e",
    theme_color: "#0c3433",
    lang: "ar",
    dir: "rtl",
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: "/icon-192.png?v=5", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png?v=5", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png?v=5", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
