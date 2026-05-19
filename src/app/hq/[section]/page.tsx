import fs from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { findSection, HQ_SECTIONS } from "@/content/hq/_sections";
import { LastUpdated } from "@/components/hq/LastUpdated";
import { MermaidDiagram } from "@/components/hq/MermaidDiagram";
import { ArchitectureDiagram } from "@/components/hq/ArchitectureDiagram";
import { Diagram } from "@/components/hq/Diagram";

type HqFrontmatter = {
  title?: string;
  updatedAt?: string;
  updatedBy?: string;
};

const mdxComponents = {
  Mermaid: MermaidDiagram,
  ArchitectureDiagram,
  Diagram,
};

export async function generateStaticParams() {
  return HQ_SECTIONS.map((s) => ({ section: s.slug }));
}

async function readSection(slug: string): Promise<string | null> {
  const filePath = path.join(process.cwd(), "src/content/hq", `${slug}.mdx`);
  try {
    return await fs.readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

export default async function HqSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: slug } = await params;
  const meta = findSection(slug);
  if (!meta) notFound();

  const file = await readSection(slug);
  if (!file) {
    return (
      <article className="hq-prose">
        <LastUpdated title={meta.title} intent={meta.intent} />
        <p className="text-muted italic">
          This section hasn&apos;t been written yet.
        </p>
        <p className="text-xs text-muted mt-4">
          Drop the content in <code>src/content/hq/{slug}.mdx</code>.
        </p>
      </article>
    );
  }

  const { content, frontmatter } = await compileMDX<HqFrontmatter>({
    source: file,
    options: {
      parseFrontmatter: true,
      mdxOptions: {
        remarkPlugins: [remarkGfm],
      },
    },
    components: mdxComponents,
  });

  return (
    <article className="hq-prose">
      <LastUpdated
        title={frontmatter.title ?? meta.title}
        updatedAt={frontmatter.updatedAt}
        updatedBy={frontmatter.updatedBy}
        intent={meta.intent}
      />
      {content}
    </article>
  );
}
