import { DIAGRAMS, type DiagramName } from "@/content/hq/diagrams";
import { MermaidDiagram } from "./MermaidDiagram";

export function Diagram({ name }: { name: DiagramName }) {
  const chart = DIAGRAMS[name];
  if (!chart) {
    return (
      <div className="my-6 border border-ladder-red/40 bg-ladder-red/5 text-ladder-red text-xs p-3 font-mono">
        Unknown diagram: {name}
      </div>
    );
  }
  return <MermaidDiagram chart={chart} />;
}
