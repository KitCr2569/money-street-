import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SWRProvider from "@/components/providers/SWRProvider";
import DBSyncProvider from "@/components/providers/DBSyncProvider";
import { ToastProvider } from "@/components/ui/Toast";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0a0a0f",
  colorScheme: "dark",
};

export const metadata: Metadata = {
  title: {
    default: "Money Street — วิเคราะห์หุ้นอเมริกา",
    template: "%s | Money Street",
  },
  description: "แพลตฟอร์มวิเคราะห์หุ้นอเมริกา S&P 500 Nasdaq-100",
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="dark">
      <body className="antialiased bg-background text-foreground min-h-screen">
        <DBSyncProvider>
          <SWRProvider>
            <ToastProvider>
              <Header />
              <main>
                {children}
              </main>
              <Footer />
            </ToastProvider>
          </SWRProvider>
        </DBSyncProvider>
      </body>
    </html>
  );
}
