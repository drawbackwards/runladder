import { ARCHITECTURE_DIAGRAM } from "@/content/hq/diagrams";
import { MermaidDiagram } from "./MermaidDiagram";

export function ArchitectureDiagram() {
  return <MermaidDiagram chart={ARCHITECTURE_DIAGRAM} />;
}
