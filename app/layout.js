import "./globals.css";
import { I18nProvider } from "../components/i18n-provider";

export const metadata = {
  title: "nanacha｜タピオカ・ミルクティー・フルーツティー",
  description:
    "nanacha は、黒糖タピオカミルク、フルーツティー、スムージー、八女抹茶ラテを楽しめるティースタンド。福岡清川店から、気軽に楽しめる一杯をお届けします。",
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
