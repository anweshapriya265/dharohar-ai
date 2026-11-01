import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DHAROHAR AI (धरोहर) | Digital Cultural Heritage Archive",
  description:
    "Intelligent digital revitalisation of unstructured cultural, epigraphical, and architectural heritage archives with evidence-linked retrieval.",
  keywords: [
    "Dharohar AI",
    "Cultural Heritage",
    "Architectural Archive",
    "Epigraphy",
    "Digital Gazetteer",
    "Historic Preservation",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-[#faf8f5] dark:bg-[#12100e] text-[#1c1917] dark:text-[#f5f0eb]">
        {children}
      </body>
    </html>
  );
}
