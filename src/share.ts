// Invite links + native share with clipboard fallback.

export function inviteUrl(code: string): string {
  return `${location.origin}/?code=${code}`;
}

function consumeInviteCode(): string | null {
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  if (!code) return null;
  // Strip the param so refreshes/bookmarks of an in-room session stay clean.
  history.replaceState(null, "", location.pathname);
  return code.toUpperCase().slice(0, 4);
}

/** Code from an invite link (?code=ABCD), captured once at page load. */
export const invitedCode = consumeInviteCode();

/**
 * Share via the native sheet when available (mobile), else copy to clipboard.
 * Returns "shared" | "copied" | "failed" so callers can show feedback.
 */
export async function share(data: { title: string; text: string; url?: string }): Promise<"shared" | "copied" | "failed"> {
  if (navigator.share) {
    try {
      await navigator.share(data);
      return "shared";
    } catch (e) {
      // User cancelled the sheet — not a failure worth surfacing.
      if ((e as Error).name === "AbortError") return "shared";
    }
  }
  try {
    await navigator.clipboard.writeText(data.url ? `${data.text} ${data.url}` : data.text);
    return "copied";
  } catch {
    return "failed";
  }
}
