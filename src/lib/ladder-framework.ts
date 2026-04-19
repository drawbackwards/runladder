/**
 * Ladder Framework — PROTECTED IP.
 *
 * Single source of truth for all Ladder logic — levels, signals, evaluation
 * dimensions, scoring principles, design types, AI experience lens, survey
 * domains, rung weights, and prompt builders.
 *
 * This is the only place this content lives. Every surface (web, Figma,
 * Claude Skill, Pulse, API, MCP) must consume from here, either by direct
 * import (within runladder) or by calling runladder's API.
 *
 * MUST stay server-side. Never import from client components.
 * See /memory/feedback_never_expose_prompts_rubric.md for the full rule.
 */

/* ── Levels ─────────────────────────────────────────────────────────────── */

export type LadderLevel = {
  score: string;
  name: "Functional" | "Usable" | "Comfortable" | "Delightful" | "Meaningful";
  tagline: string;
  description: string;
  signals: string[];
  experienceTest?: string;
};

export const LEVELS: LadderLevel[] = [
  {
    score: "1.0–1.9",
    name: "Functional",
    tagline: "User fights the product. Trial, error, frustration.",
    description: "Built for engineering, not humans.",
    signals: [
      "no clear visual hierarchy",
      "primary actions buried or missing",
      "no feedback states",
      "confusing navigation",
      "walls of undifferentiated text",
      "poor error handling",
      "no clear entry point for the user's task",
    ],
  },
  {
    score: "2.0–2.9",
    name: "Usable",
    tagline: "Tasks can be completed with effort. Basic structure exists.",
    description: "User tolerates it but would switch.",
    signals: [
      "basic hierarchy but weak",
      "CTAs present but not prominent enough",
      "inconsistent spacing",
      "copy is functional but not scannable",
      "forms work but feel laborious",
      "some visual noise or clutter",
    ],
  },
  {
    score: "3.0–3.9",
    name: "Comfortable",
    tagline: "Intuitive. Users feel their way without thinking.",
    description:
      "Modern minimum bar. Less is more — information is differentiated, not just organized.",
    signals: [
      "users navigate intuitively without conscious decision-making",
      "different types of information are visually differentiated (color, style, weight) to add context",
      "less content, not more — only what serves the user is present",
      "strong visual hierarchy (clear H1 > H2 > body)",
      "obvious primary CTA",
      "consistent spacing system",
      "proper empty/error/loading states",
      "WCAG AA contrast",
    ],
    experienceTest:
      "Can a user navigate this without conscious decision-making? Does information differentiation create instant context?",
  },
  {
    score: "4.0–4.9",
    name: "Delightful",
    tagline:
      "Assistive. The UI actively helps, guides, and packages information for quick decisions.",
    description:
      "Users are delighted by receiving help they did not ask for. They refer others.",
    signals: [
      "UI transforms contextually to serve the user's current need",
      "information is pre-packaged to enable quick buying or thinking decisions",
      "proactive guidance — the product anticipates what the user needs next",
      "smart defaults that reduce effort",
      "contextual help appears at the right moment without being asked",
      "progressive disclosure done well",
      "warm human copy with personality",
    ],
    experienceTest:
      "Does the product anticipate and serve needs before the user articulates them? Does it package information to accelerate decisions?",
  },
  {
    score: "5.0",
    name: "Meaningful",
    tagline: "Irreplaceable utility. Nothing else fills this role.",
    description:
      "Can't go back. The go-to tool — this is the ceiling, almost nothing reaches it.",
    signals: [
      "unique features or workflows that cannot be replicated elsewhere",
      "loyalty features and addictive loops that create attachment",
      "complete workflows that eliminate the need to leave",
      "deep personalization — product remembers context and adapts",
      "interface recedes completely — the tool becomes invisible",
      "automation removes manual steps users used to accept",
    ],
    experienceTest:
      "Would losing this product leave a gap nothing else fills? Are there features, workflows, or loops that create genuine attachment?",
  },
];

/* ── Evaluation dimensions ──────────────────────────────────────────────── */

export type EvaluationDimension = {
  name: string;
  note?: string;
  criteria: string[];
};

