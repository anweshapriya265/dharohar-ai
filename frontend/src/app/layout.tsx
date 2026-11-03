import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DHAROHAR AI (धरोहर) | Immersive Digital Heritage Intelligence",
  description:
    "World-class digital heritage research platform uniting 3D architectural exploration with citation-grounded archival intelligence across historical gazetteers, blue-prints, and epigraphical records.",
  keywords: [
    "Dharohar AI",
    "Cultural Heritage",
    "3D Heritage Visualization",
    "Architectural Archive",
    "Epigraphy",
    "Digital Gazetteer",
    "Kailasa Temple",
    "Evidence Grounded AI",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-full flex flex-col bg-[#080706] text-[#fcf9f2] selection:bg-[#d4af37]/30 selection:text-[#fcf9f2] antialiased">
        {children}
      </body>
    </html>
  );
}
