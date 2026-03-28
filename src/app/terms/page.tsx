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
          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">1. Agreement</h2>
            <p>
              These Terms of Service ("Terms") govern your use of Ladder, including
              the website at runladder.com, the Ladder for Figma plugin, the Ladder
              for Claude skill, the Ladder API, and any related services
              (collectively, the "Service"). The Service is operated by
              Drawbackwards LLC ("we", "us", "our").
            </p>
            <p className="mt-3">
              By accessing or using the Service, you agree to be bound by these
              Terms. If you do not agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">2. The Service</h2>
            <p>
              Ladder provides automated experience quality scoring for digital
              interfaces. You submit screenshots, URLs, or other content, and the
              Service returns a score, analysis, and recommendations using our
              proprietary framework and AI-powered scoring engine.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">3. Accounts</h2>
            <p>
              Some features require a Ladder account. You are responsible for
              maintaining the security of your account credentials. You must
              provide accurate information and keep it current. We may suspend or
              terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              4. Free Tier and Public Scores
            </h2>
            <p>
              Scores generated on the free tier may be published on runladder.com,
              including in the Top 100, teardowns, blog content, social media, and
              other public-facing materials. By using the free tier, you grant us a
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

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              5. Surfaces and Platforms
            </h2>
            <p>
              These Terms apply equally to all Ladder surfaces:
            </p>
            <ul className="mt-3 space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-ladder-green mt-0.5">+</span>
                <span><strong className="text-foreground">runladder.com</strong> - the web application for scoring, dashboard, and content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ladder-green mt-0.5">+</span>
                <span><strong className="text-foreground">Ladder for Figma</strong> - the Figma plugin for in-canvas scoring</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ladder-green mt-0.5">+</span>
                <span><strong className="text-foreground">Ladder for Claude</strong> - the Claude.ai skill for scoring in AI conversations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ladder-green mt-0.5">+</span>
                <span><strong className="text-foreground">Ladder API</strong> - the developer API at api.runladder.com</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-ladder-green mt-0.5">+</span>
                <span><strong className="text-foreground">Ladder Pulse</strong> - the feedback analysis product</span>
              </li>
            </ul>
            <p className="mt-3">
              Your subscription and usage meter are shared across all surfaces. A
              score consumed on one surface counts toward your plan limit on all
              surfaces.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">6. Your Content</h2>
            <p>
              You retain ownership of the screenshots, URLs, and other content you
              submit to the Service ("Your Content"). You represent that you have
              the right to submit Your Content and that it does not violate any
              third-party rights.
            </p>
            <p className="mt-3">
              You grant us a limited license to process Your Content for the
              purpose of providing the Service. For free-tier users, this license
              extends to public display as described in Section 4.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">7. Our Content</h2>
            <p>
              Ladder scores, analyses, recommendations, the Ladder framework,
              scoring methodology, and all associated intellectual property are
              owned by Drawbackwards LLC. You may share your individual scores and
              results, but you may not scrape, reproduce, or redistribute our
              scoring system, framework, or content at scale without written
              permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              8. Billing and Cancellation
            </h2>
            <p>
              Paid plans are billed monthly through Stripe. You may cancel at any
              time from your account settings. Cancellation takes effect at the end
              of your current billing period. We do not provide refunds for partial
              months.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">9. API Usage</h2>
            <p>
              Access to the Ladder API requires API keys issued through your
              account. You are responsible for securing your API keys. Do not share
              them publicly. We may rate-limit or suspend API access that is
              abusive or exceeds reasonable usage patterns.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">10. Prohibited Uses</h2>
            <p>You may not:</p>
            <ul className="mt-3 space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-muted mt-0.5">-</span>
                <span>Use the Service to score content you do not have the right to evaluate</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted mt-0.5">-</span>
                <span>Attempt to reverse-engineer the scoring engine or methodology</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted mt-0.5">-</span>
                <span>Scrape, crawl, or systematically extract data from the Service</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted mt-0.5">-</span>
                <span>Misrepresent Ladder scores or fabricate results</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted mt-0.5">-</span>
                <span>Use the Service to harass, defame, or harm others</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-muted mt-0.5">-</span>
                <span>Resell access to the Service without authorization</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">
              11. Disclaimer and Limitation of Liability
            </h2>
            <p>
              The Service is provided "as is" without warranties of any kind.
              Ladder scores are AI-generated assessments and should not be treated
              as absolute measures of quality. We are not liable for decisions made
              based on Ladder scores.
            </p>
            <p className="mt-3">
              To the maximum extent permitted by law, Drawbackwards LLC shall not
              be liable for any indirect, incidental, special, consequential, or
              punitive damages arising from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">12. Changes</h2>
            <p>
              We may update these Terms from time to time. Material changes will be
              communicated through the Service or by email. Continued use after
              changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">13. Governing Law</h2>
            <p>
              These Terms are governed by the laws of the State of New York,
              without regard to conflict of law provisions.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-foreground mb-3">14. Contact</h2>
            <p>
              Questions about these Terms? Reach us at{" "}
              <Link href="/contact" className="text-ladder-green hover:text-ladder-green/80 transition-colors">
                runladder.com/contact
              </Link>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
