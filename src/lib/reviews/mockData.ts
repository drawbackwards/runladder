/**
 * Mock data for the Reviews feature — static seed so we can click
 * through the UX before wiring real persistence. Everything here is
 * deterministic and renders identically server / client.
 *
 * Model: Review → Frame → Iterations + Pins + Team Takes + Findings
 * One Frame lives inside exactly one Review.
 */

export type ReviewerRole = "owner" | "key" | "viewer";

export type MockReviewer = {
  id: string;
  name: string;
  initials: string;
  role: ReviewerRole;
};

export type MockIteration = {
  id: string;
  scoredAt: string;
  score: number;
  label: string;
  summary: string;
};

export type MockReply = {
  id: string;
  author: MockReviewer;
  text: string;
  createdAt: string;
};

export type MockPin = {
  id: string;
  x: number; // 0-100
  y: number; // 0-100
  author: MockReviewer;
  comment: string;
  createdAt: string;
  resolved: boolean;
  replies: MockReply[];
};

export type MockFinding = {
  id: string;
  category: string;
  title: string;
  detail: string;
  lift: number; // potential score lift
  threads: MockReply[];
};

export type MockTeamTake = {
  id: string;
  author: MockReviewer;
  score: number;
  rationale: string;
  createdAt: string;
};

export type MockFrame = {
  id: string;
  reviewId: string;
  name: string;
  /** Hue in 0-360 used to generate a consistent placeholder gradient. */
  hue: number;
  iterations: MockIteration[];
  pins: MockPin[];
  findings: MockFinding[];
  teamTakes: MockTeamTake[];
};

export type MockReview = {
  id: string;
  slug: string;
  name: string;
  description: string;
  owner: MockReviewer;
  createdAt: string;
  updatedAt: string;
  status: "active" | "archived";
  reviewers: MockReviewer[];
  frames: MockFrame[];
  /** Unread peer activity since the viewer last opened the review. */
  unread: number;
};

// --- Reviewers ---------------------------------------------------------

const SARAH: MockReviewer = { id: "sarah", name: "Sarah Chen", initials: "SC", role: "owner" };
const ALEX: MockReviewer = { id: "alex", name: "Alex Rivera", initials: "AR", role: "key" };
const JORDAN: MockReviewer = { id: "jordan", name: "Jordan Park", initials: "JP", role: "key" };
const PRIYA: MockReviewer = { id: "priya", name: "Priya Singh", initials: "PS", role: "viewer" };
const MARCUS: MockReviewer = { id: "marcus", name: "Marcus Webb", initials: "MW", role: "viewer" };
const DANA: MockReviewer = { id: "dana", name: "Dana Okafor", initials: "DO", role: "key" };

// --- Reviews -----------------------------------------------------------

