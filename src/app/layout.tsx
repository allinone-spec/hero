import type { Metadata } from "next";
import "./globals.css";
import ThemeProvider from "@/components/ui/ThemeProvider";
import NavigationProgress from "@/components/ui/NavigationProgress";

export const metadata: Metadata = {
  title: {
    default: "Medals N Bongs — Honoring America's Decorated Heroes",
    template: "%s — Medals N Bongs",
  },
  description:
    "A comprehensive archive of decorated U.S. military heroes, objectively ranked by the Unified Scoring Matrix (USM-25). Explore medals, ribbons, and the stories of valor.",
  keywords: [
    "military heroes",
    "Medal of Honor",
    "decorated veterans",
    "USM-25",
    "military medals",
    "war heroes",
    "military rankings",
    "valor awards",
    "Purple Heart",
    "Silver Star",
    "Distinguished Service Cross",
  ],
  authors: [{ name: "Medals N Bongs" }],
  openGraph: {
    title: "Medals N Bongs — Honoring America's Decorated Heroes",
    description:
      "Explore decorated U.S. military heroes ranked by the USM-25 scoring system.",
    type: "website",
    siteName: "Medals N Bongs",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Medals N Bongs — Honoring America's Decorated Heroes",
    description:
      "Explore decorated U.S. military heroes ranked by the USM-25 scoring system.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Prevent flash of wrong theme — runs before React hydration
const themeScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else document.documentElement.dataset.theme = 'dark';
  } catch(e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="antialiased min-h-screen">
        <ThemeProvider>
          <NavigationProgress />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
