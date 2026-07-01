const BASE_URL = "https://stadispace.co.ke";

export default function sitemap() {
  return [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${BASE_URL}/explore`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/register`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/subscribe`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/life-skills`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    // NOTE: /dashboard and /progress are intentionally omitted — they are
    // logged-in-only pages blocked by robots.txt, so listing them here just
    // triggers "Submitted URL blocked by robots.txt" warnings with no SEO value.
  ];
}
