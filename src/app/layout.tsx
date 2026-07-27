import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Meridian LMS", template: "%s · Meridian LMS" },
  description:
    "A modern K-10 learning management system: courses, live classes, activities and family insights.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Theme is stored in a cookie so SSR renders the right theme (no flash).
  const theme = (await cookies()).get("meridian_theme")?.value;
  return (
    <html
      lang="en"
      data-theme={theme === "mono" ? "mono" : "meadow"}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
