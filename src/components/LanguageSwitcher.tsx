import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { SUPPORTED_LANGUAGES, type AppLanguage } from "@/i18n";

interface LanguageSwitcherProps {
  className?: string;
  variant?: "select" | "buttons";
}

export function LanguageSwitcher({ className, variant = "select" }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();

  const change = (code: AppLanguage) => {
    void i18n.changeLanguage(code);
  };

  if (variant === "buttons") {
    return (
      <div className={cn("flex rounded-md border border-border bg-background p-0.5", className)}>
        {SUPPORTED_LANGUAGES.map(({ code, label }) => (
          <button
            key={code}
            type="button"
            onClick={() => change(code)}
            className={cn(
              "rounded px-3 py-1.5 text-xs font-medium transition-colors",
              i18n.language === code
                ? "bg-indigo-600 text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <select
      value={i18n.language}
      onChange={(e) => change(e.target.value as AppLanguage)}
      className={cn(
        "h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring",
        className,
      )}
    >
      {SUPPORTED_LANGUAGES.map(({ code, label }) => (
        <option key={code} value={code}>
          {label}
        </option>
      ))}
    </select>
  );
}
