import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatKurus } from "@/lib/money";
import { getStudentDebt } from "@/modules/finance/service";
import { createPaymentAction } from "@/modules/payments/actions";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS } from "@/modules/payments/schema";
import { getStudent } from "@/modules/students/service";
import { PaymentForm } from "./payment-form";

export const metadata: Metadata = { title: "Ödeme al" };

type NewPaymentPageProps = { params: Promise<{ id: string }> };

const METHOD_OPTIONS = PAYMENT_METHODS.map((method) => ({ value: method, label: PAYMENT_METHOD_LABELS[method] }));

export default function NewPaymentPage({ params }: NewPaymentPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<p className="text-zinc-500">Yükleniyor…</p>}>
        <NewPayment params={params} />
      </Suspense>
    </div>
  );
}

async function NewPayment({ params }: NewPaymentPageProps) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) {
    notFound();
  }

  const debt = await getStudentDebt(student.id);

  return (
    <>
      <div>
        <Link href={`/students/${student.id}`} className="text-sm text-zinc-500 hover:underline">
          ← {student.fullName}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Ödeme al</h1>
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

      {debt.total <= 0 ? (
        <p className="max-w-md text-sm text-zinc-500">
          Bu öğrencinin borcu yok. Ödeme borçtan fazla olamayacağı için şu an ödeme alınamaz.
        </p>
      ) : (
        <PaymentForm action={createPaymentAction.bind(null, student.id)} methodOptions={METHOD_OPTIONS} />
      )}
    </>
  );
}
