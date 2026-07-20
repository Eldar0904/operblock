import { SignUp } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { LayoutGrid } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <Link to="/" className="mb-8 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <LayoutGrid className="h-4 w-4" />
        </div>
        <span className="text-lg font-semibold tracking-tight">OperBlock</span>
      </Link>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        fallbackRedirectUrl="/dashboard/projects"
      />
    </div>
  );
}
