import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { primaryButton } from "@/components/button-styles";
import { formatKurus } from "@/lib/money";
import { listProducts } from "@/modules/materials/service";

export const metadata: Metadata = { title: "Ürünler" };

export default function ProductsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Ürünler</h1>
        <Link href="/products/new" className={primaryButton}>
          Yeni ürün
        </Link>
      </div>
      <Suspense fallback={<p className="text-zinc-500">Yükleniyor…</p>}>
        <ProductList />
      </Suspense>
    </div>
  );
}

async function ProductList() {
  const products = await listProducts();

  if (products.length === 0) {
    return <p className="text-zinc-500">Henüz ürün yok.</p>;
  }

  return (
    <ul className="divide-y divide-zinc-200 rounded-md border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
      {products.map((product) => (
        <li key={product.id}>
          <Link
            href={`/products/${product.id}`}
            className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            <span className="font-medium">{product.name}</span>
            <span className="shrink-0 text-sm text-zinc-500">
              {formatKurus(product.defaultPrice)}
              {product.isActive ? "" : " · Pasif"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
