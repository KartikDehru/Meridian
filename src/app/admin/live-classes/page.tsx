import type { Metadata } from "next";
import { requireRole } from "@/lib/auth/guard";
import { listLiveClasses } from "@/modules/live-classes/service";
import { listCourses } from "@/modules/curriculum/service";
import { zoomConfigured } from "@/modules/live-classes/zoom";
import { Badge, Card, PageHeader, Table } from "@/components/ui/primitives";
import { formatDateTime, gradeShort } from "@/lib/utils";
import { ClassActions, ScheduleClassButton } from "./class-actions";

export const metadata: Metadata = { title: "Live Classes" };

export default async function AdminLiveClassesPage() {
  await requireRole("ADMIN", "SUPER_ADMIN");
  const [classes, courses] = await Promise.all([listLiveClasses(), listCourses()]);

  return (
    <div>
      <PageHeader
        title="Live classes"
        subtitle={
          zoomConfigured()
            ? "Zoom is connected — meetings are created automatically."
            : "Zoom is not configured — paste a meeting link when scheduling (see docs/integrations/zoom.md)."
        }
        action={
          <ScheduleClassButton
            zoomEnabled={zoomConfigured()}
            courses={courses.map((c) => ({
              id: c.id,
              title: c.title,
              gradeLevel: c.gradeLevel,
            }))}
          />
        }
      />
      <Card>
        <Table head={["Class", "Grade", "Starts", "Provider", "Status", "Attendance", ""]}>
          {classes.map((c) => (
            <tr key={c.id}>
              <td className="px-5 py-3">
                <p className="text-sm font-medium">{c.title}</p>
                <p className="text-xs text-muted">
                  {c.course ? c.course.title : "General"} · {c.host.firstName}{" "}
                  {c.host.lastName}
                </p>
              </td>
              <td className="px-5 py-3">
                <Badge>{gradeShort(c.gradeLevel)}</Badge>
              </td>
              <td className="px-5 py-3 text-xs text-muted">
                {formatDateTime(c.startTime)} · {c.durationMinutes}m
              </td>
              <td className="px-5 py-3 text-xs text-muted">{c.provider}</td>
              <td className="px-5 py-3">
                <Badge
                  tone={
                    c.status === "LIVE"
                      ? "success"
                      : c.status === "CANCELLED"
                        ? "danger"
                        : c.status === "ENDED"
                          ? "default"
                          : "info"
                  }
                >
                  {c.status}
                </Badge>
              </td>
              <td className="px-5 py-3 text-xs text-muted">{c._count.attendance} students</td>
              <td className="px-5 py-3 text-right">
                <ClassActions
                  liveClassId={c.id}
                  status={c.status}
                  startUrl={c.startUrl}
                />
              </td>
            </tr>
          ))}
        </Table>
        {classes.length === 0 ? (
          <p className="px-5 py-10 text-center text-xs text-muted">
            Nothing scheduled yet.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
