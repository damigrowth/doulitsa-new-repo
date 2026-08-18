// Global type declarations for window object extensions

interface Window {
  /**
   * Google gtag shim — defined by components/consent/consent-defaults-script
   * (pushes `arguments` to dataLayer). Loose signature on purpose: it carries
   * 'consent' / 'set' / 'config' / 'event' commands with varying arities.
   */
  gtag?: (...args: any[]) => void;
  /** Google Tag Manager data layer. */
  dataLayer?: any[];
}
