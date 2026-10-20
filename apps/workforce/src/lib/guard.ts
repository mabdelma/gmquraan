import { redirect } from "next/navigation";
import { getMember, toViewer, type PortalMember } from "./session";
import type { Viewer } from "@app/core";

/**
 * Every authenticated page starts here. A page that forgets to call this shows
 * nothing to an anonymous visitor because there is no member to render, but
 * relying on that would be relying on an accident — so this redirects.
 */
export async function requireMember(): Promise<{ member: PortalMember; viewer: Viewer }> {
  const member = await getMember();
  if (!member) redirect("/");
  return { member, viewer: await toViewer(member) };
}

/** For API routes, which redirect rather than throw. */
export async function memberOr401(): Promise<{ member: PortalMember; viewer: Viewer } | null> {
  const member = await getMember();
  if (!member) return null;
  return { member, viewer: await toViewer(member) };
}