export const EVALUATION_DIMENSIONS: EvaluationDimension[] = [
  {
    name: "VISUAL HIERARCHY",
    note: "most critical",
    criteria: [
      "Can the user identify the primary action within 3 seconds?",
      "Is there a clear reading order? (F-pattern or Z-pattern for western audiences)",
      "Does typographic scale create clear levels? (H1 should be 2-3x body size)",
      "Is contrast used intentionally to guide attention, not randomly?",
      "Gestalt proximity: are related elements grouped? Are unrelated elements separated?",
    ],
  },
  {
    name: "CALLS TO ACTION",
    criteria: [
      "Is there ONE clear primary action per screen/section?",
      "Does the primary CTA have the strongest visual weight (size, color, contrast)?",
      'Is CTA copy action-oriented and specific? ("Find Jobs" > "Submit", "Get Started" > "Click Here")',
      "Fitts's Law: are important targets large enough and positioned accessibly?",
      "Is there a clear visual distinction between primary, secondary, and tertiary actions?",
    ],
  },
  {
    name: "TYPOGRAPHY & COPY",
    criteria: [
      "Is copy written for scanning, not reading? (short paragraphs, clear headings, bullet points)",
      "Does the heading immediately communicate what this screen is for?",
      "Is body text 16px+ for readability?",
      "Are font weights used to create hierarchy, not decoration?",
      "Is the copy written from the user's perspective, not the company's?",
    ],
  },
  {
    name: "LAYOUT & SPACING",
    criteria: [
      "Is spacing consistent? (ideally based on a 4px or 8px grid)",
      "Is there adequate whitespace to let content breathe?",
      "Are content blocks clearly separated with consistent gutters?",
      "Does the layout guide the eye naturally through the content?",
      "On wide screens: is content width constrained for readability? (max ~70-80 characters per line)",
    ],
  },
  {
    name: "COLOR & CONTRAST",
    criteria: [
      "WCAG AA requires 4.5:1 contrast for body text, 3:1 for large text (24px+ or 18.66px+ bold)",
      "Is color used with purpose (hierarchy, state, category) not just decoration?",
      "Is there a clear primary brand color used consistently for interactive elements?",
      "Are semantic colors used correctly? (red=error/danger, green=success, yellow=warning)",
    ],
  },
  {
    name: "INFORMATION ARCHITECTURE",
    criteria: [
      "Hick's Law: are choices minimized per decision point?",
      "Miller's Law: are groups of items kept to 5-9 where possible?",
      "Is navigation clear and predictable?",
      'Can the user answer "Where am I?" and "What can I do here?" immediately?',
    ],
  },
  {
    name: "ACCESSIBILITY",
    criteria: [
      "Touch/click targets should be 44x44px minimum (Apple HIG), 48x48dp (Material)",
      "Is the interface usable without relying solely on color to convey meaning?",
      "Are interactive elements visually distinct from static content?",
      "Is text readable without zooming?",
    ],
  },
];

/* ── Scoring principles ─────────────────────────────────────────────────── */

export const SCORING_PRINCIPLES: string[] = [
  "The Ladder is a truth-o-meter. Beautiful screens can score 1.4. Simple screens can score 3.2.",
  "Evaluate as a real user trying to accomplish a task. What is the task? Can they do it? How does it feel?",
  "Be honest. Most screens land at Level 1 or 2. Level 3 is the modern minimum bar — it must be earned. Level 5 is the ceiling.",
  "Acknowledge what the design does WELL before pointing out issues. Good design decisions matter.",
  "Base your evaluation on what is ACTUALLY present. If there is a clear CTA, say so. If there is a hero section, acknowledge it.",
  "Higher rungs require more evidence. Delightful and Meaningful require expressed enthusiasm, joy, and delight — not just absence of complaints. Functional and Usable require little to no enthusiasm to achieve.",
  "Score what is present. Do not penalize what is absent. If a state or feature is not shown, assume it exists elsewhere. Evaluate what is actually in front of you.",
  "Levels 1–2 measure INTERFACE quality (hierarchy, spacing, contrast). Levels 3–5 measure EXPERIENCE quality (intuitiveness, assistance, irreplaceability). A screen with perfect spacing but no intuitive flow caps at high 2.x. A screen that actively guides users can reach 4.x even with minor visual issues.",
  "For each level, apply the experience test: Comfortable — can users navigate without thinking? Delightful — does the UI anticipate needs and package information for quick decisions? Meaningful — would losing this leave a gap nothing fills?",
];

/* ── Design types ───────────────────────────────────────────────────────── */

export type DesignType = {
  type: string;
  label: string;
  description: string;
  evaluationFocus: string;
  aiLens?: boolean;
};

