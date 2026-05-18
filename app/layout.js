import "./globals.css";
import { I18nProvider } from "../components/i18n-provider";
import siteConfig from "../data/site-config";
const { languageAlternates, localeConfig } = require("../data/locales");

export const metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: siteConfig.title,
    template: "%s",
  },
  description: siteConfig.description,
  alternates: {
    canonical: "/",
    languages: languageAlternates("/"),
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

export default async function RootLayout({ children, params }) {
  const routeParams = await params;
  const htmlLang = localeConfig[routeParams?.lang]?.htmlLang || "ja";

  return (
    <html lang={htmlLang}>
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
