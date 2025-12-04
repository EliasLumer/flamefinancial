import type { Metadata } from "next";
import "./globals.css";
import { FlameProvider } from "@/lib/store";
import { MainNav } from "@/components/main-nav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/components/ui/toast";
import BuyMeACoffee from "@/components/buy-me-coffee";

export const metadata: Metadata = {
  title: "Flame",
  description: "Personal finance simulator for FIRE enthusiasts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        <FlameProvider>
          <TooltipProvider>
            <ToastProvider>
              <MainNav />
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {children}
              </main>
              <BuyMeACoffee />
            </ToastProvider>
          </TooltipProvider>
        </FlameProvider>
      </body>
    </html>
  );
}
