import "./globals.css";
import { I18nProvider } from "../components/i18n-provider";
import siteConfig from "../data/site-config";

export const metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: siteConfig.title,
    template: "%s",
  },
  description: siteConfig.description,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "ja_JP",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    url: "/",
    images: [
      {
        url: siteConfig.ogImagePath,
        alt: "nanacha",
      },
    ],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
