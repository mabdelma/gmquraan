import type { MetadataRoute } from "next";
import { COMPANY } from "@/lib/content";

export default function robots(): MetadataRoute.Robots {
  const base = `https://www.${COMPANY.domain}`;
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/central", "/hub", "/core"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
