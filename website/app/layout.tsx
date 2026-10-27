import type { Metadata } from "next";
import "./monitor.css";

export const metadata: Metadata = {
  title: "E-Trash | Live bin monitor",
  description: "Private monitoring for your ESP32-WROOM-32 smart bin.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
