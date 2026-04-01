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
          colorBackground: "#111111",
          colorText: "#e5e5e5",
          colorTextSecondary: "#777777",
          colorTextOnPrimaryBackground: "#111111",
          colorInputBackground: "#1a1a1a",
          colorInputText: "#e5e5e5",
          colorNeutral: "#e5e5e5",
          colorDanger: "#ef4444",
          borderRadius: "0px",
          fontFamily: "Inter, sans-serif",
        },
        elements: {
          card: "bg-[#111] border border-[#2a2a2a] shadow-none rounded-none",
          socialButtonsBlockButton: "bg-[#1a1a1a] border-[#2a2a2a] text-[#e5e5e5] hover:bg-[#222] rounded-none",
          socialButtonsBlockButtonText: "text-[#e5e5e5] font-medium",
          formFieldInput: "bg-[#1a1a1a] border-[#2a2a2a] text-[#e5e5e5] rounded-none focus:border-[#6AC89B] focus:ring-0",
          formFieldLabel: "text-[#777]",
          formButtonPrimary: "bg-[#6AC89B] hover:bg-[#5ab88b] text-[#111] font-semibold rounded-none",
          headerTitle: "text-[#e5e5e5] font-bold",
          headerSubtitle: "text-[#777]",
          dividerLine: "bg-[#2a2a2a]",
          dividerText: "text-[#555]",
          footerActionLink: "text-[#6AC89B] hover:text-[#5ab88b]",
          footerActionText: "text-[#555]",
          identityPreviewEditButton: "text-[#6AC89B]",
          identityPreviewText: "text-[#e5e5e5]",
          formFieldInputShowPasswordButton: "text-[#777] hover:text-[#e5e5e5]",
          otpCodeFieldInput: "bg-[#1a1a1a] border-[#2a2a2a] text-[#e5e5e5]",
          alternativeMethodsBlockButton: "bg-[#1a1a1a] border-[#2a2a2a] text-[#e5e5e5] hover:bg-[#222] rounded-none",
          badge: "bg-[#6AC89B]/10 text-[#6AC89B] border-[#6AC89B]/20",
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
