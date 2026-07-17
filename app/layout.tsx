import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  return {
    metadataBase,
    title: "AI for Humanity Compass",
    description: "A guided, human-centered governance workspace for evaluating AI projects across eight essential dimensions.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      title: "AI for Humanity Compass",
      description: "Make clearer GO, FIX, or PAUSE decisions with a structured human-centered AI assessment.",
      type: "website",
      images: [{ url: "/og.png", width: 1200, height: 630, alt: "AI for Humanity Compass" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "AI for Humanity Compass",
      description: "A human-centered governance workspace for responsible AI decisions.",
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
