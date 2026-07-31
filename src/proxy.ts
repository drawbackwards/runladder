import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Routes that belong to the app, not the marketing site.
// Requests to these paths on runladder.com / www.runladder.com are
// permanently redirected to app.runladder.com so customers never
// interact with the app on the marketing domain.
const APP_ROUTES = /^\/(dashboard|score|settings|login|sign-up|hq|admin)(\/|$)/;
const MARKETING_HOST = /^(www\.)?runladder\.com$/;

export default clerkMiddleware((auth, request) => {
  const { nextUrl } = request;

  if (MARKETING_HOST.test(nextUrl.hostname) && APP_ROUTES.test(nextUrl.pathname)) {
    const destination = new URL(
      nextUrl.pathname + nextUrl.search,
      "https://app.runladder.com"
    );
    return NextResponse.redirect(destination, { status: 308 });
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
