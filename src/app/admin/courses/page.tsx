import type { Metadata } from "next";
import Link from "next/link";
import { requireRole } from "@/lib/auth/guard";
import { listCourses, listSubjects } from "@/modules/curriculum/service";
import { Badge, Card, PageHeader, Table } from "@/components/ui/primitives";
import { gradeShort } from "@/lib/utils";
import { CreateCourseButton } from "./course-actions";

export const metadata: Metadata = { title: "Courses" };

export default async function AdminCoursesPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const [courses, subjects] = await Promise.all([listCourses(), listSubjects()]);

  return (
    <div>
      <PageHeader
        title="Courses"
        subtitle="The curriculum tree: courses → chapters → lessons → activities."
        action={
          <CreateCourseButton
            subjects={subjects.map((s) => ({ id: s.id, name: s.name }))}
          />
        }
      />
      <Card>
        <Table head={["Course", "Subject", "Grade", "Content", "Enrolled", "Status"]}>
          {courses.map((c) => (
            <tr key={c.id} className="transition hover:bg-surface-hover">
              <td className="px-5 py-3">
                <Link href={`/admin/courses/${c.id}`} className="flex items-center gap-3">
                  <span
                    className="h-8 w-8 shrink-0 rounded-lg"
                    style={{ background: c.coverColor }}
                  />
                  <span className="text-sm font-medium hover:text-primary">{c.title}</span>
                </Link>
              </td>
              <td className="px-5 py-3 text-xs text-muted">{c.subject.name}</td>
              <td className="px-5 py-3">
                <Badge>{gradeShort(c.gradeLevel)}</Badge>
              </td>
              <td className="px-5 py-3 text-xs text-muted">
                {c._count.chapters} chapters · {c._count.activities} activities
              </td>
              <td className="px-5 py-3 text-xs text-muted">{c._count.enrollments}</td>
              <td className="px-5 py-3">
                <Badge tone={c.isPublished ? "success" : "warning"}>
                  {c.isPublished ? "Published" : "Draft"}
                </Badge>
              </td>
            </tr>
          ))}
        </Table>
        {courses.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-muted">
            No courses yet — create the first one.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
