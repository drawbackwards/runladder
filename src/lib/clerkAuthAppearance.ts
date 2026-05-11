export const authAppearance = {
  variables: {
    colorPrimary: "#6AC89B",
    colorTextOnPrimaryBackground: "#1a1a1a",
    colorBackground: "transparent",
    colorInputBackground: "#2a2a2a",
    colorInputText: "#ffffff",
    colorText: "#ffffff",
    colorTextSecondary: "#B8B8B8",
    colorNeutral: "#ffffff",
    colorDanger: "#ef4444",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-inter), Inter, sans-serif",
    fontSize: "0.875rem",
  },
  elements: {
    rootBox: "!w-full !max-w-none",
    cardBox: "!w-full !max-w-none !shadow-none !border-0",
    card: "!bg-transparent !border-0 !shadow-none !p-0 !w-full",
    header: "!text-center !mb-2",
    headerTitle:
      "!text-foreground !text-2xl !font-semibold !tracking-tight !text-center",
    headerSubtitle: "!text-body !text-sm !text-center !mt-2",
    main: "!gap-4",
    socialButtons: "!gap-2",
    socialButtonsBlockButton:
      "!bg-card !border !border-border !text-foreground hover:!bg-card-hover !rounded-full !py-3 !shadow-none !overflow-hidden !relative",
    socialButtonsBlockButtonText: "!text-foreground !font-medium !text-sm",
    socialButtonsProviderIcon: "!w-4 !h-4",
    dividerLine: "!bg-border",
    dividerText: "!text-muted !text-xs !uppercase !tracking-wider",
    formFieldLabel:
      "!text-body !text-xs !uppercase !tracking-wider !mb-2 !font-medium",
    formFieldInput:
      "!bg-card !border !border-border !text-foreground !rounded-lg focus:!border-ladder-green !ring-0 !px-4 !py-3 !text-sm placeholder:!text-muted !min-h-[44px] !leading-normal !box-border",
    formButtonPrimary:
      "!bg-ladder-green hover:!bg-[#5ab88b] !text-black !font-semibold !rounded-full !normal-case !text-sm !py-3 !shadow-none !border-0 [&_*]:!text-black",
    formFieldAction: "!text-ladder-green hover:!text-[#5ab88b] !text-xs",
    formFieldInputShowPasswordButton: "!text-muted hover:!text-foreground",
    formResendCodeLink: "!text-ladder-green hover:!text-[#5ab88b]",
    identityPreview:
      "!bg-card !border !border-border !rounded-lg !text-foreground",
    identityPreviewText: "!text-foreground !text-sm",
    identityPreviewEditButton: "!text-ladder-green hover:!text-[#5ab88b]",
    otpCodeFieldInput:
      "!bg-card !border !border-border !text-foreground !rounded-lg focus:!border-ladder-green !min-h-[44px] !leading-normal !box-border",
    alternativeMethodsBlockButton:
      "!bg-card !border !border-border !text-foreground hover:!bg-card-hover !rounded-full !text-sm !py-3",
    alternativeMethodsBlockButtonText: "!text-foreground !font-medium",
    alternativeMethodsBlockButtonArrow: "!text-foreground",
    backLink: "!text-ladder-green hover:!text-[#5ab88b]",
    footer: "!hidden",
    footerAction: "!hidden",
    footerActionText: "!hidden",
    footerActionLink: "!hidden",
    badge:
      "!bg-ladder-green/10 !text-ladder-green !border !border-ladder-green/20",
  },
};
