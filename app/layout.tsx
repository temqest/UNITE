import "@/styles/globals.css";
import { Metadata } from "next";
import clsx from "clsx";

import { Providers } from "./providers";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import ClientPerfFix from "@/components/utils/client-perf-fix";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="en">
      <head />
      <body
        className={clsx(
          "min-h-screen text-foreground bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "light" }}>
          {/* Patch: client-side performance.measure guard to avoid negative timestamp errors in dev tooling */}
          <ClientPerfFix />
          <LoadingOverlay />
          {children}
        </Providers>
      </body>
    </html>
  );
}
