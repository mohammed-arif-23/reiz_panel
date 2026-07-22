import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "REIZ Media - Elite Internal Operations & Deliverables Portal",
  description: "Attendance, Deliverables, and Monthly Work Sheets for REIZ Media",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased font-sans"
    >
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#FAF6F0" />
      </head>
      <body className="min-h-full flex flex-col bg-[#FAF6F0] text-[#2D221E] font-sans antialiased">
        <Script
          id="sw-register"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('ServiceWorker registration successful with scope: ', reg.scope);
                  }, function(err) {
                    console.log('ServiceWorker registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
