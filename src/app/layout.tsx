import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FileForge | Useful tools for everyday files",
  description: "Convert, compress, edit, and organize files in seconds with private browser-based tools.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  alternates: { canonical: "/" },
  openGraph: {
    title: "FileForge | Useful tools for everyday files",
    description: "Private browser-first tools for images, PDFs, documents, and data.",
    type: "website",
    url: "/",
    siteName: "FileForge",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en"><body>{children}</body></html>
  );
}
