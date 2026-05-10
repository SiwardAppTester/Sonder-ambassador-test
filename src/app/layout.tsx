import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { OrganizationProvider } from "@/providers/organization-provider";
import { PermissionsProvider } from "@/providers/permissions-provider";
import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sonder Admin",
  description: "Sonder admin dashboard",
};

// Runs before React hydrates so the correct theme class is on <html>
// before the browser computes any styles — no flash on light-mode reload.
const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('theme');
    document.documentElement.classList.add(t === 'light' ? 'light' : 'dark');
  } catch (e) {
    document.documentElement.classList.add('dark');
  }
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            <QueryProvider>
              <OrganizationProvider>
                <PermissionsProvider>{children}</PermissionsProvider>
              </OrganizationProvider>
            </QueryProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
