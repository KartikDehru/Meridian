import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Icon } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon name="graduation-cap" size={18} />
          </span>
          <span className="text-sm font-semibold tracking-tight">Meridian LMS</span>
        </Link>
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-6 pb-16">
        <div className="w-full max-w-sm">
          <h1 className="text-center text-xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p className="mt-1 text-center text-sm text-muted">
            Sign in to your portal — student, parent or staff.
          </p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
