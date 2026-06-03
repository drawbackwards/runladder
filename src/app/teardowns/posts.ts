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
    score: "3.9",
    scoreColor: "#eab308",
    title: "Figma: Collaboration as a First-Class Design Primitive",
    subtitle:
      "Figma made design multiplayer. That was the right bet. We ran the product through the Ladder framework to find out what it costs.",
    date: "2026-06-01",
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

**3.9. Comfortable.** Interface score and sentiment signal land within 0.1 of each other, which is rare. Most products have a larger gap between how they look and how they feel over time. Figma's gap is narrow.

The 3.9 reflects a product where the core interaction model is genuinely excellent. Real-time collaboration is not a feature bolted on after the fact. It is the foundation everything else is built on. The component and variant system enables real design systems work. Auto-layout is the best spatial reasoning tool in any design application. The plugin ecosystem extends capability without bloating the core UI.

What keeps the score out of Delightful is a cluster of surfaces that do not match the quality of the foundation. They are not catastrophic. But they accumulate.

## Rung by rung

### Hierarchy

The canvas-first layout is correct. The toolbar is minimal and contextual. Side panels collapse when irrelevant. Figma understands the difference between working context and configuration context. Most tools miss that distinction entirely.

Where hierarchy breaks down: the layers panel. On any file built by more than one person over more than two weeks, the layers panel becomes an archaeology dig. The naming conventions of the original designer are the only map. Figma provides no system-level scaffolding for multi-contributor files. It is entropy by design.

### Spacing

Tight, intentional, and consistent with what a design tool should feel like. Panels are dense without feeling cluttered. That is harder to achieve than it looks.

Auto-layout controls are the exception. The spacing and padding controls inside an auto-layout frame require you to know what you are looking for. New users consistently miss them on first pass. The visual encoding is present. The discoverability is not.

### Copy

Most of Figma's UI language is clean and correct. Frame. Component. Instance. These are precise terms with consistent usage. The copy does not oversell.

Variables are the exception. Variable modes, variable collections, resolved value. This is language that makes sense to the person who designed the system and no one else. Variables are a powerful feature held back by vocabulary that assumes fluency the user has not yet developed.

### Accessibility

The product designers build in has limited keyboard navigation. If you rely on a keyboard for motor accessibility, the canvas is effectively inaccessible. Drag-and-drop is the primary interaction model for almost everything that matters.

Contrast within the Figma UI varies. Some panel states fall below acceptable ratios in dark mode. The irony of a design tool with accessibility gaps is not lost on the designers who notice it.

### Navigation

Moving within a single file is smooth. The canvas handles zoom, pan, and fit well. Page navigation is clean.

The drop-off comes at the file level. Finding an asset across a large component library requires either perfect naming discipline or a plugin. The native search is improved but remains a second-class experience compared to what a tool used for organizing design work should provide.

Dev mode handoff still requires too many clicks. The path from design to developer is shorter than it used to be, but it has not been rationalized. That cost shows up in every handoff, every sprint.

Cross-file navigation is fragmented enough that most teams duplicate components rather than manage the link. That is a workflow cost the score reflects.

### Visual

Figma's visual design is excellent and earns the product's reputation. The UI is minimal without being spartan. Iconography is precise. The canvas stays out of the way of the work.

Where this breaks down is in the interface complexity that has grown with each major release since the Adobe acquisition attempt. Features have been added without the same discipline that governed the original product. The navigation overhead is noticeable. It does not ruin the experience. But it makes the product feel less like itself.

## The sentiment signal

Ladder's sentiment analysis pulls from 2,600+ data points across professional review platforms, community forums, and public discourse. The result is a **3.8** sentiment score, a 0.1 gap below the interface score.

Professional review platforms rate Figma 4.7/5. The community signal is very positive. Product launch platforms consistently top-rate it.

The 0.1 gap is honest. The designers who use Figma every day rate it highly. The specific frustrations that create drag are real but bounded: performance on large files, prototyping complexity, and the lingering question of what happens to the product under Figma's current ownership structure.

## What would move the score

Three changes would have the most measurable impact.

First: a layers panel organization system that works for multi-contributor files. Not better naming conventions. A structural solution to the archaeology problem.

Second: variable onboarding that does not assume fluency. The concept is sound. The vocabulary is the barrier. A progressive disclosure approach would unlock the feature for the majority of users who currently avoid it.

Third: prototyping that matches the canvas interaction model in intuitiveness. The capability is there. The experience of building complex interactions is not yet at the level of the rest of the product. Closing that gap would move the score.

## The bottom line

Figma is a Comfortable product that has earned its position as the industry standard. The real-time collaboration bet was right and it changed the entire category. The core interaction model is one of the better things built in design tooling over the last decade.

The problems are real but bounded. They live in specific surfaces and specific user segments, not in the foundation.

The gap between interface score and sentiment signal is smaller for Figma than for almost any other enterprise-category tool we have scored. Figma is not overscoring relative to how it feels to use. That is the highest compliment the framework can offer.

If you design in Figma, you already know what is in this teardown. What the score gives you is a way to say it precisely.`,
  },
];
