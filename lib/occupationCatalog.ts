export const occupationCategories = [
  "Business Owner",
  "Civil Servant",
  "Freelancer",
  "Healthcare Worker",
  "Import/Export Trader",
  "Retail Merchant",
  "Student",
  "Teacher",
  "Tech Professional",
  "Transport Operator",
  "Farmer",
  "Consultant",
] as const;

export type OccupationCategory = (typeof occupationCategories)[number];
