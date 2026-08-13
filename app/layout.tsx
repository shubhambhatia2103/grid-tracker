import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "grid tracker",
  description:
    "A minimalist, offline-first grid habit tracker — habits, sleep, mood and fasting in one page. Your data stays in your browser. Export to CSV for Excel or Notion.",
  applicationName: "grid tracker",
  authors: [{ name: "Shubham Bhatia", url: "https://shubhambhatia.in" }],
  openGraph: {
    title: "grid tracker",
    description:
      "A minimalist, offline-first grid habit tracker. Your data stays in your browser. Export to CSV for Excel or Notion.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f0" },
    { media: "(prefers-color-scheme: dark)", color: "#14161a" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
