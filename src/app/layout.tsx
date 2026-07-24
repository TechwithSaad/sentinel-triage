import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SentinelTriage — AI triage for Sentinel-Scanner findings",
  description:
    "Turns raw Sentinel-Scanner SARIF output into plain-English, correctly-prioritized findings a non-security developer can act on.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
