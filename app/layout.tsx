import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Yash Bandiwadekar — Cybersecurity",
  description:
    "Portfolio of Yash Bandiwadekar: cybersecurity engineering student, SOC intern and VAPT cell president. Invite-only private chat and file drop for friends and family.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
