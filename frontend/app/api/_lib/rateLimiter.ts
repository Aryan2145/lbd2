// Sliding-window in-memory rate limiter.
// Module-level singleton — persists for the lifetime of the Next.js process.
// Fine for single-instance EC2; swap for Redis if you scale to multiple nodes.

class SlidingWindowLimiter {
  private global: number[] = [];
  private perIp  = new Map<string, number[]>();

  constructor(
    private globalMax: number,  // max requests per window across all users
    private perIpMax:  number,  // max requests per window per IP
    private windowMs = 60_000,  // window size in ms (default 1 minute)
  ) {}

  check(ip: string): { allowed: boolean; message?: string } {
    const now    = Date.now();
    const cutoff = now - this.windowMs;

    // Evict expired entries
    this.global = this.global.filter(t => t > cutoff);
    const ipTs  = (this.perIp.get(ip) ?? []).filter(t => t > cutoff);

    if (this.global.length >= this.globalMax) {
      return { allowed: false, message: "Server is busy right now — please try again in a moment." };
    }
    if (ipTs.length >= this.perIpMax) {
      return { allowed: false, message: "Please wait a moment before generating again." };
    }

    // Record this request
    this.global.push(now);
    ipTs.push(now);
    this.perIp.set(ip, ipTs);
    return { allowed: true };
  }
}

// Shared across the legacy North Star (/api/synthesize) and the vision
// purpose generator (/api/generate-purpose), both on the paid Anthropic tier.
// Per-IP is generous enough that a user can re-synthesize a few times in a row
// without being blocked; global caps runaway/abuse across all users.
export const aiLimiter = new SlidingWindowLimiter(60, 10);
