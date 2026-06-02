import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Knowledge Academy — ระบบจัดตารางห้อง",
  description: "ระบบจัดตารางห้องเรียนของ Knowledge Academy",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
