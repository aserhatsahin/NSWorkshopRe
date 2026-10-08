import { z } from "zod";

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Saat 09:30 biçiminde olmalı.");

export const groupFormSchema = z
  .object({
    // z.coerce.number() boş metni 0'a (Pazar) çevirir; gün seçilmeden
    // gönderilen form sessizce Pazar olmasın diye metin olarak doğrulanır.
    dayOfWeek: z
      .string("Gün seç.")
      .regex(/^[0-6]$/, "Gün seç.")
      .transform((value) => Number(value)),
    startTime: time,
    endTime: time,
    label: z.preprocess(
      (value) => (typeof value === "string" && value.trim() === "" ? null : value),
      z.string().trim().max(60, "Ad en fazla 60 karakter olabilir.").nullable(),
    ),
  })
  // "HH:MM" sabit genişlikte olduğu için metin karşılaştırması saat sırasını verir.
  .refine((group) => group.endTime > group.startTime, {
    path: ["endTime"],
    message: "Bitiş saati başlangıçtan sonra olmalı.",
  });

export type GroupFormInput = z.infer<typeof groupFormSchema>;
