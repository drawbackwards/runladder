"use client";

import Link from "next/link";
import { useAuth, UserButton, SignInButton } from "@clerk/nextjs";
import { LadderLogo } from "./LadderLogo";

export function Nav() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/90 backdrop-blur-md">
      <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <LadderLogo height={22} className="text-white" />
        </Link>

        <div className="hidden md:flex items-center gap-10 text-sm font-bold text-body">
          <Link href="/framework" className="hover:text-foreground transition-colors">
            Framework
          </Link>
          <Link href="/products" className="hover:text-foreground transition-colors">
            Products
          </Link>
          <Link href="/top-100" className="hover:text-foreground transition-colors">
            Top 100
          </Link>
          <Link href="/blog" className="hover:text-foreground transition-colors">
            Blog
          </Link>
          <Link href="/pricing" className="hover:text-foreground transition-colors">
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-6">
          {isLoaded && !isSignedIn && (
            <SignInButton mode="redirect">
              <button className="text-sm font-bold text-body hover:text-foreground transition-colors">
                Log in
              </button>
            </SignInButton>
          )}
          {isLoaded && isSignedIn && (
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8",
                },
              }}
            />
          )}
          <Link
            href="/score"
            className="text-sm font-semibold bg-ladder-green text-background px-8 py-3 rounded-full hover:bg-ladder-green/90 transition-colors"
          >
            Score a screen
          </Link>
        </div>
      </div>
    </nav>
  );
}
