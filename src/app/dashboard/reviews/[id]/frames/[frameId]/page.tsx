import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  findFrame,
  findReviewBySlug,
} from "@/lib/reviews/mockData";
import { FrameWorkspace } from "./FrameWorkspace";

type Params = Promise<{ id: string; frameId: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { id, frameId } = await params;
  const review = findReviewBySlug(id);
  const frame = review ? findFrame(review, frameId) : undefined;
  if (!review || !frame) return { title: "Frame not found | Ladder" };
  return {
    title: `${frame.name} · ${review.name} | Ladder`,
  };
}

export default async function FrameDetailPage({ params }: { params: Params }) {
  const { id, frameId } = await params;
  const review = findReviewBySlug(id);
  if (!review) notFound();
  const frame = findFrame(review, frameId);
  if (!frame) notFound();

  return <FrameWorkspace review={review} frame={frame} />;
}
