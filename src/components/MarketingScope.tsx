"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect } from "react";

// Product surfaces keep the app look (IBM Plex Mono, lighter cards); everything
// else is the marketing site and gets the warmer treatment (Inter, darker
// cards). This list mirrors `inProduct` in Nav.tsx — keep them in sync. The
// same regex lives in the pre-paint inline script in app/layout.tsx.
// On app/dev subdomains the entire site is the product — never marketing scope.
// On runladder.com or localhost, fall back to path-based detection.
const APP_DOMAIN = /^(app|dev)\.runladder\.com$/;
const PRODUCT_PATH = /^\/(dashboard|score|settings|hq|admin)(\/|$)/;

// Run before paint on the client so client-side navigation doesn't flash; fall
// back to useEffect during SSR to avoid the layout-effect warning.
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Keeps the `marketing` scope class on <html> in sync with the current route.
 * Initial page load is handled pre-paint by an inline script in the root layout
 * (no flash); this handles client-side navigation. Renders nothing. Removing
 * this component, the inline script, and the CSS rules fully reverts the scope.
 */
export function MarketingScope() {
  const pathname = usePathname();

  useIsomorphicLayoutEffect(() => {
    const isAppDomain = APP_DOMAIN.test(window.location.hostname);
    const isMarketing = !isAppDomain && !PRODUCT_PATH.test(pathname ?? "");
    document.documentElement.classList.toggle("marketing", isMarketing);
  }, [pathname]);

  return null;
}
