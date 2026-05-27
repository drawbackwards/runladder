import { SignUp } from "@clerk/nextjs";
import Link from "next/link";
import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { authAppearance } from "@/lib/clerkAuthAppearance";

export const metadata: Metadata = {
  title: "Sign up | Ladder",
  description: "Create your Ladder account and start scoring.",
};

export default function SignUpPage() {
  return (
    <AuthShell
      footer={
        <>
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-ladder-green hover:text-ladder-green/80 font-medium"
          >
            Log in
          </Link>
        </>
      }
    >
      <SignUp
        routing="hash"
        signInUrl="/login"
        forceRedirectUrl="/dashboard"
        appearance={authAppearance}
      />
    </AuthShell>
  );
}
