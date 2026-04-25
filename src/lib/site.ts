export const siteTitle = "Built by Underdogs";
export const siteDescription =
  "Built by Underdogs helps people and businesses build with clarity, originality, and sharper fundamentals.";
export const siteUrl = (
  import.meta.env.PUBLIC_SITE_URL ||
  import.meta.env.SITE ||
  "https://www.buildbyunderdogs.com"
).replace(/\/$/, "");
export const defaultSocialImage = "/uploads/default-social-image.svg";
export const defaultSocialImageUrl = new URL(defaultSocialImage, siteUrl).toString();
