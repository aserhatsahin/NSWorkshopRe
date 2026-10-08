import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatKurus, kurusToLiraInput } from "@/lib/money";
import { sellMaterialAction } from "@/modules/materials/actions";
import { listProducts } from "@/modules/materials/service";
import { getStudent } from "@/modules/students/service";
import { SaleForm } from "./sale-form";

export const metadata: Metadata = { title: "Malzeme sat" };

type NewSalePageProps = { params: Promise<{ id: string }> };

export default function NewSalePage({ params }: NewSalePageProps) {
  return (
    <div className="flex flex-col gap-6">
      <Suspense fallback={<p className="text-zinc-500">Yükleniyor…</p>}>
        <NewSale params={params} />
      </Suspense>
    </div>
  );
}

async function NewSale({ params }: NewSalePageProps) {
  const { id } = await params;
  const student = await getStudent(id);
  if (!student) {
    notFound();
  }

  const products = await listProducts({ activeOnly: true });

  return (
    <>
      <div>
        <Link href={`/students/${student.id}`} className="text-sm text-zinc-500 hover:underline">
          ← {student.fullName}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Malzeme sat</h1>
      </div>

      {student.status !== "ACTIVE" ? (
        <p className="max-w-md text-sm text-red-600">Yalnızca aktif öğrenciye malzeme satılabilir.</p>
      ) : products.length === 0 ? (
        <p className="max-w-md text-sm text-red-600">
          Satış yapmak için önce{" "}
          <Link href="/products/new" className="underline">
            bir ürün ekle
          </Link>
          .
        </p>
      ) : (
        <SaleForm
          action={sellMaterialAction.bind(null, student.id)}
          products={products.map((product) => ({
            value: product.id,
            label: `${product.name} — ${formatKurus(product.defaultPrice)}`,
            price: kurusToLiraInput(product.defaultPrice),
          }))}
        />
      )}
    </>
  );
}
