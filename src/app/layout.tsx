import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import "goey-toast/styles.css";
import { Toaster } from "@/components/toaster";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TugasKita — Kumpulin tugas tanpa ribet",
  description:
    "Upload tugas secara privat, ketua kelas mengumpulkan semua dan generate satu link untuk dosen. Tanpa takut dicomot.",
  metadataBase: new URL("https://tugaskita-five.vercel.app"),
  openGraph: {
    title: "TugasKita — Kumpulin tugas tanpa ribet",
    description:
      "Upload tugas secara privat, ketua kelas mengumpulkan semua dan generate satu link untuk dosen. Tanpa takut dicomot.",
    url: "https://tugaskita-five.vercel.app",
    siteName: "TugasKita",
    images: [
      {
        url: "/og-image.jpg",
        width: 1280,
        height: 640,
        alt: "TugasKita — Kumpulin tugas tanpa ribet",
      },
    ],
    locale: "id_ID",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TugasKita — Kumpulin tugas tanpa ribet",
    description:
      "Upload tugas secara privat, ketua kelas mengumpulkan semua dan generate satu link untuk dosen.",
    images: ["/og-image.jpg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${inter.variable} ${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
