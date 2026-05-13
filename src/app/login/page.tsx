import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";
import { AuthShell } from "@/components/AuthShell";
import { authAppearance } from "@/lib/clerkAuthAppearance";
import { LoginFooter } from "./LoginFooter";

export const metadata: Metadata = {
  title: "Log in | Ladder",
  description: "Sign in to your Ladder account.",
};

export default function LoginPage() {
  return (
    <AuthShell footer={<LoginFooter />}>
      <SignIn
        routing="hash"
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
        appearance={authAppearance}
      />
    </AuthShell>
  );
}
