// Kretech (kretech.in) is the company site; iSMS (isms.study) is the product,
// both served from this one deployment. Safe for Edge Runtime (proxy.ts).

const COMPANY_HOSTS = new Set(["kretech.in", "www.kretech.in"]);
const PRODUCT_HOSTS = new Set(["isms.study", "www.isms.study"]);

const PRODUCT_ORIGIN = "https://isms.study";

export function isCompanyHost(host: string | null): boolean {
  if (!host) return false;
  // Strip a port (e.g. "kretech.in:3000") so this also works against local/preview setups.
  return COMPANY_HOSTS.has(host.toLowerCase().split(":")[0]);
}

// Every hostname this deployment legitimately answers for — company +
// product. Used to validate the Origin header on state-changing requests
// without trusting the raw Host header, which a CDN/reverse proxy in front
// of the app can rewrite to an internal value before it reaches Next.js.
export function isKnownAppHost(host: string | null): boolean {
  if (!host) return false;
  const bare = host.toLowerCase().split(":")[0];
  return COMPANY_HOSTS.has(bare) || PRODUCT_HOSTS.has(bare);
}

export function productUrl(pathname: string, search: string): string {
  return `${PRODUCT_ORIGIN}${pathname}${search}`;
}
