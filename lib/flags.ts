// Code-controlled feature flag for unreleased features. Keep it off on main;
// enable it in a development branch when reviewing future work. Gate each
// unreleased feature's UI and any feature-specific server fetches with it.
// Release an individual feature by removing its gate.
export const futureFeaturesEnabled: boolean = false;
