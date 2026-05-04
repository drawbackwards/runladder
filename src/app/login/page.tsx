import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { authAppearance } from "@/lib/clerkAuthAppearance";

export const metadata: Metadata = {
  title: "Log in | Ladder",
  description: "Sign in to your Ladder account.",
};

export default function LoginPage() {
  return (
    <AuthShell
      footer={
        <>
          New here?{" "}
          <Link
            href="/sign-up"
            className="text-ladder-green hover:text-ladder-green/80 font-medium"
          >
            Create an account
          </Link>
        </>
      }
    >
      <SignIn
        routing="hash"
        signUpUrl="/sign-up"
        forceRedirectUrl="/score"
        appearance={authAppearance}
      />
    </AuthShell>
  );
}
