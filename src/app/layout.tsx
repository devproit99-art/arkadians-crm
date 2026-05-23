/*
IMPORTANT:
All code in this project must follow /docs/CURSOR_RULES.md.
Prefer simple working code over complex architecture.
Do not overengineer.
*/

import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { getSession } from "@/lib/auth";

const arkadiansSans = Inter({
  variable: "--font-arkadians-sans",
  subsets: ["latin"],
});

const arkadiansMono = JetBrains_Mono({
  variable: "--font-arkadians-mono",
  subsets: ["latin"],
});

const arkadiansDisplay = Playfair_Display({
  variable: "--font-arkadians-display",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Arkadians CRM",
  description: "The Arkadians AI Sales & Experience CRM",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html
      lang="en"
      className={`${arkadiansSans.variable} ${arkadiansMono.variable} ${arkadiansDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-cream text-navy">
        <AppShell sessionUser={session}>{children}</AppShell>
      </body>
    </html>
  );
}
