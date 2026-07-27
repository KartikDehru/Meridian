import { handler, ok, parseBody } from "@/lib/api";
import { requirePermission } from "@/lib/auth/guard";
import { addQuestion, questionSchema } from "@/modules/activities/service";

export const POST = handler(async (req, { params }) => {
  const session = await requirePermission("curriculum.manage");
  const { id } = await params;
  const body = await parseBody(req, questionSchema);
  const question = await addQuestion(id, body, session.sub);
  return ok(question, { status: 201 });
});
