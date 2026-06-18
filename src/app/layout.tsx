import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { IBM_Plex_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/Footer";
import { PasswordGate } from "@/components/PasswordGate";
import { ViewAsProvider } from "@/lib/dev/view-as";
import { ViewAsSwitcher } from "@/components/dev/ViewAsSwitcher";
import { MarketingScope } from "@/components/MarketingScope";

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
  // Favicons live under /public (icon-192, icon-512, apple-touch-icon,
  // favicon.svg, site.webmanifest) plus /src/app/favicon.ico which
  // Next.js picks up by convention. The icons entry below maps the
  // browser-visible variants. Manifest covers Android / PWA installs.
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const gateEnabled = !!process.env.SITE_PASSWORD;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  return (
    <ClerkProvider
      signInUrl={`${appUrl}/login`}
      signUpUrl={`${appUrl}/sign-up`}
      signInFallbackRedirectUrl={`${appUrl}/dashboard`}
      signUpFallbackRedirectUrl={`${appUrl}/score`}
      afterSignOutUrl={appUrl || "/"}

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
          fontFamily: "var(--font-inter), Inter, sans-serif",
        },
        elements: {
          // Hide Clerk's app logo across every Clerk surface (the modal that
          // pops from Subscribe, user-button popovers, etc.) — it's a dark
          // wordmark that's invisible on our dark UI and duplicates our own
          // branding. The /login and /sign-up pages hide it via authAppearance;
          // this covers the modal + everywhere else.
          logoBox: "!hidden",
          logoImage: "!hidden",
        },
      }}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            // Sets the right expectation up front: this app is passwordless.
            // Users typing in their email won't hunt for a "Forgot password" link.
            subtitle:
              "Enter your email and we'll send a sign-in code. No password needed.",
          },
        },
        signUp: {
          start: {
            title: "Sign up",
            subtitle:
              "Create a free account to score any screen against the Ladder framework. We'll email you a sign-in code, no password to remember.",
          },
        },
      }}
    >
      <html
        lang="en"
        className={`${inter.variable} ${ibmPlexMono.variable}`}
        suppressHydrationWarning
      >
        <body
          className={`${inter.variable} ${ibmPlexMono.variable} font-sans antialiased`}
        >
          {/*
            Set the marketing scope class on <html> before first paint so the
            warmer marketing styling (Inter, darker cards) never flashes from
            the app defaults. Mirrors PRODUCT_PATH in MarketingScope.tsx.
          */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var h=location.hostname;if(!/^(app|dev)\\.runladder\\.com$/.test(h)&&!/^\\/(dashboard|score|settings|hq|admin)(\\/|$)/.test(location.pathname)){document.documentElement.classList.add('marketing')}}catch(e){}})()`,
            }}
          />
          <MarketingScope />
          <ViewAsProvider>
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
            {/* Dev-only role switcher; renders nothing in production builds. */}
            <ViewAsSwitcher />
          </ViewAsProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
