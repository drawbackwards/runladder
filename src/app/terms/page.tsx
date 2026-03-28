import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Ladder",
  description: "Terms of Service for Ladder by Drawbackwards.",
};

export default function TermsPage() {
  return (
    <div className="pt-32 pb-24 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-[2rem] font-bold mb-4">Terms of Service</h1>
        <p className="text-sm text-muted mb-12">
          Last updated: March 28, 2026
        </p>

        <div className="space-y-10 text-sm text-body leading-relaxed">
          {/* ── Acceptance by use ── */}
          <section className="border border-ladder-green/30 bg-ladder-green/5 p-6 -mx-6 sm:mx-0">
            <h2 className="text-lg font-bold text-foreground mb-3">
              Acceptance of Terms
            </h2>
            <p>
              <strong className="text-foreground">
                By using Ladder in any form — scoring a screen on runladder.com,
                installing or using the Ladder for Figma plugin, or using the
                Ladder for Claude skill — you are agreeing to these Terms of
                Service.
              </strong>{" "}
              No separate sign-up or checkbox is required. If you do not agree to
              these Terms, do not use the Service.
            </p>
            <p className="mt-3">
              Submitting a screenshot, entering a URL, or initiating a score on
              any Ladder surface constitutes acceptance. Your continued use of any
              Ladder surface after updates to these Terms constitutes acceptance
              of the revised Terms.
            </p>
          </section>

          {/* ── 1. Overview ── */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              1. Overview
            </h2>
            <p>
              These Terms of Service (&ldquo;Terms&rdquo;) are between you and
              Drawbackwards LLC (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
              &ldquo;our&rdquo;). They govern your use of the Ladder scoring
              platform, which is delivered through multiple surfaces and products
              described below.
            </p>
            <p className="mt-3">
              Ladder consists of three categories of service, each with different
              terms of access:
            </p>
            <ul className="mt-3 space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-ladder-green mt-0.5">1.</span>
                <span>
                  <strong className="text-foreground">Ladder Scoring</strong> —
                  the self-serve scoring tool available on runladder.com, the
                  Figma plugin, and the Claude skill (covered by these Terms)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ladder-green mt-0.5">2.</span>
                <span>
                  <strong className="text-foreground">Ladder API</strong> — the
                  developer API at api.runladder.com (requires a separate API
                  agreement)
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ladder-green mt-0.5">3.</span>
                <span>
                  <strong className="text-foreground">Ladder Pulse</strong> — the
                  enterprise feedback analysis product (requires a separate
                  service agreement)
                </span>
              </li>
            </ul>
          </section>

          {/* ── 2. What these Terms cover ── */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              2. Scope: What These Terms Cover
            </h2>
            <p>
              These Terms govern your use of Ladder Scoring, which includes:
            </p>
            <ul className="mt-3 space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-ladder-green mt-0.5">+</span>
                <span>
                  <strong className="text-foreground">runladder.com</strong> —
                  the web application for scoring screens, viewing the Top 100,
                  browsing teardowns, managing your dashboard, and all other site
                  features
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ladder-green mt-0.5">+</span>
                <span>
                  <strong className="text-foreground">Ladder for Figma</strong> —
                  the Figma plugin for in-canvas scoring
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ladder-green mt-0.5">+</span>
                <span>
                  <strong className="text-foreground">Ladder for Claude</strong>{" "}
                  — the Claude.ai skill for scoring in AI conversations
                </span>
              </li>
            </ul>
            <p className="mt-3">
              Your subscription and usage meter are shared across these three
              surfaces. A score consumed on one counts toward your plan limit on
              all three.
            </p>
          </section>

          {/* ── 3. What requires separate agreements ── */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              3. Separate Agreements: API and Pulse
            </h2>
            <p>
              The following products are{" "}
              <strong className="text-foreground">
                not covered by these Terms
              </strong>{" "}
              and require their own agreements:
            </p>

            <div className="mt-4 border border-[#333] p-5">
              <h3 className="text-sm font-bold text-foreground mb-2">
                Ladder API
              </h3>
              <p>
                Access to the Ladder API at api.runladder.com is governed by a
                separate API Terms of Service and requires API keys issued through
                your account. If you are a developer integrating Ladder into your
                own product, the API agreement — not these Terms — applies to that
                usage.
              </p>
            </div>

            <div className="mt-3 border border-[#333] p-5">
              <h3 className="text-sm font-bold text-foreground mb-2">
                Ladder Pulse
              </h3>
              <p>
                Ladder Pulse is an enterprise product that ingests customer
                feedback, support transcripts, and operational signals to generate
                experience scores. Pulse requires a separate service agreement
                that covers data handling, SLAs, and custom terms specific to your
                deployment. Contact us to discuss Pulse terms.
              </p>
            </div>
          </section>

          {/* ── 4. The scoring service ── */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              4. The Scoring Service
            </h2>
            <p>
              Ladder provides automated experience quality scoring for digital
              interfaces. You submit screenshots, URLs, or other content, and the
              Service returns a score, analysis, and recommendations using our
              proprietary framework and AI-powered scoring engine.
            </p>
          </section>

          {/* ── 5. Accounts ── */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              5. Accounts
            </h2>
            <p>
              Some features require a Ladder account authenticated through Clerk.
              You are responsible for maintaining the security of your account
              credentials. You must provide accurate information and keep it
              current. We may suspend or terminate accounts that violate these
              Terms.
            </p>
          </section>

          {/* ── 6. Free tier and public scores ── */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              6. Free Tier and Public Scores
            </h2>
            <p>
              <strong className="text-foreground">
                Scores generated on the free tier may be published on
                runladder.com.
              </strong>{" "}
              This includes the Top 100, teardowns, blog content, social media,
              and other public-facing materials. By scoring on the free tier —
              whether on the website, in Figma, or through Claude — you grant us a
              non-exclusive, worldwide, royalty-free license to display, reproduce,
              and distribute the submitted content and resulting scores for
              promotional and educational purposes.
            </p>
            <p className="mt-3">
              If you require private evaluations, upgrade to a paid plan. Scores
              generated on Professional, Team, and Enterprise plans are private by
              default and will not be published without your explicit consent.
            </p>
          </section>

          {/* ── 7. Your content ── */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              7. Your Content
            </h2>
            <p>
              You retain ownership of the screenshots, URLs, and other content you
              submit to the Service (&ldquo;Your Content&rdquo;). You represent
              that you have the right to submit Your Content and that it does not
              violate any third-party rights.
            </p>
            <p className="mt-3">
              You grant us a limited license to process Your Content for the
              purpose of providing the Service. For free-tier users, this license
              extends to public display as described in Section 6.
            </p>
          </section>

          {/* ── 8. Our content ── */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              8. Our Content
            </h2>
            <p>
              Ladder scores, analyses, recommendations, the Ladder framework,
              scoring methodology, and all associated intellectual property are
              owned by Drawbackwards LLC. You may share your individual scores and
              results, but you may not scrape, reproduce, or redistribute our
              scoring system, framework, or content at scale without written
              permission.
            </p>
          </section>

          {/* ── 9. Billing ── */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              9. Billing and Cancellation
            </h2>
            <p>
              Paid plans for Ladder Scoring are billed monthly through Stripe. You
              may cancel at any time from your account settings. Cancellation takes
              effect at the end of your current billing period. We do not provide
              refunds for partial months. API and Pulse billing are governed by
              their respective agreements.
            </p>
          </section>

          {/* ── 10. Prohibited uses ── */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              10. Prohibited Uses
            </h2>
            <p>You may not:</p>
            <ul className="mt-3 space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-muted mt-0.5">-</span>
                <span>
                  Use the Service to score content you do not have the right to
                  evaluate
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted mt-0.5">-</span>
                <span>
                  Attempt to reverse-engineer the scoring engine or methodology
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted mt-0.5">-</span>
                <span>
                  Scrape, crawl, or systematically extract data from the Service
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted mt-0.5">-</span>
                <span>Misrepresent Ladder scores or fabricate results</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted mt-0.5">-</span>
                <span>
                  Use the Service to harass, defame, or harm others
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted mt-0.5">-</span>
                <span>
                  Resell access to the Service without authorization
                </span>
              </li>
            </ul>
          </section>

          {/* ── 11. Disclaimer ── */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              11. Disclaimer and Limitation of Liability
            </h2>
            <p>
              The Service is provided &ldquo;as is&rdquo; without warranties of
              any kind. Ladder scores are AI-generated assessments and should not
              be treated as absolute measures of quality. We are not liable for
              decisions made based on Ladder scores.
            </p>
            <p className="mt-3">
              To the maximum extent permitted by law, Drawbackwards LLC shall not
              be liable for any indirect, incidental, special, consequential, or
              punitive damages arising from your use of the Service.
            </p>
          </section>

          {/* ── 12. Changes ── */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              12. Changes
            </h2>
            <p>
              We may update these Terms from time to time. Material changes will be
              communicated through the Service or by email. Continued use of any
              Ladder surface after changes constitutes acceptance of the revised
              Terms.
            </p>
          </section>

          {/* ── 13. Governing law ── */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              13. Governing Law
            </h2>
            <p>
              These Terms are governed by the laws of the State of Arizona,
              without regard to conflict of law provisions.
            </p>
          </section>

          {/* ── 14. Contact ── */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              14. Contact
            </h2>
            <p>
              Questions about these Terms? Reach us at{" "}
              <Link
                href="/contact"
                className="text-ladder-green hover:text-ladder-green/80 transition-colors"
              >
                runladder.com/contact
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