export const MOCK_REVIEWS: MockReview[] = [
  {
    id: "rev_checkout_v2",
    slug: "checkout-v2-sprint",
    name: "Checkout v2 sprint",
    description: "Three-screen redesign of the checkout flow. Targeting Comfortable on every screen by ship date.",
    owner: SARAH,
    createdAt: "2026-04-22T15:00:00Z",
    updatedAt: "2026-05-12T17:30:00Z",
    status: "active",
    reviewers: [SARAH, ALEX, JORDAN, PRIYA, MARCUS],
    unread: 4,
    frames: [
      {
        id: "frm_cart",
        reviewId: "rev_checkout_v2",
        name: "Cart page",
        hue: 142,
        iterations: [
          { id: "it_cart_1", scoredAt: "2026-04-23T10:12:00Z", score: 2.4, label: "Usable", summary: "Quantity steppers cramped, promo input ambiguous, trust signals below the fold." },
          { id: "it_cart_2", scoredAt: "2026-04-30T14:02:00Z", score: 2.8, label: "Usable", summary: "Spacing improved, promo input clearer, but trust block still buried." },
          { id: "it_cart_3", scoredAt: "2026-05-08T09:45:00Z", score: 3.4, label: "Comfortable", summary: "Trust block raised above CTA, item meta line tightened, promo entry treated as a button." },
        ],
        pins: [
          { id: "pin_cart_1", x: 22, y: 28, author: ALEX, comment: "Quantity stepper hit area is tiny on mobile. Looks fine on desktop.", createdAt: "2026-05-08T11:02:00Z", resolved: false, replies: [{ id: "r_cart_1a", author: SARAH, text: "Bumping to 44px in v4.", createdAt: "2026-05-08T13:21:00Z" }] },
          { id: "pin_cart_2", x: 68, y: 56, author: JORDAN, comment: "Promo input doesn't feel tap-able. Treat as a button until expanded?", createdAt: "2026-05-08T11:18:00Z", resolved: false, replies: [] },
          { id: "pin_cart_3", x: 46, y: 88, author: PRIYA, comment: "Trust signals below the fold. Raised in v3 already, marking resolved.", createdAt: "2026-05-08T12:04:00Z", resolved: true, replies: [] },
        ],
        teamTakes: [
          { id: "tt_cart_1", author: ALEX, score: 3.1, rationale: "Ladder's call is fair. Spacing fixes did most of the work.", createdAt: "2026-05-08T14:30:00Z" },
          { id: "tt_cart_2", author: JORDAN, score: 3.5, rationale: "Feels better than 3.4 — trust block placement is doing a lot.", createdAt: "2026-05-08T16:11:00Z" },
        ],
        findings: [
          { id: "f_cart_1", category: "Visual hierarchy", title: "Trust signals now anchor above the CTA", detail: "Customers see security badges and return policy before the Continue button. Strong lift on the visual hierarchy dimension.", lift: 0.4, threads: [{ id: "fr_cart_1a", author: SARAH, text: "We tested this with five users last week. Every one of them looked at the trust block.", createdAt: "2026-05-09T10:00:00Z" }] },
          { id: "f_cart_2", category: "Copy", title: "Promo code microcopy still ambiguous", detail: "The 'Apply' label is generic. Consider 'Add discount code' or similar.", lift: 0.2, threads: [] },
          { id: "f_cart_3", category: "Spacing", title: "Item rows have more breathing room", detail: "Vertical rhythm is consistent now. Eye scans the list without snagging.", lift: 0.3, threads: [] },
        ],
      },
      {
        id: "frm_payment",
        reviewId: "rev_checkout_v2",
        name: "Payment selection",
        hue: 38,
        iterations: [
          { id: "it_pay_1", scoredAt: "2026-04-24T16:00:00Z", score: 2.1, label: "Usable", summary: "Saved card hidden behind a dropdown, Apple Pay button visually weak, expiry inputs cramped." },
          { id: "it_pay_2", scoredAt: "2026-05-02T12:00:00Z", score: 2.7, label: "Usable", summary: "Saved card pinned, Apple Pay button stronger, expiry split correctly." },
        ],
        pins: [
          { id: "pin_pay_1", x: 32, y: 42, author: SARAH, comment: "Saved card chip needs a clearer 'change' affordance.", createdAt: "2026-05-02T14:10:00Z", resolved: false, replies: [] },
          { id: "pin_pay_2", x: 78, y: 22, author: MARCUS, comment: "Apple Pay button color matches the system spec now. Good.", createdAt: "2026-05-02T15:00:00Z", resolved: true, replies: [] },
        ],
        teamTakes: [
          { id: "tt_pay_1", author: ALEX, score: 2.6, rationale: "Still feels chunky in the middle. Spacing inconsistent.", createdAt: "2026-05-02T17:30:00Z" },
        ],
        findings: [
          { id: "f_pay_1", category: "Hierarchy", title: "Primary payment method gets clear treatment", detail: "Saved card is now the first thing the user sees. Strong default.", lift: 0.3, threads: [] },
          { id: "f_pay_2", category: "A11y", title: "Expiry input pair lacks input mode hints", detail: "Add inputmode=numeric and pattern hints so mobile keyboards stay numeric.", lift: 0.2, threads: [] },
        ],
      },
      {
        id: "frm_confirm",
        reviewId: "rev_checkout_v2",
        name: "Confirmation page",
        hue: 268,
        iterations: [
          { id: "it_conf_1", scoredAt: "2026-04-25T11:00:00Z", score: 2.6, label: "Usable", summary: "Confirmation is functional but lacks emotional payoff. Next steps unclear." },
          { id: "it_conf_2", scoredAt: "2026-05-09T14:00:00Z", score: 3.2, label: "Comfortable", summary: "Order summary clearer, shipping ETA hero-sized, post-purchase next steps surfaced." },
        ],
        pins: [
          { id: "pin_conf_1", x: 50, y: 30, author: JORDAN, comment: "ETA could lean even bigger. This is the moment of dopamine.", createdAt: "2026-05-09T15:00:00Z", resolved: false, replies: [{ id: "r_conf_1a", author: SARAH, text: "Bumping to 28px and adding a delivery date.", createdAt: "2026-05-09T16:12:00Z" }] },
        ],
        teamTakes: [
          { id: "tt_conf_1", author: JORDAN, score: 3.4, rationale: "ETA placement is much better. Confirmation feels alive.", createdAt: "2026-05-09T17:00:00Z" },
        ],
        findings: [
          { id: "f_conf_1", category: "Visual hierarchy", title: "Shipping ETA now leads the page", detail: "First scan lands on the date the order will arrive. That's the answer the user wants.", lift: 0.4, threads: [] },
          { id: "f_conf_2", category: "Navigation", title: "Track order CTA is discoverable", detail: "Secondary action is right under the ETA, no scroll required.", lift: 0.2, threads: [] },
        ],
      },
    ],
  },
  {
    id: "rev_onboarding_q2",
    slug: "onboarding-q2",
    name: "Onboarding Q2 polish",
    description: "Quarterly polish pass on the first-run flow. Reducing drop-off between steps 2 and 3.",
    owner: SARAH,
    createdAt: "2026-04-10T13:00:00Z",
    updatedAt: "2026-05-10T11:15:00Z",
    status: "active",
    reviewers: [SARAH, DANA, PRIYA],
    unread: 1,
    frames: [
      {
        id: "frm_welcome",
        reviewId: "rev_onboarding_q2",
        name: "Welcome screen",
        hue: 198,
        iterations: [
          { id: "it_wel_1", scoredAt: "2026-04-11T09:00:00Z", score: 3.1, label: "Comfortable", summary: "Clean welcome, value prop crisp, but the SSO buttons read as decorative." },
          { id: "it_wel_2", scoredAt: "2026-05-05T10:00:00Z", score: 3.6, label: "Comfortable", summary: "SSO buttons stronger, primary CTA distinctive, copy tightened." },
        ],
        pins: [
          { id: "pin_wel_1", x: 50, y: 65, author: DANA, comment: "Could the SSO row sit above the email field? Saves a step for power users.", createdAt: "2026-05-05T11:00:00Z", resolved: false, replies: [] },
        ],
        teamTakes: [
          { id: "tt_wel_1", author: DANA, score: 3.7, rationale: "Strong. Only nit is SSO position.", createdAt: "2026-05-05T11:05:00Z" },
        ],
        findings: [
          { id: "f_wel_1", category: "Visual hierarchy", title: "Primary CTA gets the right weight", detail: "Continue button has clear visual dominance. SSO row is supportive, not distracting.", lift: 0.3, threads: [] },
        ],
      },
      {
        id: "frm_step2",
        reviewId: "rev_onboarding_q2",
        name: "Step 2: team setup",
        hue: 312,
        iterations: [
          { id: "it_s2_1", scoredAt: "2026-04-12T14:00:00Z", score: 2.3, label: "Usable", summary: "Too many fields visible at once. Skip option buried." },
          { id: "it_s2_2", scoredAt: "2026-04-28T15:30:00Z", score: 2.8, label: "Usable", summary: "Progressive disclosure on optional fields, Skip surfaced." },
          { id: "it_s2_3", scoredAt: "2026-05-10T11:00:00Z", score: 3.3, label: "Comfortable", summary: "Smart defaults pre-fill org name, invite block collapses by default." },
        ],
        pins: [
          { id: "pin_s2_1", x: 28, y: 38, author: PRIYA, comment: "Pre-fill is correct in 80% of cases. Should we surface a confirm step?", createdAt: "2026-05-10T11:30:00Z", resolved: false, replies: [] },
          { id: "pin_s2_2", x: 70, y: 72, author: DANA, comment: "Invite block being collapsed by default is a clean call. Many users want to skip.", createdAt: "2026-05-10T12:00:00Z", resolved: false, replies: [] },
        ],
        teamTakes: [
          { id: "tt_s2_1", author: PRIYA, score: 3.5, rationale: "Big lift from v2. The smart defaults are doing the heavy lifting.", createdAt: "2026-05-10T13:00:00Z" },
          { id: "tt_s2_2", author: DANA, score: 3.2, rationale: "Agree with Ladder. Comfortable feels right.", createdAt: "2026-05-10T13:20:00Z" },
        ],
        findings: [
          { id: "f_s2_1", category: "Hierarchy", title: "Progressive disclosure reduces decision load", detail: "Optional fields collapsed by default. Users get to the core action faster.", lift: 0.5, threads: [] },
          { id: "f_s2_2", category: "Copy", title: "Skip link wording is friendly, not apologetic", detail: "'Skip for now' is better than 'Maybe later'. Reduces guilt friction.", lift: 0.2, threads: [] },
        ],
      },
    ],
  },
  {
    id: "rev_pricing_refresh",
    slug: "pricing-refresh",
    name: "Pricing page refresh",
    description: "Iterating on the pricing layout ahead of the GA launch. Goal: cleaner tier comparison.",
    owner: SARAH,
    createdAt: "2026-05-01T09:00:00Z",
    updatedAt: "2026-05-11T16:00:00Z",
    status: "active",
    reviewers: [SARAH, ALEX, MARCUS],
    unread: 0,
    frames: [
      {
        id: "frm_pricing_grid",
        reviewId: "rev_pricing_refresh",
        name: "Tier grid",
        hue: 12,
        iterations: [
          { id: "it_pr_1", scoredAt: "2026-05-03T10:00:00Z", score: 2.9, label: "Usable", summary: "Tiers readable but feature list dense and wrapping." },
          { id: "it_pr_2", scoredAt: "2026-05-11T15:30:00Z", score: 3.4, label: "Comfortable", summary: "Feature bullets tightened, soft caps on pills, coming-soon tags add honesty." },
        ],
        pins: [
          { id: "pin_pr_1", x: 38, y: 18, author: ALEX, comment: "Period word ('forever') was confusing. Good call dropping it.", createdAt: "2026-05-11T16:10:00Z", resolved: true, replies: [] },
        ],
        teamTakes: [
          { id: "tt_pr_1", author: MARCUS, score: 3.6, rationale: "Honestly cleaner than I expected from a single pass. Coming-soon tags are the move.", createdAt: "2026-05-11T17:00:00Z" },
        ],
        findings: [
          { id: "f_pr_1", category: "Visual hierarchy", title: "Tier names get more breathing room", detail: "Card header is no longer competing with the price for first-glance attention.", lift: 0.3, threads: [] },
          { id: "f_pr_2", category: "Copy", title: "Soft caps now read in one glance", detail: "Pills no longer wrap. The /mo abbreviation feels native.", lift: 0.2, threads: [] },
        ],
      },
    ],
  },
];

