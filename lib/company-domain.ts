// Kretech (kretech.in) is the company site; iSMS (isms.study) is the product,
// both served from this one deployment. Safe for Edge Runtime (proxy.ts).

const COMPANY_HOSTS = new Set(["kretech.in", "www.kretech.in"]);

const PRODUCT_ORIGIN = "https://isms.study";

export function isCompanyHost(host: string | null): boolean {
  if (!host) return false;
  // Strip a port (e.g. "kretech.in:3000") so this also works against local/preview setups.
  return COMPANY_HOSTS.has(host.toLowerCase().split(":")[0]);
}

export function productUrl(pathname: string, search: string): string {
  return `${PRODUCT_ORIGIN}${pathname}${search}`;
}
