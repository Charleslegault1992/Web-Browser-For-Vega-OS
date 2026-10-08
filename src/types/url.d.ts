/**
 * React Native 0.83 exposes the global WHATWG URL API at runtime, but its
 * bundled TypeScript declaration is intentionally narrower than the Web URL
 * surface. Kaylane TV relies on these standard read-only URL fields for
 * navigation policy decisions.
 */
declare global {
  interface URL {
    readonly protocol: string;
    readonly origin: string;
    readonly hostname: string;
    readonly pathname: string;
    readonly search: string;
    readonly hash: string;
  }
}

export {};
