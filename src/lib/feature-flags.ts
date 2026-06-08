/**
 * Launch-time feature flags. Keep these few and well-commented — each one is a
 * thing we deliberately hid for the MVP launch and intend to restore.
 */

/**
 * #302 — Evaluations (member-detail tab) and Reviews (team-dashboard tab) are
 * hidden for the MVP launch. The code stays in place; flip this to `true` to
 * bring both tabs back once the features are ready to show customers.
 */
export const SHOW_EVALUATIONS_AND_REVIEWS = false;
