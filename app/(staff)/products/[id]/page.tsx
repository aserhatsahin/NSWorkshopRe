import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActiveToggle } from "@/components/active-toggle";
import { kurusToLiraInput } from "@/lib/money";
import { setProductActiveAction, updateProductAction } from "@/modules/materials/actions";
import { getProduct } from "@/modules/materials/service";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Ürün" };

type ProductPageProps = { params: Promise<{ id: string }> };

export default function ProductPage({ params }: ProductPageProps) {
  return (
    <div className="flex flex-col gap-6">
      <Link href="/products" className="text-sm text-zinc-500 hover:underline">
        ← Ürünler
      </Link>
      <Suspense fallback={<p className="text-zinc-500">Yükleniyor…</p>}>
        <ProductDetail params={params} />
      </Suspense>
    </div>
  );
}

async function ProductDetail({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) {
    notFound();
  }

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        <p className="mt-1 text-zinc-500">{product.isActive ? "Aktif" : "Pasif"}</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Bilgiler</h2>
        <ProductForm
          action={updateProductAction.bind(null, product.id)}
          submitLabel="Kaydet"
          initialValues={{ name: product.name, defaultPrice: kurusToLiraInput(product.defaultPrice) }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Durum</h2>
        <p className="text-sm text-zinc-500">Pasif ürün satış formunda görünmez. Geçmiş satışlar yerinde kalır.</p>
        <ActiveToggle
          key={String(product.isActive)}
          isActive={product.isActive}
          action={setProductActiveAction.bind(null, product.id, !product.isActive)}
        />
      </section>
    </>
  );
}
