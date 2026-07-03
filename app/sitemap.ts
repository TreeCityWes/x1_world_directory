import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://x1.world",
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];
}
