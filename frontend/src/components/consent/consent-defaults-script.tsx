/**
 * Google Consent Mode v2 defaults — MUST execute before any Google/Meta code.
 *
 * Rendered as a plain inline <script> inside <head> (server component, so it
 * is part of the SSR HTML and runs before hydration). Everything starts as
 * "denied" (except security_storage); the consent banner later pushes an
 * `update` from the visitor's choice. `wait_for_update` gives the banner a
 * moment to apply a stored decision before tags evaluate; `ads_data_redaction`
 * strips ad identifiers while ad_storage is denied.
 *
 * NOTE: with our "basic" mode GTM is only injected after an opt-in, so these
 * defaults mostly matter for correctness inside the container once it loads —
 * they cost nothing and keep the setup honest if GTM ever loads earlier.
 */

const CONSENT_DEFAULTS_JS = `
window.dataLayer = window.dataLayer || [];
function gtag(){window.dataLayer.push(arguments);}
window.gtag = gtag;
gtag('consent', 'default', {
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  analytics_storage: 'denied',
  functionality_storage: 'denied',
  personalization_storage: 'denied',
  security_storage: 'granted',
  wait_for_update: 500
});
gtag('set', 'ads_data_redaction', true);
gtag('set', 'url_passthrough', false);
`.trim();

export default function ConsentDefaultsScript() {
  return (
    <script
      id='consent-defaults'
      // Static, developer-authored string — no user input reaches this.
      dangerouslySetInnerHTML={{ __html: CONSENT_DEFAULTS_JS }}
    />
  );
}
