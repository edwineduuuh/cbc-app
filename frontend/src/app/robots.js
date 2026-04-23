export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/explore", "/login", "/register", "/subscribe", "/life-skills"],
        disallow: [
          "/admin/",
          "/dashboard",
          "/profile",
          "/settings",
          "/progress",
          "/attempts/",
          "/student/",
          "/teacher/",
          "/api/",
          "/auth/",
        ],
      },
    ],
    sitemap: "https://stadispace.co.ke/sitemap.xml",
  };
}