// --- Lookup helpers ----------------------------------------------------

export function findReviewBySlug(slug: string): MockReview | undefined {
  return MOCK_REVIEWS.find((r) => r.slug === slug);
}

export function findReviewById(id: string): MockReview | undefined {
  return MOCK_REVIEWS.find((r) => r.id === id);
}

export function findFrame(review: MockReview, frameId: string): MockFrame | undefined {
  return review.frames.find((f) => f.id === frameId);
}

/**
 * Roll up a review into the numbers shown on the dashboard card:
 * starting score, current score, delta, and frame count.
 */
export function rollupReview(review: MockReview): {
  startingScore: number;
  currentScore: number;
  delta: number;
  frameCount: number;
  totalIterations: number;
  totalPins: number;
  totalTakes: number;
} {
  const startScores: number[] = [];
  const currentScores: number[] = [];
  let totalIterations = 0;
  let totalPins = 0;
  let totalTakes = 0;

  for (const frame of review.frames) {
    if (frame.iterations.length === 0) continue;
    const sorted = [...frame.iterations].sort(
      (a, b) => +new Date(a.scoredAt) - +new Date(b.scoredAt),
    );
    startScores.push(sorted[0].score);
    currentScores.push(sorted[sorted.length - 1].score);
    totalIterations += frame.iterations.length;
    totalPins += frame.pins.length;
    totalTakes += frame.teamTakes.length;
  }

  const avg = (xs: number[]) =>
    xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
  const startingScore = avg(startScores);
  const currentScore = avg(currentScores);
  return {
    startingScore: Math.round(startingScore * 10) / 10,
    currentScore: Math.round(currentScore * 10) / 10,
    delta: Math.round((currentScore - startingScore) * 10) / 10,
    frameCount: review.frames.length,
    totalIterations,
    totalPins,
    totalTakes,
  };
}

/** Sort iterations oldest → newest. */
export function iterationsSorted(frame: MockFrame): MockIteration[] {
  return [...frame.iterations].sort(
    (a, b) => +new Date(a.scoredAt) - +new Date(b.scoredAt),
  );
}

/** Average of all Team Takes on a frame, or null when none submitted. */
export function teamTakeAverage(frame: MockFrame): number | null {
  if (frame.teamTakes.length === 0) return null;
  const sum = frame.teamTakes.reduce((a, t) => a + t.score, 0);
  return Math.round((sum / frame.teamTakes.length) * 10) / 10;
}
