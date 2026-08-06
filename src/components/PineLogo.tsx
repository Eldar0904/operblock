import { cn } from "@/lib/utils";

interface PineLogoProps {
  className?: string;
  light?: boolean;
}

export function PineLogo({ className, light = false }: PineLogoProps) {
  return (
    <img
      src={light ? "/pine-logo-white.png" : "/pine-logo.png"}
      alt="PINE"
      className={cn("h-8 w-auto object-contain", className)}
    />
  );
}