export const DESIGN_TYPES: DesignType[] = [
  {
    type: "ui",
    label: "User Interface",
    description:
      "App screen, dashboard, settings, form, or interactive product view",
    evaluationFocus:
      "Task completion, navigation clarity, input efficiency, feedback states, information density",
  },
  {
    type: "landing-page",
    label: "Landing Page",
    description:
      "Marketing page with a conversion goal — sign up, download, purchase",
    evaluationFocus:
      "Value proposition clarity, CTA prominence, trust signals, scroll narrative, conversion friction",
  },
  {
    type: "marketing-website",
    label: "Marketing Website",
    description:
      "Multi-section brand or product website — about, features, pricing, contact",
    evaluationFocus:
      "Brand clarity, content hierarchy, navigation, information scent, visual storytelling",
  },
  {
    type: "email",
    label: "Email",
    description: "Transactional, marketing, or newsletter email",
    evaluationFocus:
      "Scanability, single clear CTA, mobile readability, subject-to-content alignment, unsubscribe clarity",
  },
  {
    type: "signage",
    label: "Signage / Environmental",
    description:
      "Physical signage, wayfinding, poster, banner, or environmental design",
    evaluationFocus:
      "Legibility at distance, information hierarchy under time pressure, directional clarity, contrast in variable lighting",
  },
  {
    type: "presentation",
    label: "Presentation / Deck",
    description: "Slide deck, pitch deck, or presentation material",
    evaluationFocus:
      "One idea per slide, visual support for narrative, data visualization clarity, consistent template usage",
  },
  {
    type: "ai-powered",
    label: "AI-Powered Experience",
    description:
      "Interface where AI generates, recommends, adapts, or personalizes content — chatbots, copilots, recommendation engines, AI assistants, generative tools",
    evaluationFocus:
      "Trust, transparency, personalization quality, response relevance, error recovery, user control over AI behavior",
    aiLens: true,
  },
  {
    type: "other",
    label: "Other Design",
    description: "Design that does not fit the categories above",
    evaluationFocus:
      "Apply general Ladder principles: clarity, hierarchy, purpose, user empathy",
  },
];

/* ── AI-Powered Experience Lens ─────────────────────────────────────────── */

export type AiLensEntry = {
  keyword: string;
  shift: string;
  signals?: string[];
  experienceTest?: string;
};

export const AI_EXPERIENCE_LENS: Record<
  "Comfortable" | "Delightful" | "Meaningful",
  AiLensEntry
> = {
  Comfortable: {
    keyword: "Intuitive",
    shift:
      "Same as traditional — intuitive navigation, information differentiation, less is more. The universal bar does not change for AI.",
  },
  Delightful: {
    keyword: "Tailored + Assistive",
    shift:
      "The experience adapts to the user. The UI changes based on context, situation, past behavior, and anticipated future behavior. Assistance becomes personal — not generic help, but help shaped by what this specific user needs right now.",
    signals: [
      "UI adapts based on user context, history, or situation",
      "responses or content feel personalized, not generic",
      "the system anticipates what the user will need next based on past behavior",
      "information is pre-filtered or pre-organized for this specific user",
      "the experience feels like it knows you",
    ],
    experienceTest:
      "Does the AI tailor its behavior to this specific user? Does the experience change based on context, history, or anticipated needs — or does it treat every user the same?",
  },
  Meaningful: {
    keyword: "Trusted",
    shift:
      "Irreplaceability through trust, not just utility. The user believes in the system's judgment, relies on its outputs, feels safe delegating decisions to it. Trust is harder to earn than habit.",
    signals: [
      "user trusts the AI's judgment enough to act on its recommendations without second-guessing",
      "the system is transparent about its reasoning — users understand why it suggests what it suggests",
      "consistent accuracy builds confidence over time",
      "the user feels safe delegating decisions or tasks to the system",
      "errors are handled gracefully — the system acknowledges mistakes, which reinforces trust",
      "the user would feel uneasy using a competing tool because they trust this one",
    ],
    experienceTest:
      "Does the user trust the AI enough to delegate decisions to it? Would they feel uneasy switching to an alternative — not from habit, but from trust?",
  },
};

/* ── Rung names ─────────────────────────────────────────────────────────── */

export type RungName =
  | "functional"
  | "usable"
  | "comfortable"
  | "delightful"
  | "meaningful";

export const RUNG_NAMES: RungName[] = [
  "functional",
  "usable",
  "comfortable",
  "delightful",
  "meaningful",
];

/* ── Utilities ──────────────────────────────────────────────────────────── */

