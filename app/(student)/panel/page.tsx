import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { AvatarBlob } from "@/components/avatar-blob";
import { DebtCards } from "@/components/debt-cards";
import { LessonMarks } from "@/components/lesson-marks";
import { PhotoUploader } from "@/components/photo-uploader";
import { Badge, StatusBadge } from "@/components/status-badge";
import { addDays, formatDate, workshopToday } from "@/lib/dates";
import { formatKurus } from "@/lib/money";
import { pigmentFor } from "@/lib/pigment";
import { TRANSACTION_TYPE_LABELS } from "@/modules/finance/ledger";
import { DAY_NAMES, formatGroupName } from "@/modules/groups/format";
import { LESSONS_PER_PERIOD } from "@/modules/periods/lessons";
import { removeOwnPhotoAction, setOwnPhotoAction } from "@/modules/photos/actions";
import { photoUrl } from "@/modules/photos/rules";
import { getOwnPanel, type OwnPeriod } from "@/modules/student-panel/service";

export const metadata: Metadata = { title: "Panelim" };

const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeZone: "Europe/Istanbul",
});

export default function StudentPanelPage() {
  return (
    <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
      <OwnPanel />
    </Suspense>
  );
}

function periodRange(period: OwnPeriod): string {
  return `${formatDate(period.startDate)} – ${formatDate(addDays(period.startDate, (LESSONS_PER_PERIOD - 1) * 7))}`;
}

function ActivePeriod({ period, today }: { period: OwnPeriod; today: Date }) {
  const nextLesson = period.lessons.find((lesson) => lesson.status === "UNMARKED" && lesson.lessonDate >= today);

  return (
    <section className="edge overflow-hidden rounded-xl bg-surface">
      <div className={`flex flex-wrap items-end justify-between gap-3 px-4 py-4 ${pigmentFor(period.group.id)}`}>
        <div>
          <p className="text-sm">Bu dönem</p>
          <h2 className="font-display text-3xl leading-tight">{periodRange(period)}</h2>
        </div>
        <p className="text-sm font-medium">{formatGroupName(period.group)}</p>
      </div>
      <div className="flex flex-col gap-4 px-4 py-4">
        <p>
          {nextLesson ? (
            <>
              Sıradaki dersin{" "}
              <strong>
                {DAY_NAMES[nextLesson.lessonDate.getUTCDay()]}, {formatDate(nextLesson.lessonDate)}
              </strong>{" "}
              saat <strong>{period.group.startTime}</strong>.
            </>
          ) : (
            "Bu dönemde planlanmış başka dersin yok."
          )}
        </p>
        <ul className="flex flex-col [&>li+li]:border-t [&>li+li]:border-line">
          {period.lessons.map((lesson) => (
            <li key={lesson.weekNumber} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span>
                {lesson.weekNumber}. hafta · {formatDate(lesson.lessonDate)}
              </span>
              <LessonMarks lessons={[lesson]} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

async function OwnPanel() {
  const panel = await getOwnPanel();
  // "Bugün" her istekte yeniden hesaplanmalı; prerender sırasında sabitlenmesin.
  await connection();
  const today = workshopToday();

  if (!panel) {
    return <p>Öğrenci kaydın bulunamadı. Atölyeyle iletişime geç.</p>;
  }

  const firstName = panel.fullName.trim().split(/\s+/)[0];

  if (panel.state === "PENDING") {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="font-display text-4xl leading-tight">Merhaba {firstName}</h1>
        <div className="edge flex items-start gap-4 rounded-xl bg-p-ochre p-5 text-[#231f1c]">
          <div>
            <p className="font-display text-2xl">Kaydın onay bekliyor</p>
            <p className="mt-1 text-sm">
              Atölye kaydını onayladığında derslerini, yoklamanı ve ödemelerini bu sayfada göreceksin.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const activePeriod = panel.periods.find((period) => period.status === "ACTIVE");
  const pastPeriods = panel.periods.filter((period) => period.status === "COMPLETED");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <AvatarBlob
          name={panel.fullName}
          pigmentSeed={panel.group?.id ?? panel.profileId}
          size="xl"
          photoUrl={panel.photoUpdatedAt ? photoUrl(panel.profileId, panel.photoUpdatedAt) : null}
        />
        <div className="flex flex-col gap-2">
          <h1 className="font-display text-4xl leading-none">Merhaba {firstName}</h1>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={panel.status} />
            {panel.group ? <Badge className={pigmentFor(panel.group.id)}>{formatGroupName(panel.group)}</Badge> : null}
          </div>
          <PhotoUploader
            hasPhoto={panel.photoUpdatedAt !== null}
            uploadAction={setOwnPhotoAction}
            removeAction={removeOwnPhotoAction}
          />
        </div>
      </div>

      <DebtCards debt={panel.debt} />

      {activePeriod ? (
        <ActivePeriod period={activePeriod} today={today} />
      ) : (
        <p className="edge rounded-xl bg-surface p-4">
          Şu an aktif bir dönemin yok. Yeni dönem için atölyeyle görüş.
        </p>
      )}

      {pastPeriods.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl">Geçmiş dönemler</h2>
          <ul className="list">
            {pastPeriods.map((period) => (
              <li key={period.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <span className="flex flex-col">
                  <span className="font-medium">{periodRange(period)}</span>
                  <span className="text-sm text-muted">
                    {formatGroupName(period.group)} · {formatKurus(period.price)}
                  </span>
                </span>
                <LessonMarks lessons={period.lessons} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-3">
        <h2 className="font-display text-xl">Hesap hareketleri</h2>
        {panel.transactions.length === 0 ? (
          <p className="text-muted">Henüz hesap hareketin yok.</p>
        ) : (
          <ul className="list">
            {panel.transactions.map((transaction) => (
              <li key={transaction.id} className="flex items-start justify-between gap-4 px-4 py-3">
                <span className="flex flex-col">
                  <span className="font-medium">{TRANSACTION_TYPE_LABELS[transaction.type]}</span>
                  {transaction.description ? <span className="text-sm">{transaction.description}</span> : null}
                  <span className="text-sm text-muted">{dateTimeFormatter.format(transaction.createdAt)}</span>
                </span>
                <span className={`font-medium tabular-nums ${transaction.amount < 0 ? "text-success" : ""}`}>
                  {transaction.amount > 0 ? "+" : "−"}
                  {formatKurus(Math.abs(transaction.amount))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
