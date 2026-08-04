import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const plusJakartaSans = Plus_Jakarta_Sans({ 
  subsets: ["latin"], 
  variable: "--font-heading" 
});

export const metadata: Metadata = {
  title: "CandiAxis",
  description: "Align Every Hiring Decision",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${plusJakartaSans.variable} font-sans antialiased bg-background text-foreground`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
