// Build-time feature flags.
//
// `futureFeaturesEnabled` gates work that's merged to `main` but not ready to
// show publicly — right now, the entire Tesla side of the site (the top-right
// SpaceX/Tesla site toggle and the Robotaxi tracker behind it). The code ships
// so it can be reviewed and iterated on in the open; the feature stays dark on
// the deployed site until this is switched on.
//
// It's a NEXT_PUBLIC_ var so the same value is inlined into both the server
// bundle (page.tsx skips the NHTSA fetch when off) and the client bundle
// (SiteSwitcher hides the toggle when off). Set NEXT_PUBLIC_FUTURE_FEATURES=1
// (or =true) in the environment / Vercel project settings to enable.
export const futureFeaturesEnabled =
  process.env.NEXT_PUBLIC_FUTURE_FEATURES === "1" ||
  process.env.NEXT_PUBLIC_FUTURE_FEATURES === "true";
