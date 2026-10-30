import type { Metadata } from "next";
import "./globals.css";
import ChromeGate from "@/components/ChromeGate";

export const metadata: Metadata = {
  title: "SynapseX — Connected Intelligence",
  description:
    "An open-source visual builder for multi-agent AI systems. Compose agents, swap models, wire tools, and deploy — without writing orchestration code by hand.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">
        <ChromeGate>{children}</ChromeGate>
      </body>
    </html>
  );
}
