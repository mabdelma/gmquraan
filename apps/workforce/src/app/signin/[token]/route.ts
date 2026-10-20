import { consumeMagicLink } from "@/lib/auth";
import { completeAuthentication } from "@/lib/after-auth";

export const dynamic = "force-dynamic";

/**
 * Land on a magic link.
 *
 * A GET that has a side effect is normally a mistake, but a link in an email
 * can only be a GET. The token is single-use, so a mail scanner that prefetches
 * it burns the link rather than granting anyone access — the member simply
 * requests another. That is the right failure direction.
 */
export async function GET(req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const result = await consumeMagicLink(decodeURIComponent(token || ""));

  if (!result.ok) {
    const url = new URL("/", req.url);
    url.searchParams.set("error", result.message);
    return new Response(null, { status: 303, headers: { Location: url.pathname + url.search } });
  }

  return completeAuthentication(result.memberId, result.method);
}