export function getLevel(score: number | string): LadderLevel {
  const n = typeof score === "number" ? score : parseFloat(score);
  if (n >= 5.0) return LEVELS[4];
  if (n >= 4.0) return LEVELS[3];
  if (n >= 3.0) return LEVELS[2];
  if (n >= 2.0) return LEVELS[1];
  return LEVELS[0];
}

export function getLevelName(score: number | string): LadderLevel["name"] {
  return getLevel(score).name;
}

/* ── Prompt builders ────────────────────────────────────────────────────── */

/**
 * Full prompt block — levels with signals, evaluation dimensions, scoring
 * principles. AI experience lens is injected separately based on design type.
 */
export function ladderFullPrompt(): string {
  let p = "";

  p += "YOUR SCORING FRAMEWORK — THE DRAWBACKWARDS LADDER:\n";
  p +=
    "The Ladder measures the quality of a user's lived experience. Score from 1.0 to 5.0.\n";
  p +=
    "The integer IS the level. The decimal shows progress through that level. 5.0 is the ceiling — a perfect score.\n\n";

  for (const level of LEVELS) {
    const levelInt = level.score.split("–")[0].split(".")[0];
    p += `Level ${levelInt} — ${level.name} (${level.score})\n`;
    p += `${level.tagline} ${level.description}\n`;
    p += `Signals: ${level.signals.join(", ")}.\n`;
    if (level.experienceTest) {
      p += `EXPERIENCE TEST: ${level.experienceTest}\n`;
    }
    p += "\n";
  }

  p += "HOW TO EVALUATE — THINK LIKE A DESIGN LEADER:\n\n";
  EVALUATION_DIMENSIONS.forEach((dim, i) => {
    p += `${i + 1}. ${dim.name}${dim.note ? " (" + dim.note + ")" : ""}\n`;
    dim.criteria.forEach((c) => {
      p += `- ${c}\n`;
    });
    p += "\n";
  });

  p += "SCORING PRINCIPLES:\n";
  SCORING_PRINCIPLES.forEach((pr) => {
    p += `- ${pr}\n`;
  });
  p += "\n";

  return p;
}

/**
 * Compact prompt — one line per level, suitable for chat/coaching context.
 */
export function ladderCompactPrompt(): string {
  let p = "THE LADDER FRAMEWORK:\n";
  for (const level of LEVELS) {
    const range = level.score.padEnd(7);
    p += `- ${range}  ${level.name.padEnd(11)}: ${level.tagline}\n`;
  }
  p += "\n";
  return p;
}

/**
 * Per-rung scoring instructions — append to scoring prompt when rung breakdown
 * is required in the response.
 */
export function ladderPerRungPrompt(): string {
  let p =
    "PER-RUNG SCORING — score each rung INDEPENDENTLY (1.0 to 5.0):\n";
  p += 'Include a "rungs" object in your response with scores and summaries.\n\n';

  p += "RUNG SCORING RULES:\n";
  p +=
    "- Score each rung based on how well this screen performs on that rung's criteria.\n";
  p +=
    "- A product can be strong on lower rungs and weak on upper — that's normal and expected.\n";
  p +=
    '- "meaningful" = is it irreplaceable? Would the user feel loss without it?\n';
  p +=
    '- "delightful" = does it anticipate needs? Provide contextual help? Feel assistive?\n';
  p +=
    '- "comfortable" = is it intuitive? Can users navigate by feel, not by reading?\n';
  p +=
    '- "usable" = can tasks be completed without undue effort? Are patterns consistent?\n';
  p +=
    '- "functional" = do basic tasks work? Can the user find and use the core feature?\n';
  p +=
    '- The total "score" should reflect the weighted combination — functional failures weigh more than absent delight.\n';
  p += "- Provide a one-sentence summary per rung, from the user's perspective.\n";
  p += '- Tag each finding with "rung": which rung it primarily impacts.\n\n';

  p += 'Example "rungs" shape:\n';
  p += '"rungs": {\n';
  p +=
    '  "meaningful":  { "score": 1.0, "summary": "No unique value or attachment." },\n';
  p +=
    '  "delightful":  { "score": 1.0, "summary": "No anticipation of user needs." },\n';
  p +=
    '  "comfortable": { "score": 1.4, "summary": "Not intuitive. Users must think about the interface." },\n';
  p +=
    '  "usable":      { "score": 2.1, "summary": "Effort required. Patterns inconsistent across screens." },\n';
  p +=
    '  "functional":  { "score": 3.8, "summary": "Core tasks completable but feedback states missing." }\n';
  p += "}\n\n";

  return p;
}

