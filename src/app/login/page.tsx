import { SignIn } from "@clerk/nextjs";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Log in | Ladder",
  description: "Sign in to your Ladder account.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center pt-20 px-6">
      <SignIn
        routing="hash"
        fallbackRedirectUrl="/score"
      />
    </div>
  );
}
