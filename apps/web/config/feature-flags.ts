export const FEATURES = {
  ENABLE_PLATFORM: process.env.NEXT_PUBLIC_ENABLE_PLATFORM === "true" || true, // Default to true for development
  ENABLE_SRE: process.env.NEXT_PUBLIC_ENABLE_SRE === "true" || true,
};
