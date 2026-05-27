export type TeardownPost = {
  slug: string;
  product: string;
  /** Ladder Screen Score as a display string. Use "TBD" until Ward confirms. */
  score: string;
  /** Hex color matching the score range. Use "#6AC89B" (green) for TBD. */
  scoreColor: string;
  /** True when the score has not yet been confirmed by Ward. */
  scoreTbd?: boolean;
  title: string;
  subtitle: string;
  date: string;
  readTime: string;
  featured?: boolean;
  excerpt: string;
  /** Markdown-ish string. Supports ## H2, ### H3, **bold**, *italic*, [link](url). */
  content: string;
};

export function getTeardownBySlug(slug: string): TeardownPost | undefined {
  return TEARDOWN_POSTS.find((p) => p.slug === slug);
}

export const TEARDOWN_POSTS: TeardownPost[] = [
  {
    slug: "figma",
    product: "Figma",
    score: "TBD",
    scoreColor: "#6AC89B",
    scoreTbd: true,
    title: "Figma: The Golden Standard for Designers",
    subtitle:
      "Figma is one of the most used design tools on the market, so we ran it through the framework.",
    date: "2026-05-27",
    readTime: "8 min read",
    featured: true,
    excerpt:
      "Figma is the tool every Ladder user opens first. We applied the full Ladder framework, rung by rung, to find out if the product designers build in is the product they deserve to use.",
    content: `Figma is not a choice. It is the default.

In 2026, a professional product designer using anything other than Figma is making a deliberate statement. Figma won the format war. The canvas is the standard. The community is the ecosystem. The plugin library is the foundation.

That makes it an unusual subject for a teardown.

We do not do teardowns to expose bad products. We do them to apply the Ladder framework to products people use every day. To put a number on what everyone already senses but rarely says out loud. The most useful teardowns are the honest ones on the tools that shape how design gets done.

So we ran Figma through the framework.

## What we scored

We applied the full Ladder screen scoring analysis to Figma's core product surface: the file editor. The canvas, the toolbar, the side panels, the properties inspector, the layers panel, and the key flows: publishing, sharing, importing, and component publishing.

We did not score FigJam. We did not score Dev Mode. We scored the surface most designers spend most of their time in: the main canvas editing experience.

## The score

Figma lands in the **Comfortable** range. Not because it is merely acceptable, but because "no thinking required" is genuinely the experience for most of the product, most of the time. Until it is not.

The score reflects what is actually there. Figma's core canvas interaction model is excellent. The mental model is one of the more coherent design environments ever built: infinite canvas, component system, constraints, auto-layout, all pulling in the same direction. That coherence earns a high baseline.

What keeps the score out of Delightful is a cluster of surfaces that do not match the quality of the core. They are not catastrophic. But they are noticeable, and they accumulate.

## Rung by rung

### Hierarchy

The canvas-first layout is correct. The toolbar is minimal and contextual. Side panels collapse when irrelevant. Figma understands the difference between working context and configuration context. Most tools miss that distinction entirely.

Where hierarchy breaks down: the layers panel. On any file built by more than one person, over more than two weeks, the layers panel becomes an archaeology dig. The naming conventions of the original designer are the only map. Figma provides no system-level scaffolding. It is entropy by design.

### Spacing

Tight, intentional, and consistent with what a design tool should feel like. Panels are dense without feeling cluttered. That is harder to achieve than it looks.

Auto-layout controls are the exception. The spacing and padding controls inside an auto-layout frame require you to know what you are looking for. New users consistently miss them on the first pass. The visual encoding is present. The discoverability is not.

### Copy

Most of Figma's UI language is clean and correct. Frame. Component. Instance. These are precise terms with consistent usage. The copy does not oversell.

Variables are the exception. Variable modes, variable collections, resolved value. This is language that makes sense to the person who designed the system and no one else. Variables are a powerful feature held back by vocabulary that assumes fluency the user has not yet developed.

### Accessibility

The product designers build in has limited keyboard navigation. If you rely on a keyboard for motor accessibility, the canvas is effectively inaccessible. Drag-and-drop is the primary interaction model for almost everything that matters.

Contrast within the Figma UI varies. Some panel states drop below 3:1 contrast in dark mode. The irony of a design tool with accessibility gaps is not lost on the designers who notice it.

### Navigation

Moving within a single file is smooth. The canvas handles zoom, pan, and fit well. Page navigation is clean.

The drop-off comes at the file level. Finding an asset across a large component library requires either perfect naming discipline or a plugin. The native search is improved, but remains a second-class experience compared to what a tool used for organizing design work should provide.

Cross-file navigation is fragmented enough that most teams duplicate components rather than manage the link. That is a workflow cost the score reflects.

### Visual

Figma's visual design is excellent and earns the product's reputation. The UI is minimal without being spartan. Iconography is precise. The canvas stays out of the way of the work. This is intentional and it is right.

## The gap

The screen score tells one side of the story. The other side is what designers say after a year with the product.

The lived experience narrative from the design community centers on three things: performance, pricing, and trust.

**Performance.** Large files with many components, nested auto-layouts, and multiple pages slow down. For many design systems teams, this is a design constraint, not just a technical one. They architect files around Figma's performance limits rather than their own organizational needs.

**Pricing.** The 2023 removal of the free organization tier changed the economic relationship between Figma and the teams who had built workflows around it. The designers who pay for Figma did not change how they feel about the canvas. The teams who lost free access changed how they feel about the company.

**Trust.** The attempted Adobe acquisition introduced a layer of "what are they going to do with this" into the user relationship. Trust is not a rung. But it is a ceiling on how high a lived experience score can go.

## What would move the score

Three changes would have the most measurable score impact.

First, a layers panel organization system that works for multi-contributor files. Not better naming conventions. A structural solution to the archaeology problem.

Second, variable onboarding that does not assume fluency. The concept is sound. The vocabulary is the barrier. A progressive disclosure approach would unlock the feature for the majority of users who currently avoid it.

Third, performance parity between small and large files. If the canvas interaction model holds for a 20-page file the same way it holds for a 2-page file, the score goes up. When it does not, everything else the product does right is undermined by the moment it stops working.

## The bottom line

Figma is a Comfortable product that has earned its position as the industry standard. The core interaction model is one of the better things built in design tooling over the last decade. The problems are real but bounded. They live in specific surfaces and specific user segments, not in the foundation.

The gap between the screen score and the lived experience is smaller than it is for most enterprise tools. Figma is not overscoring relative to how it feels. That is actually the highest compliment the framework can offer.

If you design in Figma, you already know what is in this teardown. What the score gives you is a way to say it precisely.`,
  },
];
