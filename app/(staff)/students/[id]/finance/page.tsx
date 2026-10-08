import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { secondaryButton } from "@/components/button-styles";
import { getCurrentUser } from "@/lib/auth/session";
import { formatKurus } from "@/lib/money";
import { hasPermission } from "@/lib/permissions/definitions";
import { addManualEntryAction, reverseTransactionAction } from "@/modules/finance/actions";
import { DEBT_CATEGORY_LABELS, TRANSACTION_TYPE_LABELS } from "@/modules/finance/ledger";
import { getStudentDebt, listStudentTransactions } from "@/modules/finance/service";
import { returnMaterialSaleAction } from "@/modules/materials/actions";
import { listStudentSales } from "@/modules/materials/service";
import { reversePaymentAction } from "@/modules/payments/actions";
import { PAYMENT_METHOD_LABELS } from "@/modules/payments/schema";
import { listStudentPayments } from "@/modules/payments/service";
import { getStudent } from "@/modules/students/service";
import { ManualEntryForm } from "./manual-entry-form";
import { ReverseForm } from "./reverse-form";

export const metadata: Metadata = { title: "Finans geçmişi" };

type FinancePageProps = { params: Promise<{ id: string }> };

const dateTimeFormatter = new Intl.DateTimeFormat("tr-TR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Istanbul",
});

function formatSigned(kurus: number): string {
  return `${kurus > 0 ? "+" : ""}${formatKurus(kurus)}`;
}

export default function FinancePage({ params }: FinancePageProps) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<p className="text-zinc-500">Yükleniyor…</p>}>
        <StudentFinance params={params} />
      </Suspense>
    </div>
  );
}

async function StudentFinance({ params }: FinancePageProps) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) {
    notFound();
  }

  const [debt, transactions, payments, sales, user] = await Promise.all([
    getStudentDebt(student.id),
    listStudentTransactions(student.id),
    listStudentPayments(student.id),
    listStudentSales(student.id),
    getCurrentUser(),
  ]);
  // Sadece arayüzü sadeleştirir; asıl kontrol service içindeki requirePermission'dır.
  const canAdjust = user !== null && hasPermission(user.role, "finance.adjust");
  const canReversePayment = user !== null && hasPermission(user.role, "payment.reverse");
  const canReturnSale = user !== null && hasPermission(user.role, "material.return");

  return (
    <>
      <div>
        <Link href={`/students/${student.id}`} className="text-sm text-zinc-500 hover:underline">
          ← {student.fullName}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Finans geçmişi</h1>
      </div>

      <dl className="grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Toplam borç", value: debt.total },
          { label: "Kurs", value: debt.course },
          { label: "Malzeme", value: debt.material },
          { label: "Diğer", value: debt.other },
        ].map((item) => (
          <div key={item.label} className="rounded-md border border-zinc-200 px-3 py-2 dark:border-zinc-800">
            <dt className="text-sm text-zinc-500">{item.label}</dt>
            <dd className="font-medium">{formatKurus(item.value)}</dd>
          </div>
        ))}
      </dl>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-medium">Ödemeler</h2>
          {debt.total > 0 ? (
            <Link href={`/students/${student.id}/payments/new`} className={secondaryButton}>
              Ödeme al
            </Link>
          ) : null}
        </div>
        {payments.length === 0 ? (
          <p className="text-zinc-500">Henüz ödeme alınmamış.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {payments.map((payment) => (
              <li key={payment.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <span className="flex flex-col">
                    <span className="font-medium">
                      {PAYMENT_METHOD_LABELS[payment.method]}
                      {payment.isReversed ? <span className="font-normal text-red-600"> · iptal edildi</span> : null}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {payment.allocations
                        .map((allocation) => `${DEBT_CATEGORY_LABELS[allocation.category]} ${formatKurus(allocation.amount)}`)
                        .join(" · ")}
                    </span>
                    {payment.note ? <span className="text-sm">{payment.note}</span> : null}
                    <span className="text-sm text-zinc-500">{dateTimeFormatter.format(payment.receivedAt)}</span>
                  </span>
                  <span className={`font-medium tabular-nums ${payment.isReversed ? "line-through" : ""}`}>
                    {formatKurus(payment.amount)}
                  </span>
                </div>
                {canReversePayment && !payment.isReversed ? (
                  <ReverseForm
                    label="Ödemeyi iptal et"
                    submitLabel="İptali onayla"
                    action={reversePaymentAction.bind(null, payment.id)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-medium">Malzeme satışları</h2>
          {student.status === "ACTIVE" ? (
            <Link href={`/students/${student.id}/sales/new`} className={secondaryButton}>
              Malzeme sat
            </Link>
          ) : null}
        </div>
        {sales.length === 0 ? (
          <p className="text-zinc-500">Henüz malzeme satışı yok.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {sales.map((sale) => (
              <li key={sale.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <span className="flex flex-col">
                    <span className="font-medium">
                      {sale.product.name}
                      {sale.isReturned ? <span className="font-normal text-red-600"> · iade edildi</span> : null}
                    </span>
                    <span className="text-sm text-zinc-500">
                      {sale.quantity} adet × {formatKurus(sale.unitPrice)}
                    </span>
                    <span className="text-sm text-zinc-500">{dateTimeFormatter.format(sale.soldAt)}</span>
                  </span>
                  <span className={`font-medium tabular-nums ${sale.isReturned ? "line-through" : ""}`}>
                    {formatKurus(sale.total)}
                  </span>
                </div>
                {canReturnSale && !sale.isReturned ? (
                  <ReverseForm
                    label="İade al"
                    submitLabel="İadeyi onayla"
                    action={returnMaterialSaleAction.bind(null, sale.id)}
                  />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Kayıtlar</h2>
        {transactions.length === 0 ? (
          <p className="text-zinc-500">Henüz finans kaydı yok.</p>
        ) : (
          <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
            {transactions.map((transaction) => (
              <li key={transaction.id} className="flex flex-col gap-2 px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                  <span className="flex flex-col">
                    <span className="font-medium">
                      {TRANSACTION_TYPE_LABELS[transaction.type]}
                      <span className="font-normal text-zinc-500"> · {DEBT_CATEGORY_LABELS[transaction.category]}</span>
                    </span>
                    {transaction.description ? <span className="text-sm">{transaction.description}</span> : null}
                    <span className="text-sm text-zinc-500">
                      {dateTimeFormatter.format(transaction.createdAt)}
                      {transaction.reversalTransaction ? " · ters çevrildi" : ""}
                      {transaction.reversedTransactionId ? " · ters kayıt" : ""}
                    </span>
                  </span>
                  <span className="flex flex-col items-end">
                    <span className="font-medium tabular-nums">{formatSigned(transaction.amount)}</span>
                    <span className="text-sm text-zinc-500 tabular-nums">Bakiye {formatKurus(transaction.balance)}</span>
                  </span>
                </div>
                {canAdjust && transaction.canReverse ? (
                  <ReverseForm action={reverseTransactionAction.bind(null, transaction.id)} />
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {canAdjust ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-medium">Elle kayıt ekle</h2>
          <p className="max-w-md text-sm text-zinc-500">
            Kayıtlar silinmez ve düzenlenmez. Hatalı bir kaydı düzeltmek için ters kayıt yazılır.
          </p>
          <ManualEntryForm action={addManualEntryAction.bind(null, student.id)} />
        </section>
      ) : null}
    </>
  );
}