/* ── Feedback / Pulse — Survey Domains ──────────────────────────────────── */

export type SurveyStatement = {
  rung: RungName;
  statement: string;
};

export type SurveyDomainKey = "b2b" | "b2c" | "process" | "service";

export type SurveyDomain = {
  label: string;
  placeholder: string;
  statements: SurveyStatement[];
};

export const SURVEY_DOMAINS: Record<SurveyDomainKey, SurveyDomain> = {
  b2b: {
    label: "Business to Business",
    placeholder: "Product",
    statements: [
      { rung: "functional", statement: "{{name}} allows me to complete my task every time." },
      { rung: "functional", statement: "{{name}} met the basic needs of my job." },
      { rung: "functional", statement: "{{name}} allows me to do my job properly." },
      { rung: "functional", statement: "{{name}}'s buttons, links, drop-down menus and other features always work." },
      { rung: "functional", statement: "{{name}} performs the way I expect it to." },
      { rung: "usable", statement: "{{name}} is easy to use." },
      { rung: "usable", statement: "{{name}} is useful and practical." },
      { rung: "usable", statement: "{{name}} does not require a user manual or technical support to learn." },
      { rung: "usable", statement: "{{name}} presents the information I hoped to see." },
      { rung: "usable", statement: "When I click a button or take another action, {{name}} does what I expected it to do." },
      { rung: "comfortable", statement: "{{name}} makes it easy to find what I'm looking for." },
      { rung: "comfortable", statement: "Everything about {{name}} feels like it's in the right place." },
      { rung: "comfortable", statement: "I am confident in my abilities when using {{name}}." },
      { rung: "comfortable", statement: "I rarely get lost using {{name}}." },
      { rung: "comfortable", statement: "{{name}} is something I don't mind using frequently for my job." },
      { rung: "delightful", statement: "{{name}} surprises me, anticipating my needs." },
      { rung: "delightful", statement: "{{name}} is pretty great when compared to similar products." },
      { rung: "delightful", statement: "{{name}} is one of the favorite tools I use for my job." },
      { rung: "delightful", statement: "I would describe {{name}} as helpful to my task." },
      { rung: "delightful", statement: "{{name}} helps me achieve my tasks or goals in a way I haven't before." },
      { rung: "meaningful", statement: "I would be disappointed if {{name}} went away." },
      { rung: "meaningful", statement: "{{name}} has saved me time and/or money." },
      { rung: "meaningful", statement: "I'm likely to recommend {{name}} to my colleagues." },
      { rung: "meaningful", statement: "{{name}} makes my job better." },
      { rung: "meaningful", statement: "{{name}} has helped me improve my work life." },
    ],
  },
  b2c: {
    label: "Business to Consumer",
    placeholder: "Product",
    statements: [
      { rung: "functional", statement: "{{name}} met my basic needs." },
      { rung: "functional", statement: "{{name}} allows me to do what I need to do." },
      { rung: "functional", statement: "{{name}} allows me to complete my task every time." },
      { rung: "functional", statement: "{{name}}'s buttons, links, drop-down menus and other features always work." },
      { rung: "functional", statement: "{{name}} works as expected." },
      { rung: "usable", statement: "{{name}} is easy to use." },
      { rung: "usable", statement: "{{name}} is useful and practical." },
      { rung: "usable", statement: "{{name}} does not require a user manual or technical support to learn." },
      { rung: "usable", statement: "{{name}} presents the information I hoped to see." },
      { rung: "usable", statement: "When I click a button or take another action, {{name}} does what I expected it to do." },
      { rung: "comfortable", statement: "{{name}} makes it easy to find what I'm looking for." },
      { rung: "comfortable", statement: "Everything about {{name}} feels like it's in the right place." },
      { rung: "comfortable", statement: "{{name}} gives me confidence when I use it." },
      { rung: "comfortable", statement: "I rarely get lost using {{name}}." },
      { rung: "comfortable", statement: "{{name}} is something I would like to use frequently." },
      { rung: "delightful", statement: "{{name}} surprises me, anticipating my needs." },
      { rung: "delightful", statement: "{{name}} is pretty great." },
      { rung: "delightful", statement: "{{name}} makes me smile when I use it." },
      { rung: "delightful", statement: "I would describe {{name}} as helpful to my task." },
      { rung: "delightful", statement: "{{name}} helps me achieve my tasks or goals in a way I haven't before." },
      { rung: "meaningful", statement: "I would be disappointed if {{name}} went away." },
      { rung: "meaningful", statement: "{{name}} has saved me time and/or money." },
      { rung: "meaningful", statement: "I'm likely to recommend {{name}} to my friends." },
      { rung: "meaningful", statement: "{{name}} makes my life better." },
      { rung: "meaningful", statement: "{{name}} has helped me improve my work and/or life." },
    ],
  },
  process: {
    label: "Process or Procedure",
    placeholder: "Process",
    statements: [
      { rung: "functional", statement: "{{name}} fulfills my expectations." },
      { rung: "functional", statement: "{{name}} works without using any workarounds." },
      { rung: "functional", statement: "{{name}} always meets my needs." },
      { rung: "functional", statement: "{{name}} does not require additional steps to get things right." },
      { rung: "functional", statement: "I can usually get through {{name}} without a problem." },
      { rung: "usable", statement: "{{name}} is easy to interact with." },
      { rung: "usable", statement: "{{name}} is useful and practical." },
      { rung: "usable", statement: "{{name}} is easy to understand." },
      { rung: "usable", statement: "{{name}} provides what I hope for." },
      { rung: "usable", statement: "{{name}} delivers what I expect." },
      { rung: "comfortable", statement: "I have confidence in {{name}}." },
      { rung: "comfortable", statement: "{{name}} is convenient." },
      { rung: "comfortable", statement: "I don't mind completing {{name}} regularly." },
      { rung: "comfortable", statement: "{{name}} requests the right thing at the right time." },
      { rung: "comfortable", statement: "It's easy to get what I need from {{name}}." },
      { rung: "delightful", statement: "{{name}} surprises me, anticipating my needs." },
      { rung: "delightful", statement: "{{name}} anticipates what I'll need to do before I need to do it." },
      { rung: "delightful", statement: "{{name}} needs no improvement." },
      { rung: "delightful", statement: "I enjoy {{name}}." },
      { rung: "delightful", statement: "{{name}} is helpful to my task." },
      { rung: "meaningful", statement: "{{name}} has made a positive difference in the way I complete my work." },
      { rung: "meaningful", statement: "I would be disappointed if {{name}} went away." },
      { rung: "meaningful", statement: "{{name}} has saved me time and/or money." },
      { rung: "meaningful", statement: "{{name}} has made my job easier." },
      { rung: "meaningful", statement: "I would tell my colleagues and friends at work good things about {{name}}." },
    ],
  },
  service: {
    label: "Service-Based",
    placeholder: "Service",
    statements: [
      { rung: "functional", statement: "{{name}} delivered what I expected." },
      { rung: "functional", statement: "{{name}} provided the services I wanted." },
      { rung: "functional", statement: "{{name}} met my basic needs." },
      { rung: "functional", statement: "{{name}} fulfilled my expectations." },
      { rung: "functional", statement: "{{name}} is easy to understand." },
      { rung: "usable", statement: "{{name}} was easy to interact with." },
      { rung: "usable", statement: "{{name}} provided what I hoped for." },
      { rung: "usable", statement: "{{name}} got things right without my feedback." },
      { rung: "usable", statement: "{{name}} is useful and practical." },
      { rung: "usable", statement: "{{name}} anticipated my unknown needs." },
      { rung: "comfortable", statement: "{{name}} gives me confidence when its service is provided." },
      { rung: "comfortable", statement: "{{name}} was understandable." },
      { rung: "comfortable", statement: "{{name}} is something I will use regularly." },
      { rung: "comfortable", statement: "{{name}} provided the right thing at the right time." },
      { rung: "comfortable", statement: "{{name}} provides value." },
      { rung: "delightful", statement: "{{name}} makes me smile." },
      { rung: "delightful", statement: "{{name}} will likely always meet my needs." },
      { rung: "delightful", statement: "{{name}} surprises me, anticipating my needs." },
      { rung: "delightful", statement: "{{name}} needs no improvement." },
      { rung: "delightful", statement: "I would describe {{name}} as helpful to my task." },
      { rung: "meaningful", statement: "{{name}} has saved me time and/or money." },
      { rung: "meaningful", statement: "{{name}} changed my life." },
      { rung: "meaningful", statement: "I would be disappointed if {{name}} went away." },
      { rung: "meaningful", statement: "{{name}} has improved my life." },
      { rung: "meaningful", statement: "I'm likely to recommend {{name}} to my friends or peers." },
    ],
  },
};

