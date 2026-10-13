import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { primaryButton } from "@/components/button-styles";
import { formatKurus } from "@/lib/money";
import { listProducts, type ProductSummary } from "@/modules/materials/service";

export const metadata: Metadata = { title: "Ürünler" };

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl">Ürünler</h1>
        <Link href="/products/new" className={primaryButton}>
          Yeni ürün
        </Link>
      </div>
      <Suspense fallback={<p className="text-muted">Yükleniyor…</p>}>
        <ProductList />
      </Suspense>
    </div>
  );
}

async function ProductList() {
  const products = await listProducts();

  if (products.length === 0) {
    return <p className="text-muted">Henüz ürün yok.</p>;
  }

  const active = products.filter((product) => product.isActive);
  const inactive = products.filter((product) => !product.isActive);

  return (
    <>
      {active.length > 0 ? <ProductRows products={active} /> : <p className="text-muted">Aktif ürün yok.</p>}
      {inactive.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl text-muted">Pasif ürünler</h2>
          <ProductRows products={inactive} />
        </section>
      ) : null}
    </>
  );
}

function ProductRows({ products }: { products: ProductSummary[] }) {
  return (
    <ul className="list">
      {products.map((product) => (
        <li key={product.id}>
          <Link
            href={`/products/${product.id}`}
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-paper"
          >
            <span className="font-medium">{product.name}</span>
            <span className="shrink-0 text-sm text-muted">
              {formatKurus(product.defaultPrice)}
              {product.isActive ? "" : " · Pasif"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
