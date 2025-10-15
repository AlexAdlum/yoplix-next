import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Yoplix - Онлайн платформа викторин",
    template: "%s | Yoplix"
  },
  description: "Yoplix - увлекательная онлайн платформа викторин. Играй, угадывай, побеждай! Проверь свои знания в различных областях: кино, наука, история, спорт, музыка и география.",
  keywords: ["викторины", "онлайн игры", "тесты", "знания", "образование", "развлечения", "yoplix"],
  authors: [{ name: "Yoplix Team" }],
  creator: "Yoplix",
  publisher: "Yoplix",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://yoplix.ru'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    url: 'https://yoplix.ru',
    siteName: 'Yoplix',
    title: 'Yoplix - Онлайн платформа викторин',
    description: 'Играй, угадывай, побеждай! Проверь свои знания в увлекательных викторинах.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Yoplix - Онлайн платформа викторин',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Yoplix - Онлайн платформа викторин',
    description: 'Играй, угадывай, побеждай! Проверь свои знания в увлекательных викторинах.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
