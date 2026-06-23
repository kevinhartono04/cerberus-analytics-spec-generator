import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Cerberus Analytics Hub",
  description: "Generate and review game analytics specs from a reusable reference library.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
