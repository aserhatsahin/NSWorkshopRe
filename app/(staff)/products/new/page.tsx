import type { Metadata } from "next";
import Link from "next/link";
import { createProductAction } from "@/modules/materials/actions";
import { ProductForm } from "../product-form";

export const metadata: Metadata = { title: "Yeni ürün" };

export default function NewProductPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/products" className="text-sm text-muted hover:underline">
          ← Ürünler
        </Link>
        <h1 className="mt-2 font-display text-3xl">Yeni ürün</h1>
      </div>
      <ProductForm action={createProductAction} submitLabel="Ürünü ekle" />
    </div>
  );
}