/* ── Sentiment mapping + rung weights ───────────────────────────────────── */

export type Sentiment =
  | "Strongly Disagree"
  | "Disagree"
  | "Neutral"
  | "Agree"
  | "Strongly Agree";

export const SENTIMENT_TO_VALUE: Record<Sentiment, number> = {
  "Strongly Disagree": 1,
  Disagree: 2,
  Neutral: 3,
  Agree: 4,
  "Strongly Agree": 5,
};

// Rung influence weights. Functional failures amplified; absent delight less punishing.
// Ported from ladder-beta scoreAIProcessedItemWeightedAverageV1.
const RUNG_WEIGHTS: Record<RungName, Record<1 | 2 | 3 | 4 | 5, number>> = {
  functional: { 1: 5.0, 2: 4.0, 3: 3.0, 4: 1.0, 5: 0.5 },
  usable: { 1: 4.0, 2: 3.0, 3: 2.0, 4: 1.0, 5: 0.75 },
  comfortable: { 1: 3.0, 2: 2.0, 3: 1.5, 4: 1.0, 5: 1.0 },
  delightful: { 1: 3.0, 2: 1.5, 3: 1.0, 4: 1.0, 5: 1.0 },
  meaningful: { 1: 3.0, 2: 1.5, 3: 1.0, 4: 1.0, 5: 1.0 },
};

