import "./globals.css";
import type { Metadata } from "next";
import { EditModeToggle } from "@/components/edit-mode/EditModeToggle";
import { editGateEnabled } from "@/lib/edit-pin";

export const metadata: Metadata = {
  title: "Knowledge Academy — ระบบจัดตารางห้อง",
  description: "ระบบจัดตารางห้องเรียนของ Knowledge Academy",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gateEnabled = editGateEnabled();
  return (
    <html lang="th">
      <body className="font-sans antialiased">
        {children}
        <EditModeToggle gateEnabled={gateEnabled} />
      </body>
    </html>
  );
}
