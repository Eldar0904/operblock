import { ClerkProvider } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { getClerkLocalization } from "@/i18n/clerk-locales";

interface ClerkProviderWithLocaleProps {
  publishableKey: string;
  children: React.ReactNode;
}

export function ClerkProviderWithLocale({ publishableKey, children }: ClerkProviderWithLocaleProps) {
  const { i18n } = useTranslation();

  return (
    <ClerkProvider
      key={i18n.language}
      publishableKey={publishableKey}
      localization={getClerkLocalization(i18n.language)}
    >
      {children}
    </ClerkProvider>
  );
}
