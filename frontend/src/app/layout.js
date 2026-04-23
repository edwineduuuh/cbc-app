import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ThemeWrapper from "@/components/ThemeWrapper";
import WhatsAppButton from "@/components/WhatsAppButton";
import Navbar from "@/components/NavBar";

const BASE_URL = "https://stadispace.co.ke";

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "StadiSpace — CBE Quizzes & Learning for Kenyan Students",
    template: "%s | StadiSpace",
  },
  description:
    "StadiSpace helps Kenyan students in Grades 4–9 excel in CBC with interactive quizzes, instant feedback, AI-powered marking, and detailed progress tracking. Start free today.",
  keywords: [
    "CBC Kenya",
    "CBE Kenya",
    "Kenya online learning",
    "Grade 4 5 6 7 8 9 quizzes",
    "Kenya primary school quizzes",
    "junior secondary quizzes Kenya",
    "CBC revision Kenya",
    "Kenya curriculum quizzes",
    "StadiSpace",
    "online learning Kenya",
    "school revision Kenya",
  ],
  authors: [{ name: "StadiSpace", url: BASE_URL }],
  creator: "StadiSpace",
  publisher: "StadiSpace",
  category: "Education",
  applicationName: "StadiSpace",

  openGraph: {
    type: "website",
    locale: "en_KE",
    url: BASE_URL,
    siteName: "StadiSpace",
    title: "StadiSpace — CBE Quizzes & Learning for Kenyan Students",
    description:
      "Interactive quizzes, instant marking, and progress analytics for CBC students in Grades 4–9. Start with 2 free quizzes — no card required.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "StadiSpace — CBE Learning Platform for Kenya",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "StadiSpace — CBE Quizzes for Kenyan Students",
    description:
      "Interactive quizzes, instant marking, and progress analytics for CBC students in Grades 4–9.",
    images: ["/og-image.png"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },

  alternates: {
    canonical: BASE_URL,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  name: "StadiSpace",
  url: BASE_URL,
  description:
    "Online CBC learning platform for Kenyan students in Grades 4–9. Interactive quizzes, instant AI-powered marking, and detailed progress analytics.",
  address: {
    "@type": "PostalAddress",
    addressCountry: "KE",
  },
  areaServed: "KE",
  educationalLevel: ["Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9"],
  teaches: "Competency Based Curriculum (CBC), Kenya",
  inLanguage: "en",
};

const initThemeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme') || 'light';
    var dark = t === 'dark' || (t === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  } catch(e){}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </head>
      <body suppressHydrationWarning>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: initThemeScript }}
        />

        <Script
          id="mathjax-config"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.MathJax = {
                tex: {
                  inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                  displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']]
                }
              };
            `,
          }}
        />

        <Script
          id="mathjax-script"
          src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
          strategy="afterInteractive"
        />

        <Script
          src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"
          strategy="beforeInteractive"
        />

        <Script
          src="https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.js"
          strategy="afterInteractive"
        />

        <ThemeProvider>
          <ThemeWrapper>
            <AuthProvider>
              <Navbar />
              {children}
            </AuthProvider>
          </ThemeWrapper>
        </ThemeProvider>
        <WhatsAppButton />
      </body>
    </html>
  );
}
