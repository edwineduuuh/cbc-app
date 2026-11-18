import "./globals.css";
import Script from "next/script";
import { DM_Sans, Cormorant_Garamond } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ThemeWrapper from "@/components/ThemeWrapper";
import WhatsAppButton from "@/components/WhatsAppButton";
import Navbar from "@/components/NavBar";

const BASE_URL = "https://stadispace.co.ke";

// Brand type, loaded once and self-hosted by Next (no runtime Google Fonts
// request). DM Sans: interface. Cormorant Garamond: the wordmark and public
// headlines only. Exposed as --font-sans / --font-display.
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const cormorant = Cormorant_Garamond({
  subsets: ["latin"], weight: ["600", "700"], variable: "--font-display", display: "swap",
});

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "StadiSpace - CBE Quizzes & Learning for Kenyan Students",
    template: "%s | StadiSpace",
  },
  description:
    "StadiSpace helps Kenyan students in Grades 4-10 excel in CBE with interactive quizzes, instant marking of MCQ and structured questions, and detailed progress tracking. Start free today.",
  keywords: [
    "CBE Kenya",
    "Kenya online learning",
    "Grade 4 5 6 7 8 9 10 quizzes",
    "Kenya primary school quizzes",
    "junior secondary quizzes Kenya",
    "CBE revision Kenya",
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
    title: "StadiSpace - CBE Quizzes & Learning for Kenyan Students",
    description:
      "Interactive quizzes, instant marking of MCQ and structured questions, and progress tracking for CBE students in Grades 4-10. Start free with a quiz every day.",
    images: [
      {
        url: "/opengraph-image.png",
        width: 1200,
        height: 630,
        alt: "StadiSpace: CBE practice set by Kenyan teachers",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "StadiSpace - CBE Quizzes for Kenyan Students",
    description:
      "Interactive quizzes, instant marking of MCQ and structured questions, and progress tracking for CBE students in Grades 4-10.",
    images: ["/opengraph-image.png"],
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

  alternates: {
    canonical: BASE_URL,
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "EducationalOrganization",
  // Stable entity id so Google treats this as ONE distinct node (helps separate
  // us from the unrelated Tanzanian "StadiSpace"/MITZKITS of the same name).
  "@id": `${BASE_URL}/#organization`,
  name: "StadiSpace",
  alternateName: "StadiSpace Kenya",
  url: BASE_URL,
  logo: `${BASE_URL}/icon.png`,
  image: `${BASE_URL}/opengraph-image.png`,
  description:
    "StadiSpace is a Kenyan online learning platform for CBE (Competency Based Education) students in Grades 4-10. It offers interactive quizzes with instant marking of MCQ and structured questions, an AI-free hand-crafted question bank, and detailed progress tracking. It is a Kenya-based education service and is not affiliated with any other organisation of the same name.",
  address: {
    "@type": "PostalAddress",
    addressCountry: "KE",
  },
  areaServed: { "@type": "Country", name: "Kenya" },
  foundingLocation: {
    "@type": "Place",
    address: { "@type": "PostalAddress", addressCountry: "KE" },
  },
  educationalLevel: ["Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10"],
  teaches: "Competency Based Education (CBE), Kenya",
  knowsAbout: [
    "CBE Kenya",
    "Kenya primary school revision",
    "Kenya junior secondary quizzes",
    "Grades 4-10 practice quizzes",
  ],
  inLanguage: "en-KE",
  // TODO: add sameAs with the official StadiSpace Kenya social profile URLs -
  // this is the strongest signal that links the brand name to THIS domain.
  // sameAs: ["https://facebook.com/…", "https://instagram.com/…", ...],
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
    <html lang="en" className={`${dmSans.variable} ${cormorant.variable}`} suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        {/* KaTeX sqrt fix: Tailwind v4 resets svg{display:block} which hides
            KaTeX's SVG-based radical sign. This inline style tag loads with
            the HTML document, overriding the Tailwind CSS bundle. */}
        <style dangerouslySetInnerHTML={{ __html: `
          .katex svg, .katex-display svg {
            display: inline !important;
            vertical-align: middle !important;
            overflow: visible !important;
          }
          .katex .sqrt-sign svg {
            display: inline !important;
            overflow: visible !important;
          }
        `}} />
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
