/* Google Analytics 4 最小化统计接入。
 * Google tag：GT-NS92WVPQ；GA4 数据流：G-4LWN9Z2WT2。
 * 广告个性化、Google Signals 与广告存储关闭；只用于网站与性能优化。
 */
(() => {
  const GOOGLE_TAG_ID = "GT-NS92WVPQ";
  const MEASUREMENT_ID = "G-4LWN9Z2WT2";
  if (!/^GT-[A-Z0-9]+$/.test(GOOGLE_TAG_ID) || !/^G-[A-Z0-9]+$/.test(MEASUREMENT_ID)) return;

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  gtag("consent", "default", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
    functionality_storage: "denied",
    personalization_storage: "denied",
    security_storage: "granted"
  });
  gtag("js", new Date());
  // GT-NS92WVPQ 是 Google tag；其 GA4 目标数据流为 G-4LWN9Z2WT2。
  // 只配置 Google tag 一次，避免同一页面重复发送 page_view。
  gtag("config", GOOGLE_TAG_ID, {
    anonymize_ip: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    send_page_view: true,
    cookie_flags: "SameSite=None;Secure"
  });

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GOOGLE_TAG_ID)}`;
  document.head.appendChild(script);
})();
