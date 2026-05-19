/**
 * Mermaid diagram source strings for /hq pages.
 *
 * Defined here (not inline in MDX) because `next-mdx-remote/rsc` strips
 * multi-line JSX expression values from MDX. Importing each diagram as a
 * named export and rendering through a wrapper component is the reliable
 * pattern.
 */

export const ARCHITECTURE_DIAGRAM = `
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
`;
