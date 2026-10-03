import tracks from "../../site/src/content/tracks.json";

type ProductBase = {
  id: string;
  amount: number;
  currency: "XTR";
  title: string;
  description: string;
  entitlements: string[];
};

export type Product = ProductBase & (
  | { billingKind: "subscription"; subscriptionPeriodSeconds: 2592000 }
  | { billingKind: "one_time"; subscriptionPeriodSeconds: null }
);

export const PRODUCTS: Record<string, Product> = {
  coach_monthly: {
    id: "coach_monthly",
    amount: 500,
    currency: "XTR",
    title: "Skein Coach",
    description: "30 days of Skein Coach, renewed every 30 days until cancelled",
    entitlements: ["coach"],
    billingKind: "subscription",
    subscriptionPeriodSeconds: 2592000,
  },
  author_support: {
    id: "author_support",
    amount: 1,
    currency: "XTR",
    title: "Support the author",
    description: "A one-time 1 Star thank-you to support Skein's author",
    entitlements: [],
    billingKind: "one_time",
    subscriptionPeriodSeconds: null,
  },
};

const trackTitles = new Map(tracks.map((track) => [track.slug, track.title.en]));

export function getProduct(id: string): Product | null {
  if (Object.hasOwn(PRODUCTS, id)) return PRODUCTS[id];
  if (!id.startsWith("course:")) return null;
  const title = trackTitles.get(id.slice(7));
  return title ? {
    id,
    amount: 300,
    currency: "XTR",
    title: `Skein: ${title}`.slice(0, 32),
    description: `Permanent access to ${title}`.slice(0, 255),
    entitlements: [],
    billingKind: "one_time",
    subscriptionPeriodSeconds: null,
  } : null;
}
