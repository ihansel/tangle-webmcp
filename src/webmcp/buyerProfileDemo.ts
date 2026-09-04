export const BUYER_PROFILE_DEMO_CUSTOMER_IDS = [
  "C-00010",
  "C-00020",
  "C-00030",
  "C-00050",
  "C-00060",
  "C-00130",
  "C-00190",
  "C-01350",
] as const;

export const BUYER_PROFILE_INPUT_FIELDS = [
  "customer_id",
  "region",
  "acquisition_channel",
  "membership_tier",
  "tenure_months",
  "orders",
  "spend",
  "avg_basket",
  "discount_share",
  "return_rate",
  "support_tickets",
  "days_since_order",
  "email_engagement",
  "satisfaction_score",
  "lifetime_value",
  "category_affinities",
  "recent_timeline",
] as const;

export const BUYER_PROFILE_CACHE_VERSION = "buyer-profile-v1";
