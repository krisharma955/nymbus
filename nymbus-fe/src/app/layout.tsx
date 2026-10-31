import type { Metadata } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-soft-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Nymbus | Autonomous Multi-Agent Research Platform",
  description:
    "Auditable multi-agent research platform. Decomposes complex inquiries, verifies claims against source passages, and links every conclusion to proof.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${plusJakarta.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-[#0B0E14] text-[#E2E8F0]">
        {/*
THESIS: Autonomous multi-agent research as an isometric spatial ledger—refusing decorative sci-fi clichés in favor of architectural drafting precision, vast intentional negative space, and mathematical citation provenance.
OWN-WORLD: Matte obsidian (#090A0D), chalk bone white (#F8FAFC), warm champagne slate (#D4A373), fine hairline drafting grids, and an interactive 3D isometric drafting plane.
STORY: Visitors experience a calm, authoritative research platform, inspect a living 3D isometric drafting ledger of subtasks and verified source passages, and launch deep inquiries with zero hallucination.
FIRST VIEWPORT: Asymmetric minimalist layout. Top: clean wordmark and status bead. Center: monumental headline 'AUTONOMOUS RESEARCH. ABSOLUTE PROVENANCE.' and an interactive 3D isometric drafting plane with elevated subtask and citation cards.
FORM: The Spatial Ledger (Option 1), seed key c999151d.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
*/}
        {children}
      </body>
    </html>
  );
}
