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
