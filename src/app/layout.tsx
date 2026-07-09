import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import "goey-toast/styles.css";
import { ThemeProvider } from "@/components/theme-provider";
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

const instrumentSerif = Instrument_Serif({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
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
        url: "/preview.png",
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
    images: ["/preview.png"],
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
      suppressHydrationWarning
      className={`${inter.variable} ${jakarta.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
