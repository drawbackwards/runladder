export type BlogPost = {
  slug: string;
  title: string;
  subtitle: string;
  date: string;         // ISO date
  readTime: string;     // e.g. "6 min read"
  category: string;
  featured?: boolean;
  excerpt: string;
  content: string;      // markdown-ish (rendered with simple formatting)
  products?: string[];  // slugs of referenced products
};

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "the-looks-vs-reality-gap",
    title: "The Looks vs. Reality Gap",
    subtitle: "When we scored 36 products on how they look versus how they feel, the biggest names had the biggest gaps.",
    date: "2026-03-19",
    readTime: "7 min read",
    category: "Research",
    featured: true,
    excerpt:
      "Notion scores 4.1 on its interface. Users rate the lived experience a 2.8. That 1.3-point gap isn't a rounding error — it's the distance between a product that photographs well and one that works well.",
    products: ["notion", "airbnb", "arc", "apple-music", "raycast", "linear"],
    content: `We built Ladder to answer a question most product teams avoid: does your product actually feel as good as it looks?

To find out, we scored 36 of the most-used digital products twice. Once on their interface — the screens, the visual design, the information architecture. And once on the lived experience — what real users say on G2, Reddit, the App Store, Hacker News, Trustpilot, and Product Hunt.

The gap between those two numbers is the most honest thing we've ever measured.

## The biggest gaps

**Airbnb: Screen 3.7, Pulse 2.3 (gap: -1.4)**

Airbnb photographs beautifully. The listing cards, the map integration, the category browsing — it all looks like a case study in emotional design. Then you read what users actually say: hidden fees at checkout, a host experience that feels like a different product, a review system that's increasingly gamed. The screen says "discovery." The lived experience says "surprise costs."

**Notion: Screen 4.1, Pulse 2.8 (gap: -1.3)**

Notion's interface is flexible, powerful, and visually clean. It scores well on every visual dimension. But 2,500+ G2 reviews tell a different story: performance degrades with large workspaces, the blank-page syndrome is real, and search — the most critical feature in a knowledge tool — is not fast enough. The product that can do anything struggles to do the one thing users need most: find what they wrote last week.

**Arc Browser: Screen 3.8, Pulse 2.6 (gap: -1.2)**

Arc's sidebar navigation and Spaces concept are genuinely innovative. The interface is thoughtful and different. But real-world usage reveals stability issues, high memory consumption, and a learning curve that punishes people who just want to browse the web. Innovation without reliability is a demo, not a product.

**Apple Music: Screen 3.6, Pulse 2.4 (gap: -1.2)**

Apple Music is visually polished — every screen feels premium. The typography and spatial audio are best-in-class. But App Store reviews average 2.4 out of 5. Users complain about library management, inconsistent navigation, and discovery algorithms that trail Spotify by miles. Beautiful surfaces don't compensate for friction in the tasks you do every day.

## The products where reality exceeds appearance

Not every gap goes the wrong direction.

**Raycast: Screen 3.8, Pulse 4.2 (gap: +0.4)**

Raycast is the only product in our initial dataset where users rate the experience higher than the interface suggests. The UI is minimal — a command bar and extensions. It doesn't look impressive in a screenshot. But users describe it in terms usually reserved for products they can't live without: "replaced five apps," "fastest tool I've ever used," "the extensions are insane." When speed is the design, screenshots undersell it.

**Linear: Screen 4.3, Pulse 4.2 (gap: -0.1)**

Linear's gap is nearly zero. What you see is what you get. The interface promises speed and precision; the lived experience delivers speed and precision. A 0.1-point gap across thousands of data points means the product is honest. There's no marketing layer hiding a different reality underneath.

**Superhuman: Screen 3.8, Pulse 3.8 (gap: 0.0)**

Zero gap. The email client that charges $30/month looks like a $30/month email client and feels like one too. Love it or hate the price, there's no bait-and-switch.

## What the gap actually measures

The Screen-to-Pulse delta isn't a quality score — it's a trust score. Products with small gaps are honest. Products with large gaps are making promises their experience can't keep.

A beautiful interface with a low Pulse score is a warning: this team invests in appearance over substance.

An unremarkable interface with a high Pulse score is an opportunity: this team builds things that work, and hasn't yet invested in making them look as good as they feel.

The gap is where the real story lives.

## Methodology

**Screen Score:** Based on publicly available interface screenshots, marketing sites, and product tours. Scored against the Ladder framework's five dimensions.

**Pulse Score:** Aggregated from G2 reviews, Reddit threads, Hacker News discussions, App Store ratings, Trustpilot scores, Product Hunt reviews, and community forums. Each source is weighted and mapped to Ladder's 1.0–5.0 scale.

Both scores will be updated quarterly. Companies can submit their own screenshots and demo links for a more accurate Screen Score.`,
  },
  {
    slug: "why-linear-is-number-one",
    title: "Why Linear Is #1 (and What Everyone Else Gets Wrong)",
    subtitle: "The highest-scored product on Ladder isn't the prettiest or the most powerful. It's the most honest.",
    date: "2026-03-19",
    readTime: "5 min read",
    category: "Teardown",
    featured: true,
    excerpt:
      "Linear scores 4.3 on screen quality and 4.2 on lived experience. That 0.1-point gap is the smallest in our dataset — and it tells you everything about why this product wins.",
    products: ["linear", "jira", "notion"],
    content: `Linear sits at #1 on the Ladder Top 100 with a 4.3. Not because it's the most visually impressive product (Notion's interface is arguably more ambitious), and not because it's the most feature-rich (Jira covers ten times more workflow configurations). Linear is #1 because every interaction does exactly what it promises.

## What the score actually means

A 4.3 on the Ladder scale puts Linear solidly in "Delightful" territory — a product that anticipates needs and feels like it was designed by someone who uses it every day. But the score alone isn't what makes Linear interesting. The gap is.

Linear's Screen Score is 4.3. Its Pulse Score — aggregated from thousands of G2 reviews, Reddit discussions, and developer forum threads — is 4.2. That 0.1-point gap is the smallest in our entire dataset.

For context: Notion's gap is -1.3. Airbnb's is -1.4. The average gap across all 36 products is -0.6.

Linear's near-zero gap means the product is honest. The interface promises speed; the experience delivers speed. The design promises clarity; every workflow is clear. There's no marketing layer masking a different reality underneath.

## What Linear gets right

**Speed is a feature, not a metric.** Every interaction in Linear completes in under 100ms. This isn't a benchmark they hit and forgot about — it's a design constraint that shapes every decision. Features that would slow the interface don't ship. The result is a product where speed isn't noticed because slowness never interrupts.

**Keyboard shortcuts form a language.** Most products add keyboard shortcuts as accessibility features. Linear designed them as the primary interaction model. The shortcuts aren't random — they follow a grammar (C for create, V for views, G for go-to) that users internalize within days. Once you learn the language, the mouse becomes optional.

**Information density without visual noise.** Linear shows a lot of data on every screen. Issue lists, project boards, cycles, roadmaps — there's always a lot visible. But it never feels cluttered because the visual hierarchy is precise: bold for what matters now, muted for context, invisible until you need it for everything else.

## What Linear gets wrong

No product scores 5.0. Linear's weaknesses:

The mobile experience trails the desktop product significantly. Teams that need to triage issues on the go find the mobile app functional but not fast. Reporting and analytics feel like an afterthought — teams that need to present progress to stakeholders often export to other tools. And custom workflows, while improving, still can't match the configurability of legacy tools like Jira.

## The Jira comparison

Jira scores 2.1 on Ladder. It's the most-used project management tool in the world and one of the lowest-scoring products on our list.

The comparison is instructive: Jira was built to serve methodologies (Scrum, Kanban, SAFe). Linear was built to serve humans. Jira asks "what process are you following?" Linear asks "what are you trying to do?"

This isn't about features — Jira has more. It's about who the product was designed for. Products designed for process score low on lived experience because humans aren't processes.

## The lesson

The best products aren't the ones with the most features or the most beautiful interfaces. They're the ones where the gap between promise and reality approaches zero.

Linear's lesson: make fewer promises and keep all of them.`,
  },
  {
    slug: "notion-the-4-1-product-with-a-2-8-reality",
    title: "Notion: The 4.1 Product with a 2.8 Reality",
    subtitle: "The most flexible workspace tool in the world has the largest gap between how it looks and how it lives.",
    date: "2026-03-18",
    readTime: "6 min read",
    category: "Teardown",
    excerpt:
      "Notion scores 4.1 on interface quality. Users across 2,500+ reviews rate the lived experience at 2.8. The gap reveals a product that's better at promising than delivering.",
    products: ["notion", "linear", "airtable"],
    content: `Notion's interface is genuinely impressive. The block-based editor is flexible, the database views are powerful, and the visual design is clean and confident. It scores 4.1 on screen quality — putting it in Delightful territory.

Then you read what users actually say.

## What 2,500 reviews reveal

Across G2, Reddit, Hacker News, and the App Store, the same themes repeat:

**Performance.** "Notion is great until your workspace gets big." This complaint appears in over 30% of negative reviews. Pages load slowly. Search takes seconds when it should take milliseconds. The product that promises to replace your entire tool stack struggles under the weight of its own flexibility.

**The blank page problem.** Notion can be anything — and that's the problem. New users face an empty workspace and a block menu with 50+ options. The same flexibility that makes power users love Notion makes new users freeze. Template galleries help, but they're a bandage on a structural problem: a product that can do everything gives no guidance on what to do first.

**Search.** For a product that positions itself as your team's knowledge base, search is surprisingly weak. Users report difficulty finding documents they wrote last week. In a tool where you're supposed to put everything, not being able to find anything is a critical failure.

## The flexibility trap

Notion's core bet — one tool that replaces many — creates a paradox. The more flexible the product, the more the experience depends on how you configure it. A well-structured Notion workspace is genuinely powerful. A poorly structured one is a maze.

This means Notion's quality varies by user in a way that most products don't. Your Notion and my Notion are different products. The 4.1 screen score reflects the best Notion can be. The 2.8 Pulse score reflects what Notion actually is for most people.

## Where the gap matters

The -1.3 delta isn't just a number. It's a signal to Notion's product team:

**Invest in performance before features.** The #1 complaint is speed. Every new block type, every new database view, every new AI feature adds to the load. Users will forgive missing features. They won't forgive a slow knowledge base.

**Solve the blank page.** Guided setup, workspace templates that actually structure your work, progressive disclosure that reveals complexity as you need it — these aren't nice-to-haves. They're the difference between a 2.8 and a 3.5.

**Fix search.** A knowledge tool that can't find knowledge isn't a knowledge tool. This is the single highest-leverage improvement Notion can make.

## The comparison

Linear's gap is -0.1. Notion's is -1.3. Both are well-designed products. The difference: Linear chose speed and constraints. Notion chose flexibility and power. The Pulse data suggests users value the former more than the latter.

This doesn't mean Notion is a bad product. It means Notion is a product whose potential exceeds its current execution — and the gap is measurable.`,
  },
  {
    slug: "the-enterprise-ux-crisis",
    title: "The Enterprise UX Crisis in Three Scores",
    subtitle: "Jira (2.1), Salesforce (1.8), Workday (1.6). The software millions use daily is the software nobody would choose.",
    date: "2026-03-18",
    readTime: "5 min read",
    category: "Research",
    excerpt:
      "The three lowest-scoring products on Ladder are also three of the most-used products in the world. That's not a coincidence — it's the enterprise software buying problem in one chart.",
    products: ["jira", "salesforce", "workday"],
    content: `At the bottom of the Ladder Top 100 sit three products that collectively serve hundreds of millions of users:

- **Jira** — 2.1 (Usable)
- **Salesforce** — 1.8 (Functional)
- **Workday** — 1.6 (Functional)

These aren't obscure tools. They're the products that define enterprise software. And they score lower than almost everything else we measured.

## The buying problem

Enterprise software isn't chosen by the people who use it. It's chosen by procurement teams evaluating feature checklists, IT departments evaluating security requirements, and executives evaluating vendor relationships. The person who submits their time off in Workday every Friday had no say in the decision.

This creates a perverse incentive: enterprise software companies optimize for buyers, not users. Feature count matters more than feature quality. Configuration options matter more than default experiences. Sales demos matter more than daily workflows.

The Ladder scores are the result.

## Jira: 2.1

Jira can be configured to support virtually any project management methodology. That's its selling point and its UX liability. The interface serves Scrum, Kanban, and SAFe before it serves the human trying to create an issue and assign it to someone.

Every simple action — creating an issue, checking a sprint, finding a dashboard — requires more steps and more cognitive load than it should. The product has spent two decades adding capability without proportionally investing in usability. Users describe it as "powerful but painful."

For context: Linear does much less and scores 4.3. The features Jira has that Linear doesn't? Most users don't need them.

## Salesforce: 1.8

Salesforce is the most powerful CRM platform in the world. It's also one of the worst user experiences in enterprise software. The Lightning redesign improved surface-level aesthetics but didn't address the fundamental navigation problems: labyrinthine menus, inconsistent patterns across modules, and simple tasks that require too many clicks.

Users don't choose Salesforce. They tolerate it. The most common sentiment in reviews: "It's the industry standard, so we use it." That's not a product endorsement — it's a resignation.

## Workday: 1.6

Workday scores 1.6 — the lowest on our entire list. This is a product used by employees at some of the largest companies in the world to do basic things: submit time off, check pay stubs, update personal information.

Every one of those tasks requires more clicks, more navigation, and more cognitive load than it does on any consumer app. The interface is dated. The navigation requires memorizing paths rather than following intuition. The mobile app exists but provides a compromised experience.

Users describe Workday in terms that should alarm any product team: "I dread using it." "I have to use it, not want to."

## What this means

The enterprise UX crisis isn't about technology — it's about incentives. When the buyer isn't the user, the user's experience becomes secondary. When switching costs are measured in millions of dollars and years of migration, there's no market pressure to improve.

But the pressure is building. Tools like Linear, Mercury, and Notion are proving that business software can score 3.0+ without sacrificing capability. As the generation that grew up with consumer-grade software moves into decision-making roles, the tolerance for 1.6-level experiences will evaporate.

The scores won't lie. And they won't be patient.`,
  },
  {
    slug: "airbnb-the-most-beautiful-2-3",
    title: "Airbnb: The Most Beautiful 2.3 in the World",
    subtitle: "How the product that defined emotional design is failing the people who use it.",
    date: "2026-03-17",
    readTime: "5 min read",
    category: "Teardown",
    excerpt:
      "Airbnb's interface scores 3.7 — emotional design, beautiful photography, discovery that feels like exploring. Users rate the actual experience 2.3. The gap is about trust.",
    products: ["airbnb", "shopify"],
    content: `Airbnb wrote the playbook on emotional design. The listing photography, the map integration, the category browsing (OMG!, Icons, Treehouses) — every pixel is engineered to make you feel something. It works. The screen score is 3.7.

Then you book a stay.

## What the Pulse data says

Across Trustpilot, the App Store, Reddit, and travel forums, the same three themes dominate:

**Hidden fees.** The listing says $150/night. At checkout, it's $245 after cleaning fees, service fees, and taxes that weren't visible during browsing. This isn't a UX issue — it's a trust issue. The emotional design that drew you in sets expectations that the pricing structure breaks.

Users describe this as "bait and switch." Whether intentional or structural, the result is the same: the product creates desire and then erodes trust at the moment of commitment.

**The host experience.** Airbnb's guest-facing product is a 3.7. The host-facing product feels like it was designed by a different company. Host tools are functional but cluttered, with messaging, calendar management, pricing, and reviews spread across interfaces that don't share the same visual language or information architecture.

This matters because hosts are what make Airbnb work. A frustrated host creates a worse guest experience. The two-sided marketplace problem is also a two-sided design problem.

**Review system erosion.** Airbnb reviews trend positive because the system is reciprocal — guests and hosts both know the other will review them. This creates social pressure that inflates ratings. Users increasingly distrust Airbnb reviews, which undermines the platform's credibility at scale.

## The emotional design paradox

Airbnb proves that emotional design can be a liability. When your interface creates strong positive feelings during browsing, any negative surprise during booking or staying hits harder. The delta between expectation and reality is amplified by the quality of the initial experience.

A product with a neutral interface and hidden fees is annoying. A product with a beautiful, emotionally engaging interface and hidden fees feels like a betrayal.

## The 2.3 is a warning

A Pulse score of 2.3 puts Airbnb at "Usable" — users can complete tasks but tolerate the experience rather than enjoy it. For a product whose entire brand is built on emotional connection, scoring "tolerable" on lived experience is a crisis.

The fix isn't more emotional design. It's transparent pricing, a host experience that matches the guest experience, and a review system that users trust. None of these are screen-level problems — they're product-level problems that no amount of beautiful UI can solve.

The gap between 3.7 and 2.3 is the distance between how Airbnb looks and how Airbnb feels. Until that gap closes, the design is a mask, not a mirror.`,
  },
  {
    slug: "what-a-3-0-actually-means",
    title: "What a 3.0 Actually Means",
    subtitle: "The Comfortable threshold is the minimum bar for modern software. Most products don't clear it.",
    date: "2026-03-17",
    readTime: "4 min read",
    category: "Framework",
    excerpt:
      "On the Ladder scale, 3.0 is 'Comfortable' — the point where a product stops making you think and starts just working. Of 36 products scored, only 15 clear this bar.",
    products: [],
    content: `The Ladder framework scores products from 1.0 to 5.0. Most people focus on the high scores — what does a 4.0 look like? What earns a 5.0?

The more important question is: what does a 3.0 mean?

## The Comfortable threshold

Level 3 on Ladder is called "Comfortable." It means:

- No thinking required for common tasks
- Everything is where you expect it to be
- Friction has been removed, not just reduced
- The product gets out of your way

This sounds basic. It is basic. That's the point. A 3.0 doesn't mean a product is exciting, innovative, or beautiful. It means the product works without making you fight it.

## Most products don't clear it

Of the 36 products in our initial Top 100 scoring, only 15 score 3.0 or above. That means 21 of the most prominent digital products in the world — products used by millions of people every day — still make their users think more than they should.

The products below 3.0 include names you'd expect (Jira at 2.1, Salesforce at 1.8, Workday at 1.6) and names you might not (Coinbase at 2.9, Airtable at 2.9, Midjourney at 2.8, Discord at 2.8).

## Why 3.0 is the bar

We call 3.0 the "modern minimum" because it's what users now expect from any digital product. Not because of some abstract standard — because of exposure.

The average person uses 30+ digital products. They use Uber and expect clear status. They use iMessage and expect instant send. They use Google and expect useful results in milliseconds. These baseline experiences set a 3.0 floor in users' minds.

When your product scores below 3.0, you're not competing against some theoretical standard. You're competing against the best interaction your user had today on any other product.

## The 2.0 trap

Many products get stuck in what we call the "2.0 trap." They're usable — tasks can be completed — but every interaction requires slightly more effort than it should. Finding a setting takes two extra clicks. The loading state doesn't tell you what's happening. The error message doesn't tell you how to fix it.

No single issue is a dealbreaker. The accumulation is.

Products in the 2.0-2.9 range often have strong underlying technology, capable teams, and reasonable feature sets. What they lack is the editorial discipline to remove friction from every common task. They shipped the feature but didn't stay long enough to make it effortless.

## Getting from 2.0 to 3.0

The path from 2.0 to 3.0 isn't about adding features. It's about:

**Reducing steps.** Every common task should take the minimum possible actions. If users do something 10 times a day and it takes 4 clicks, making it take 2 clicks saves 20 clicks daily. Multiply by your user base.

**Meeting expectations.** Put things where people look for them first. Use patterns that match what users know from other products. Surprise is the enemy of Comfortable.

**Removing friction.** Every loading state, every ambiguous label, every confirmation dialog that doesn't need to exist — remove it. Friction compounds.

**Defaulting correctly.** The best settings are the ones users never change. If 80% of users would choose the same option, make it the default and hide the setting.

3.0 isn't ambitious. It's table stakes. And most of the software world hasn't earned it yet.`,
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function getFeaturedPosts(): BlogPost[] {
  return BLOG_POSTS.filter((p) => p.featured);
}
