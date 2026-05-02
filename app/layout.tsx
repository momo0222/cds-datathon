import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRVL — Travel Planning That Gives Back Time",
  description: "Consolidate flights, hotels, budgets, food & maps into one shareable itinerary.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
