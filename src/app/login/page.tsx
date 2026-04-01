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
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "bg-[#1a1a1a] border border-[#333] shadow-none",
            headerTitle: "text-white",
            headerSubtitle: "text-[#999]",
            socialButtonsBlockButton: "border-[#333] text-[#999] hover:bg-[#222]",
            formFieldInput: "bg-[#111] border-[#333] text-white",
            formFieldLabel: "text-[#999]",
            footerActionLink: "text-[#6AC89B] hover:text-[#6AC89B]/80",
            formButtonPrimary: "bg-[#6AC89B] hover:bg-[#6AC89B]/90 text-[#1a1a1a]",
            identityPreviewEditButton: "text-[#6AC89B]",
          },
        }}
      />
    </div>
  );
}
