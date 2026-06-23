// Invite links + native share with clipboard fallback.

export function inviteUrl(code: string): string {
  return `${location.origin}/?code=${code}`;
}

export function ratingShareUrl(tier: string, score: number): string {
  const params = new URLSearchParams({ tier, score: String(score) });
  return `${location.origin}/?${params}`;
}

export type SharedRating = { tier: string; score: number };

function consumeUrlParams(): { invitedCode: string | null; sharedRating: SharedRating | null } {
  const params = new URLSearchParams(location.search);
  const code = params.get("code");
  const tier = params.get("tier");
  const scoreRaw = params.get("score");

  if (code || tier) {
    history.replaceState(null, "", location.pathname);
  }

  const invitedCode = code ? code.toUpperCase().slice(0, 4) : null;

  let sharedRating: SharedRating | null = null;
  if (tier && scoreRaw) {
    const score = parseInt(scoreRaw, 10);
    if (Number.isFinite(score) && score >= 0 && score <= 1000) {
      sharedRating = { tier, score };
    }
  }

  return { invitedCode, sharedRating };
}

const urlParams = consumeUrlParams();

/** Code from an invite link (?code=ABCD), captured once at page load. */
export const invitedCode = urlParams.invitedCode;

/** Solo rating from a share link (?tier=SAVANT&score=642), captured once at page load. */
export const sharedRating = urlParams.sharedRating;

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
