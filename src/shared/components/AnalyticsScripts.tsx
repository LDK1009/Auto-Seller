//////////////////////////////////////// GA4 스크립트 주입 ////////////////////////////////////////
// NEXT_PUBLIC_GA_ID가 설정된 환경(프로덕션)에서만 gtag를 로드한다.
// 이벤트 전송은 shared/utils/analytics.ts의 trackEvent 경유.

import Script from 'next/script';

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function AnalyticsScripts() {
  if (!GA_ID) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}');
        `}
      </Script>
    </>
  );
}
