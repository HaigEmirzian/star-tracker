import type { NextConfig } from "next";

// satellite.js ships an optional WASM-accelerated propagator (never used
// here — StarlinkGlobe only calls the plain pure-JS API: json2satrec,
// propagate, eciToGeodetic, etc.). It's loaded via `import('#wasm-*-thread')`
// — a dynamic import with a static specifier, so bundlers still eagerly
// resolve it into a chunk at build time even though we never call the
// functions that trigger it. That chunk's Emscripten-generated loader has
// top-level `node:module` / `node:worker_threads` imports for Node-
// environment detection. Those hit webpack 5's URI-scheme resolver (a
// different system from normal resolve.alias/fallback, which run too late
// to intercept it — "Unhandled scheme" is webpack's own error for this).
// IgnorePlugin skips resolving the wasm subpath imports entirely, which is
// the standard fix for an optional dependency chunk you never execute.
const WASM_IMPORT_SPECIFIER = /^#wasm-(single|multi)-thread$/;
const NODE_BUILTIN_STUB = "./lib/empty-module.ts";

const nextConfig: NextConfig = {
  images: {
    // Scoped narrowly to the exact hostnames actually hotlinked from
    // lib/data/gpuSpecs.ts — don't widen this without a corresponding new
    // hotlinked image.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.nvidia.com",
        pathname: "/content/dam/**",
      },
      {
        // Nvidia Newsroom's press-photo CDN (iprsoftwaremedia.com, aka
        // Intrado/Notified) — hosts the H100/Rubin/Vera product photos,
        // since those press releases don't publish images under
        // www.nvidia.com/content/dam like the B200 datasheet does.
        protocol: "https",
        hostname: "iprsoftwaremedia.com",
        pathname: "/219/files/**",
      },
    ],
  },
  turbopack: {
    resolveAlias: {
      "node:module": NODE_BUILTIN_STUB,
      "node:worker_threads": NODE_BUILTIN_STUB,
    },
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.plugins.push(
        new webpack.IgnorePlugin({ resourceRegExp: WASM_IMPORT_SPECIFIER }),
      );
    }
    return config;
  },
};

export default nextConfig;