function getRungWeight(rung: RungName, value: number): number {
  const map = RUNG_WEIGHTS[rung] || RUNG_WEIGHTS.comfortable;
  if (value <= 1.5) return map[1];
  if (value <= 2.5) return map[2];
  if (value <= 3.5) return map[3];
  if (value <= 4.5) return map[4];
  return map[5];
}

/**
 * Score feedback from per-rung sentiment values (1–5 numeric).
 * Returns a Ladder score 1.0–5.0.
 */
export function scoreFromSentiments(
  rungValues: Partial<Record<RungName, number>>,
): number {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [rung, value] of Object.entries(rungValues) as [
    RungName,
    number,
  ][]) {
    const baseWeight = 6 - value; // low scores get more weight
    const rungInfluence = getRungWeight(rung, value);
    const weight = baseWeight * rungInfluence;
    weightedSum += value * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) return 1.0;
  return Math.max(1.0, Math.min(5.0, weightedSum / totalWeight));
}

/**
 * Prompt builder for feedback scoring across domains (b2b/b2c/process/service).
 */
export function ladderFeedbackPrompt(
  experienceName = "the product",
  domain: SurveyDomainKey = "b2c",
): string {
  const surveyDomain = SURVEY_DOMAINS[domain] || SURVEY_DOMAINS.b2c;
  const stmts = surveyDomain.statements.map((s) => ({
    rung: s.rung,
    statement: s.statement.replace(/\{\{name\}\}/g, experienceName),
  }));

  let p = "You are the Drawbackwards Ladder scoring engine.\n";
  p +=
    "You evaluate ANY experience — app, event, workflow, service — against the Ladder framework.\n\n";

  p += "SURVEY DOMAIN: " + surveyDomain.label + "\n\n";

  p += "THE LADDER (5 rungs, highest to lowest):\n";
  p +=
    "- meaningful  : Trusted and irreplaceable. Changed how user thinks, works, or lives.\n";
  p +=
    "- delightful  : Tailored and assistive. Anticipates needs. Users spontaneously recommend it.\n";
  p +=
    "- comfortable : Intuitive. No friction. Everything where expected. Modern minimum bar.\n";
  p +=
    "- usable      : Tasks completable with effort. User tolerates it but would switch.\n";
  p +=
    "- functional  : Works at all. Core tasks possible. User fights it.\n\n";

  p += "CALIBRATION RULES:\n";
  p +=
    "- Higher rungs require expressed enthusiasm — not just absence of complaints.\n";
  p +=
    "- Score what is present. If a rung is not mentioned, assume it works. Do not penalise absence.\n";
  p += "- Functional failures weigh more than absent delight.\n";
  p +=
    "- Be honest. Most experiences land at usable or functional. Comfortable must be earned.\n\n";

  p += "YOUR TASK:\n";
  p +=
    "Read the feedback. Score the aggregate experience by evaluating each of the 25 statements below.\n";
  p +=
    'Assign one of: "Strongly Disagree" | "Disagree" | "Neutral" | "Agree" | "Strongly Agree"\n\n';

  p += "STATEMENTS (25 total — 5 per rung):\n";
  const rungs: RungName[] = [
    "meaningful",
    "delightful",
    "comfortable",
    "usable",
    "functional",
  ];
  let idx = 1;
  for (const rung of rungs) {
    p += `\n${rung.toUpperCase()}:\n`;
    stmts
      .filter((s) => s.rung === rung)
      .forEach((s) => {
        p += `${idx}. "${s.statement}"\n`;
        idx++;
      });
  }

  p += "\nOUTPUT FORMAT — return ONLY this JSON, nothing before or after:\n";
  p += "{\n";
  p += '  "statements": [\n';
  p +=
    '    { "index": 1, "rung": "functional", "sentiment": "Agree", "evidence": "direct quote or close paraphrase" },\n';
  p += "    ...\n";
  p += "  ],\n";
  p += '  "rungs": {\n';
  p +=
    '    "functional":  { "average": 4.2, "sentiment": "Agree",            "evidence": "summary of functional evidence" },\n';
  p += '    "usable":      { "average": 3.5, "sentiment": "Neutral",          "evidence": "..." },\n';
  p += '    "comfortable": { "average": 2.8, "sentiment": "Disagree",         "evidence": "..." },\n';
  p += '    "delightful":  { "average": 1.5, "sentiment": "Strongly Disagree","evidence": "..." },\n';
  p += '    "meaningful":  { "average": 1.2, "sentiment": "Strongly Disagree","evidence": "..." }\n';
  p += "  },\n";
  p +=
    '  "summary": "2–3 sentence honest summary of the experience quality",\n';
  p += '  "insights": ["Key finding 1", "Key finding 2", "Key finding 3"],\n';
  p +=
    '  "topIssues": ["Most impactful problem to fix", "Second issue", "Third issue"]\n';
  p += "}\n";

  return p;
}

