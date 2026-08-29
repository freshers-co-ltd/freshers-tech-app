// @ts-nocheck
import Stripe from "npm:stripe@17.x";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

if (!stripeSecretKey) throw new Error("STRIPE_SECRET_KEY not set");

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2025-06-30.basil",
});

export const STRIPE_PRICE_ID = Deno.env.get("STRIPE_PRICE_ID");
export const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:5173";

export async function getOrCreateStripeCustomer(
  email: string,
  hostId: string,
): Promise<Stripe.Customer> {
  const existing = await stripe.customers.list({ email, limit: 1 });
  
  if (existing.data.length > 0) return existing.data[0];

  return stripe.customers.create({
    email,
    metadata: { host_id: hostId },
  });
}