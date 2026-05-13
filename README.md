This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Stripe billing

Self-serve Pro at $1,000/mo. Free tier is 5 lifetime scans, enforced via Clerk
publicMetadata.tier and a Redis lifetime counter.

### Required env vars

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
NEXT_PUBLIC_APP_URL=http://localhost:3000   # https://runladder.com in prod
```

### One-time Stripe Dashboard setup

1. Create a product **Ladder Pro** with a recurring monthly price of **$1,000 USD**.
   Copy the `price_...` ID into `STRIPE_PRO_PRICE_ID`.
2. **Customer Portal:** Settings → Billing → Customer portal — enable cancellation
   and plan switching. Save.
3. **Webhook (production):** Developers → Webhooks → Add endpoint
   - URL: `https://runladder.com/api/stripe/webhooks`
   - Events: `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the signing secret into `STRIPE_WEBHOOK_SECRET`.

### Local webhook forwarding

```bash
brew install stripe/stripe-cli/stripe   # one time
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhooks
# Copy the printed `whsec_...` into your local STRIPE_WEBHOOK_SECRET
```

### Routes

- `POST /api/stripe/checkout` — start a Checkout session for the signed-in user
- `POST /api/stripe/webhooks` — Stripe → Clerk publicMetadata.tier sync
- `POST /api/stripe/portal` — open the Customer Portal

### Tier enforcement

`getUserTier(userId)` reads `publicMetadata.tier` from Clerk; `isPaidTier()`
bypasses the free lifetime cap. Both `/api/score` and `/api/skill/score` share
the same `user:{id}:lifetime_scans_used` counter.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
