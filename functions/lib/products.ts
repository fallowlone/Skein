export type Product = {
  id: string;
  amount: number;
  title: string;
  description: string;
  entitlements: string[];
};

export const PRODUCTS: Record<string, Product> = {
  coach_monthly: { id: "coach_monthly", amount: 500, title: "Coach", description: "Monthly Coach access", entitlements: ["coach"] },
  readiness_report: { id: "readiness_report", amount: 100, title: "Readiness Pro Report", description: "Readiness Pro Report", entitlements: ["readiness_pro"] },
  expedition_access: { id: "expedition_access", amount: 300, title: "Expedition Access", description: "Expedition Access", entitlements: ["expedition"] },
};
