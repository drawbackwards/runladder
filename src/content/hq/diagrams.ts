/**
 * Mermaid diagram sources for /hq pages.
 *
 * Defined here as a named map instead of inline in MDX because
 * `next-mdx-remote/rsc` strips multi-line JSX expression values from
 * MDX. Reference these by name from MDX via `<Diagram name="..." />`.
 */

export const DIAGRAMS = {
  ARCHITECTURE: `
graph TB
  subgraph Users["Who's calling"]
    direction LR
    Browser["Web users"]
    Designer["Figma designers"]
    AIUser["Claude.ai users"]
    PM["PM / CX teams"]
    Dev["Developers + AI agents"]
  end

  subgraph Surfaces["Thin clients (five surfaces)"]
    Web["runladder.com web app"]
    Plugin["Figma plugin"]
    Skill["Claude Skill"]
    Pulse["Ladder Pulse"]
    APIMCP["Ladder API + MCP"]
  end

  subgraph Core["Shared core (server-side only)"]
    Engine["Scoring engine<br/>Anthropic Claude + Ladder rubric"]
    Auth["Auth<br/>Clerk + API keys"]
    Billing["Billing<br/>Stripe + usage metering"]
    Data[("Data<br/>Upstash Redis (Postgres next)")]
  end

  Browser --> Web
  Designer --> Plugin
  AIUser --> Skill
  PM --> Pulse
  Dev --> APIMCP

  Web --> Engine
  Plugin --> Engine
  Skill --> Engine
  Pulse --> Engine
  APIMCP --> Engine

  Web --> Auth
  Plugin --> Auth
  Skill --> Auth
  Pulse --> Auth
  APIMCP --> Auth

  Web --> Billing
  Plugin --> Billing
  Skill --> Billing
  Pulse --> Billing
  APIMCP --> Billing

  Engine --> Data
  Auth --> Data
  Billing --> Data

  classDef surface fill:#222,stroke:#6AC89B,color:#fff
  classDef core fill:#111,stroke:#6AC89B,color:#fff
  classDef user fill:#1a1a1a,stroke:#444,color:#ccc
  class Web,Plugin,Skill,Pulse,APIMCP surface
  class Engine,Auth,Billing,Data core
  class Browser,Designer,AIUser,PM,Dev user
`,

  WEB_FIRST_SCORE: `
flowchart LR
  Land["Landing /"]
  Score["/score"]
  Login["/login"]
  SignUp["Create account"]
  Result["Score result"]
  Lift["Ladder Lift CTA"]
  Upgrade["Pro upgrade prompt"]

  Land --> Score
  Score -->|"signed out"| Login
  Login --> SignUp
  SignUp --> Score
  Score --> Result
  Result -->|"below 3.0"| Lift
  Result -->|"3.0 and up"| Upgrade
`,

  WEB_FREE_TO_PRO: `
flowchart LR
  Score["Score result"]
  Cap{"Hit 5-lifetime cap?"}
  Locked["A11y tab locked"]
  Pricing["/pricing"]
  Checkout["Stripe checkout"]
  Confirm["/dashboard?welcome=pro"]

  Score --> Cap
  Score --> Locked
  Cap -->|"Yes"| Pricing
  Locked -->|"clicks tab"| Pricing
  Pricing --> Checkout
  Checkout --> Confirm
`,

  PLUGIN_FIRST_RUN: `
flowchart LR
  Install[Install plugin]
  Open[Open in Figma]
  Auth[Auth via plugin token]
  Frame[Select frame]
  Score[Score frame]
  Result[Inline score + breakdown]

  Install --> Open
  Open --> Auth
  Auth --> Frame
  Frame --> Score
  Score --> Result
`,

  SKILL_FLOW: `
flowchart LR
  Convo[Claude.ai conversation]
  Invoke["Skill invocation"]
  Auth[Auth via Skill token]
  Input[Skill reads URL or screenshot from context]
  API[Calls Ladder API]
  Result[Score returned inline in conversation]

  Convo --> Invoke
  Invoke --> Auth
  Auth --> Input
  Input --> API
  API --> Result
`,

  PULSE_DATA_FLOW: `
flowchart LR
  Source["Customer feedback source<br/>CSV, NPS, support tickets"]
  Ingest["Pulse ingest endpoint"]
  Score["Scoring engine batch run"]
  Dashboard["/dashboard/pulse"]
  Insight["Aggregate trends + drill-down"]

  Source --> Ingest
  Ingest --> Score
  Score --> Dashboard
  Dashboard --> Insight
`,

  API_KEY_FLOW: `
flowchart LR
  SignUp["Sign up on runladder.com"]
  Upgrade["Upgrade to Pro or Teams"]
  Settings["/settings"]
  Key["Generate API key"]
  Call["POST /v1/score"]
  Response["Score + X-Ladder-API-Version header"]

  SignUp --> Upgrade
  Upgrade --> Settings
  Settings --> Key
  Key --> Call
  Call --> Response
`,

  MCP_AGENT_FLOW: `
flowchart LR
  Agent[AI agent]
  Config[MCP config with API key]
  Connect[Connect to api.runladder.com MCP server]
  Tool["ladder.score(url or image)"]
  Result[Score returned as structured tool output]

  Agent --> Config
  Config --> Connect
  Connect --> Tool
  Tool --> Result
`,
} as const;

export type DiagramName = keyof typeof DIAGRAMS;

// Back-compat export for the original ArchitectureDiagram component.
export const ARCHITECTURE_DIAGRAM = DIAGRAMS.ARCHITECTURE;
