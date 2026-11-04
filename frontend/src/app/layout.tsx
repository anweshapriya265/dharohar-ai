import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DHAROHAR AI (धरोहर) | Digital Cultural Heritage & Architectural Intelligence",
  description:
    "IIT Gandhinagar Explorer Fellowship Archive: Transforming unstructured field reports, epigraphical folios, and monument photography into interactive 3D digital twins, geospatial trails, and evidence-grounded research intelligence.",
  keywords: [
    "Dharohar AI",
    "Cultural Heritage",
    "3D Heritage Visualization",
    "Architectural Archive",
    "IIT Gandhinagar",
    "Explorer Fellowship",
    "Epigraphy",
    "Digital Gazetteer",
    "Kailasa Temple",
    "Evidence Grounded AI",
    "Stepwell 3D Twin",
    "Adalaj",
    "Rani ki Vav",
  ],
  icons: {
    icon: '/dharohar-logo.svg',
    shortcut: '/dharohar-logo.svg',
    apple: '/dharohar-logo.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Cinzel:wght@600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col bg-[#F6F1E7] text-[#393331] selection:bg-[#642F38]/20 selection:text-[#642F38] antialiased">
        {children}
      </body>
    </html>
  );
}
