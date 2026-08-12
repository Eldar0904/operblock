import { SignIn } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { PineLogo } from "@/components/PineLogo";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Link to="/" className="mb-8 flex flex-col items-center gap-2">
        <PineLogo className="h-12" />
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">OperBlock</span>
      </Link>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
