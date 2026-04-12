import "./globals.css";
import Script from "next/script";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import ThemeWrapper from "@/components/ThemeWrapper";
import WhatsAppButton from "@/components/WhatsAppButton";
import Navbar from "@/components/NavBar";

export const metadata = {
  title: "StadiSpace",
  description: "Make Learning Fun, Make Learning Yours",
};

// Runs before React hydrates — prevents flash of wrong theme
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
        {/* MathQuill CSS */}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.css"
        />
      </head>
      <body suppressHydrationWarning>
        {/* Theme init — MUST run before React hydrates */}
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: initThemeScript }}
        />

        {/* MathJax config */}
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

        {/* MathJax loader */}
        <Script
          id="mathjax-script"
          src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"
          strategy="afterInteractive"
        />

        {/* jQuery for MathQuill */}
        <Script
          src="https://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js"
          strategy="beforeInteractive"
        />

        {/* MathQuill */}
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
