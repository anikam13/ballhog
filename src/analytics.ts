/**
 * Optional measurement hooks for ad / product analytics.
 *
 * Nothing loads unless the corresponding Vite env var is set at build time.
 * Do not hardcode fake pixel or measurement IDs — set real values in deploy env:
 *
 *   VITE_GA4_MEASUREMENT_ID=G-XXXXXXXX
 *   VITE_META_PIXEL_ID=1234567890
 *
 * Keep Privacy Policy copy in sync when enabling either tool.
 */

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & {
      queue?: unknown[];
      loaded?: boolean;
      version?: string;
    };
  }
}

function loadScript(src: string) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const el = document.createElement("script");
  el.src = src;
  el.async = true;
  document.head.appendChild(el);
}

function initGa4(measurementId: string) {
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(...args: unknown[]) {
    window.dataLayer!.push(args);
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId);
}

function initMetaPixel(pixelId: string) {
  if (window.fbq) return;
  const fbq = ((...args: unknown[]) => {
    fbq.queue = fbq.queue || [];
    fbq.queue.push(args);
  }) as NonNullable<Window["fbq"]>;
  fbq.queue = [];
  fbq.loaded = true;
  fbq.version = "2.0";
  window.fbq = fbq;
  loadScript("https://connect.facebook.net/en_US/fbevents.js");
  window.fbq("init", pixelId);
  window.fbq("track", "PageView");
}

/** Call once at app boot. No-ops when env IDs are unset. */
export function initAnalytics() {
  const ga4 = import.meta.env.VITE_GA4_MEASUREMENT_ID?.trim();
  const meta = import.meta.env.VITE_META_PIXEL_ID?.trim();
  if (ga4) initGa4(ga4);
  if (meta) initMetaPixel(meta);
}
