import { Check, X } from "lucide-react";
import type { AttendanceStatus } from "@/lib/generated/prisma/client";

const LABELS: Record<AttendanceStatus, string> = { PRESENT: "geldi", ABSENT: "gelmedi", UNMARKED: "işlenmedi" };

// Dönemin derslerini salt okunur boya lekeleriyle gösterir.
export function LessonMarks({ lessons }: { lessons: readonly { weekNumber: number; status: AttendanceStatus }[] }) {
  const summary = lessons.map((lesson) => `${lesson.weekNumber}. hafta ${LABELS[lesson.status]}`).join(", ");

  return (
    <div role="img" aria-label={summary} className="flex items-center gap-2">
      {lessons.map((lesson) => {
        const shape = lesson.weekNumber % 2 === 0 ? "blob-alt" : "blob";
        if (lesson.status === "PRESENT") {
          return (
            <span key={lesson.weekNumber} className={`${shape} flex size-9 items-center justify-center bg-p-green text-[#f6f1e7]`}>
              <Check size={18} aria-hidden />
            </span>
          );
        }
        if (lesson.status === "ABSENT") {
          return (
            <span key={lesson.weekNumber} className={`${shape} flex size-9 items-center justify-center bg-p-red text-[#231f1c]`}>
              <X size={18} aria-hidden />
            </span>
          );
        }
        return (
          <span
            key={lesson.weekNumber}
            className={`${shape} flex size-9 items-center justify-center border-2 border-dashed border-line-strong text-xs font-medium`}
          >
            {lesson.weekNumber}
          </span>
        );
      })}
    </div>
  );
}
