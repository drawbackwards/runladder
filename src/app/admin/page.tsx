import { redirect } from "next/navigation";

/**
 * /admin lands on the first tab (Clients). The unified admin shell + tabs
 * live in `src/app/admin/layout.tsx`; tab content lives in each sub-route
 * (`/admin/clients`, `/admin/evaluations`, `/admin/feedback`, `/admin/comps`,
 * `/admin/beta-codes`).
 */
export default function AdminRoot() {
  redirect("/admin/clients");
}
