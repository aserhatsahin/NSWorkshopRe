import { prisma } from "@/lib/db/prisma";
import { DomainError } from "@/lib/errors";
import { Prisma } from "@/lib/generated/prisma/client";
import { requirePermission } from "@/lib/permissions/guard";
import { logAudit } from "@/modules/audit/service";
import { createLedgerEntry } from "@/modules/finance/entries";
import { buildReversal } from "@/modules/finance/ledger";
import { lockStudentForFinance } from "@/modules/finance/lock";
import type { ReversalInput } from "@/modules/finance/schema";
import { saleTotal, type ProductFormInput, type SaleFormInput } from "./schema";

const PRODUCT_NOT_FOUND = "Ürün bulunamadı.";

const productSelect = {
  id: true,
  name: true,
  defaultPrice: true,
  isActive: true,
} satisfies Prisma.ProductSelect;

export type ProductSummary = Prisma.ProductGetPayload<{ select: typeof productSelect }>;

export async function listProducts(options: { activeOnly?: boolean } = {}): Promise<ProductSummary[]> {
  await requirePermission("product.view");

  return prisma.product.findMany({
    where: options.activeOnly ? { isActive: true } : {},
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: productSelect,
  });
}

export async function getProduct(id: string): Promise<ProductSummary | null> {
  await requirePermission("product.view");
  return prisma.product.findUnique({ where: { id }, select: productSelect });
}

export async function createProduct(input: ProductFormInput): Promise<{ id: string }> {
  const actor = await requirePermission("product.manage");

  return prisma.$transaction(async (tx) => {
    const product = await tx.product.create({ data: input, select: { id: true } });
    await logAudit(tx, { actorId: actor.id, action: "PRODUCT_CREATED", metadata: { productId: product.id, ...input } });
    return product;
  });
}

// Katalog fiyatı yalnızca sonraki satışlar için öneridir; geçmiş satışlar
// kendi unitPrice'ını taşıdığı için bu değişiklikten etkilenmez.
export async function updateProduct(id: string, input: ProductFormInput): Promise<void> {
  const actor = await requirePermission("product.manage");

  await prisma.$transaction(async (tx) => {
    const before = await tx.product.findUnique({ where: { id }, select: { name: true, defaultPrice: true } });
    if (!before) {
      throw new DomainError(PRODUCT_NOT_FOUND);
    }
    await tx.product.update({ where: { id }, data: input });
    await logAudit(tx, {
      actorId: actor.id,
      action: "PRODUCT_UPDATED",
      metadata: { productId: id, before, after: { ...input } },
    });
  });
}

// Ürün silinmez, pasife alınır: geçmiş satışlar ürüne bağlı kalır.
export async function setProductActive(id: string, isActive: boolean): Promise<void> {
  const actor = await requirePermission("product.manage");

  await prisma.$transaction(async (tx) => {
    const { count } = await tx.product.updateMany({ where: { id }, data: { isActive } });
    if (count !== 1) {
      throw new DomainError(PRODUCT_NOT_FOUND);
    }
    await logAudit(tx, { actorId: actor.id, action: "PRODUCT_UPDATED", metadata: { productId: id, isActive } });
  });
}

const saleSelect = {
  id: true,
  unitPrice: true,
  quantity: true,
  soldAt: true,
  product: { select: { name: true } },
  transactions: { select: { type: true } },
} satisfies Prisma.MaterialSaleSelect;

type SaleRow = Prisma.MaterialSaleGetPayload<{ select: typeof saleSelect }>;

export type SaleSummary = Omit<SaleRow, "transactions"> & { total: number; isReturned: boolean };

export async function listStudentSales(studentId: string): Promise<SaleSummary[]> {
  await requirePermission("finance.viewStudent");

  const sales = await prisma.materialSale.findMany({
    where: { studentId },
    orderBy: [{ soldAt: "desc" }],
    select: saleSelect,
  });

  return sales.map(({ transactions, ...sale }) => ({
    ...sale,
    total: saleTotal(sale),
    isReturned: transactions.some((transaction) => transaction.type === "MATERIAL_RETURN"),
  }));
}

// Satış kaydı, MATERIAL_SALE ledger kaydı ve audit log birlikte yazılır.
// unitPrice satış anında donar; katalog fiyatı sonradan değişse de bu satış değişmez.
export async function sellMaterial(studentId: string, input: SaleFormInput): Promise<{ id: string }> {
  const actor = await requirePermission("material.sell");

  return prisma.$transaction(async (tx) => {
    const student = await lockStudentForFinance(tx, studentId);
    if (student.status !== "ACTIVE") {
      throw new DomainError("Yalnızca aktif öğrenciye malzeme satılabilir.");
    }

    const product = await tx.product.findUnique({
      where: { id: input.productId },
      select: { name: true, isActive: true },
    });
    if (!product || !product.isActive) {
      throw new DomainError("Seçilen ürün bulunamadı ya da pasif.");
    }

    const sale = await tx.materialSale.create({
      data: {
        studentId,
        productId: input.productId,
        unitPrice: input.unitPrice,
        quantity: input.quantity,
        soldById: actor.id,
      },
      select: { id: true },
    });

    await createLedgerEntry(tx, {
      studentId,
      type: "MATERIAL_SALE",
      category: "MATERIAL",
      amount: saleTotal(input),
      description: input.quantity > 1 ? `${product.name} × ${input.quantity}` : product.name,
      materialSaleId: sale.id,
      createdById: actor.id,
    });

    await logAudit(tx, {
      actorId: actor.id,
      action: "MATERIAL_SOLD",
      targetStudentId: studentId,
      metadata: { saleId: sale.id, productId: input.productId, unitPrice: input.unitPrice, quantity: input.quantity },
    });

    return sale;
  });
}

// Satış silinmez; satışın ledger kaydı için ters işaretli MATERIAL_RETURN
// yazılır. İade satışın tamamı içindir; kısmi iade yoktur.
export async function returnMaterialSale(saleId: string, input: ReversalInput): Promise<void> {
  const actor = await requirePermission("material.return");

  const target = await prisma.materialSale.findUnique({ where: { id: saleId }, select: { studentId: true } });
  if (!target) {
    throw new DomainError("Satış bulunamadı.");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await lockStudentForFinance(tx, target.studentId);

      const entry = await tx.financialTransaction.findFirst({
        where: { materialSaleId: saleId, type: "MATERIAL_SALE" },
        select: {
          id: true,
          type: true,
          category: true,
          amount: true,
          reversedTransactionId: true,
          reversalTransaction: { select: { id: true } },
        },
      });
      if (!entry) {
        throw new Error(`Satışın ledger kaydı yok: ${saleId}`);
      }
      if (entry.reversalTransaction !== null) {
        throw new DomainError("Bu satış zaten iade edilmiş.");
      }

      await createLedgerEntry(tx, {
        ...buildReversal(entry),
        studentId: target.studentId,
        description: `Malzeme iadesi: ${input.reason}`,
        materialSaleId: saleId,
        createdById: actor.id,
      });

      await logAudit(tx, {
        actorId: actor.id,
        action: "MATERIAL_RETURNED",
        targetStudentId: target.studentId,
        metadata: { saleId, reason: input.reason },
      });
    });
  } catch (error) {
    // reversedTransactionId @unique: eşzamanlı ikinci iade burada durur.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new DomainError("Bu satış zaten iade edilmiş.");
    }
    throw error;
  }
}
