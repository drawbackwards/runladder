import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PasswordGate } from "@/components/PasswordGate";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ladder | The quality score for every experience",
  description:
    "Score any screen against the Ladder framework. Track UX quality over time. The universal standard for experience measurement.",
  openGraph: {
    title: "Ladder | The quality score for every experience",
    description:
      "Score any screen against the Ladder framework. Track UX quality over time.",
    siteName: "Ladder",
    url: "https://runladder.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gateEnabled = !!process.env.SITE_PASSWORD;

  return (
    <ClerkProvider
      appearance={{
        variables: {
          colorPrimary: "#6AC89B",
          colorBackground: "#1a1a1a",
          colorText: "#ffffff",
          colorTextSecondary: "#999999",
          colorInputBackground: "#111111",
          colorInputText: "#ffffff",
        },
      }}
    >
      <html lang="en">
        <body
          className={`${inter.variable} ${ibmPlexMono.variable} font-sans antialiased`}
        >
          {gateEnabled ? (
            <PasswordGate>
              <Nav />
              <main className="min-h-screen">{children}</main>
              <Footer />
            </PasswordGate>
          ) : (
            <>
              <Nav />
              <main className="min-h-screen">{children}</main>
              <Footer />
            </>
          )}
        </body>
      </html>
    </ClerkProvider>
  );
}
