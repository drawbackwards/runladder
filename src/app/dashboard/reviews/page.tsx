import type { Metadata } from "next";
import {
  ReviewsIntro,
  ReviewsStats,
  ActiveReviewsList,
} from "@/components/reviews/ReviewsOverview";

export const metadata: Metadata = {
  title: "Reviews | Ladder",
  description:
    "Group iterations of a design and watch scores evolve, with peer crit from your team.",
};

/**
 * Dedicated Reviews section. The body is composed from the shared building
 * blocks that also power the team dashboard's Reviews tab, so the two stay in
 * sync.
 */
export default function ReviewsPage() {
  return (
    <div className="pt-20 font-mono">
      <div className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl text-foreground font-sans">Reviews</h1>
        </div>
        <ReviewsIntro />
        <ReviewsStats />
        <ActiveReviewsList />
      </div>
    </div>
  );
}
