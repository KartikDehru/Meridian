import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icons";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const FEATURES: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "book-open",
    title: "Structured curriculum",
    body: "Courses, chapters and lessons for every grade from Kindergarten to Grade 10.",
  },
  {
    icon: "clipboard-check",
    title: "Activities & auto-grading",
    body: "Quizzes, assignments and worksheets with instant grading and teacher review.",
  },
  {
    icon: "video",
    title: "Live classes",
    body: "Zoom-integrated scheduling with one-click join and automatic attendance.",
  },
  {
    icon: "bar-chart",
    title: "Family insights",
    body: "Parents follow every child's scores, progress and attendance in real time.",
  },
  {
    icon: "mail",
    title: "Smart communication",
    body: "Customizable email templates, announcements and in-app notifications.",
  },
  {
    icon: "shield",
    title: "Secure by design",
    body: "Role-based access, hashed credentials, rate limiting and a full audit trail.",
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Icon name="graduation-cap" size={18} />
          </span>
          <span className="text-sm font-semibold tracking-tight">Meridian LMS</span>
        </span>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/login"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6">
        <section className="py-20 text-center">
          <p className="mx-auto mb-4 w-fit rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted">
            K-10 learning, one calm platform
          </p>
          <h1 className="mx-auto max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">
            Everything a school needs.
            <span className="block text-primary">Nothing it doesn&apos;t.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted md:text-base">
            Meridian brings lessons, activities, live classes and family insight
            together — with dedicated portals for students, parents, admins and
            super admins.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link
              href="/login"
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
            >
              Open your portal
            </Link>
            <a
              href="https://github.com"
              className="rounded-lg border border-border bg-surface px-6 py-2.5 text-sm font-medium transition hover:bg-surface-hover"
            >
              Read the docs
            </a>
          </div>
        </section>

        <section className="grid gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border border-border bg-surface p-5 shadow-[var(--shadow)]"
            >
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary">
                <Icon name={f.icon} size={18} />
              </span>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">{f.body}</p>
            </div>
          ))}
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted">
        Meridian LMS — built for calm, focused learning.
      </footer>
    </div>
  );
}