/**
 * Returns available survey domain keys for external use.
 */
export function getSurveyDomains() {
  return (Object.entries(SURVEY_DOMAINS) as [SurveyDomainKey, SurveyDomain][]).map(
    ([key, val]) => ({
      key,
      label: val.label,
      placeholder: val.placeholder,
    }),
  );
}

/**
 * AI-experience lens prompt block. Append to ladderFullPrompt when the
 * scored design type has aiLens=true. Shifts upper rungs (Delightful,
 * Meaningful) to the AI-specific interpretation.
 */
export function aiLensPrompt(): string {
  let p = "";
  p += "AI-POWERED EXPERIENCE LENS (applied because design type is AI-powered):\n";
  p +=
    "Levels 1–2 are unchanged. Levels 3–5 shift in meaning:\n";
  p +=
    "- Comfortable stays Intuitive: " + AI_EXPERIENCE_LENS.Comfortable.shift + "\n";
  p +=
    "- Delightful becomes Tailored + Assistive: " +
    AI_EXPERIENCE_LENS.Delightful.shift +
    "\n";
  if (AI_EXPERIENCE_LENS.Delightful.signals) {
    p +=
      "  AI-specific signals: " +
      AI_EXPERIENCE_LENS.Delightful.signals.join(", ") +
      ".\n";
  }
  if (AI_EXPERIENCE_LENS.Delightful.experienceTest) {
    p +=
      "  AI EXPERIENCE TEST: " +
      AI_EXPERIENCE_LENS.Delightful.experienceTest +
      "\n";
  }
  p +=
    "- Meaningful becomes Trusted: " + AI_EXPERIENCE_LENS.Meaningful.shift + "\n";
  if (AI_EXPERIENCE_LENS.Meaningful.signals) {
    p +=
      "  AI-specific signals: " +
      AI_EXPERIENCE_LENS.Meaningful.signals.join(", ") +
      ".\n";
  }
  if (AI_EXPERIENCE_LENS.Meaningful.experienceTest) {
    p +=
      "  AI EXPERIENCE TEST: " +
      AI_EXPERIENCE_LENS.Meaningful.experienceTest +
      "\n";
  }
  p += "\n";
  return p;
}

/**
 * Design-type classification prompt — lists all types so the model can
 * classify the screen before scoring.
 */
export function designTypeClassifierPrompt(): string {
  let p = "DESIGN TYPE CLASSIFICATION:\n";
  p +=
    "Before scoring, identify which design type best fits this screen. This changes the evaluation focus:\n\n";
  DESIGN_TYPES.forEach((dt) => {
    p += `- ${dt.type} (${dt.label}): ${dt.description}\n`;
    p += `  Focus: ${dt.evaluationFocus}\n`;
  });
  p += "\n";
  p +=
    'Return your classification in the field "designType" using one of the type keys above.\n\n';
  return p;
}
