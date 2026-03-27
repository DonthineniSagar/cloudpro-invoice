import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { ToastProvider } from "@/lib/toast-context";
import AmplifyConfig from "@/lib/amplify-config";
import InstallPrompt from "@/components/InstallPrompt";

export const metadata: Metadata = {
  title: "CloudPro Invoice - Professional Invoicing for NZ Businesses",
  description: "Modern invoicing platform for freelancers and small businesses in New Zealand. Create tax invoices, track expenses, manage clients, and get paid faster.",
  keywords: ["invoice", "invoicing", "New Zealand", "NZ", "GST", "tax invoice", "freelancer", "small business", "accounting"],
  openGraph: {
    title: "CloudPro Invoice - Professional Invoicing",
    description: "Create beautiful tax invoices, track expenses, and manage clients. Built for NZ freelancers and small businesses.",
    type: "website",
    locale: "en_NZ",
    siteName: "CloudPro Invoice",
  },
  twitter: {
    card: "summary_large_image",
    title: "CloudPro Invoice - Professional Invoicing",
    description: "Create beautiful tax invoices, track expenses, and manage clients. Built for NZ freelancers and small businesses.",
  },
  robots: { index: true, follow: true },
  manifest: "/manifest.json",
  other: { "mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="antialiased" style={{ fontFamily: 'Inter, sans-serif' }}>
        <AmplifyConfig />
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              {children}
              <InstallPrompt />
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
