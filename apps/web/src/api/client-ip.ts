/** Public rate limits are per IP, and server calls skip nginx, so the visitor's IP must be forwarded. */
export function clientIpHeader(headers: Headers): Record<string, string> {
  const ip = headers.get("x-real-ip")?.trim();
  return ip ? { "x-real-ip": ip } : {};
}
