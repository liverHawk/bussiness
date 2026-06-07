import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "58 in OMU",
  description: "FastAPI × Next.js × Supabase base template",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
