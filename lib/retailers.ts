export type RetailerId = "tesco" | "sainsburys" | "waitrose";

export type Retailer = {
  id: RetailerId;
  name: string;
  tagline: string;
  initials: string;
  domain: string;
};

export const RETAILERS: Retailer[] = [
  {
    id: "tesco",
    name: "Tesco",
    tagline: "Full grocery range, nationwide delivery.",
    initials: "TS",
    domain: "tesco.com",
  },
  {
    id: "sainsburys",
    name: "Sainsbury's",
    tagline: "Groceries, Nectar prices, same-day slots.",
    initials: "SB",
    domain: "sainsburys.co.uk",
  },
  {
    id: "waitrose",
    name: "Waitrose",
    tagline: "Premium groceries and own-brand ranges.",
    initials: "WT",
    domain: "waitrose.com",
  },
];

export function getRetailer(id: string): Retailer | undefined {
  return RETAILERS.find((r) => r.id === id);
}
