import type { Metadata } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { OrganizationProvider } from "@/providers/organization-provider";
import { PermissionsProvider } from "@/providers/permissions-provider";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sonder Admin",
  description: "Sonder admin dashboard",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} className="dark">
      <body>
        <NextIntlClientProvider messages={messages}>
          <QueryProvider>
            <OrganizationProvider>
              <PermissionsProvider>{children}</PermissionsProvider>
            </OrganizationProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
