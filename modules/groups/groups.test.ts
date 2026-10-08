import { describe, expect, it } from "vitest";
import { compareGroups, formatGroupName, formatGroupSchedule } from "./format";
import { groupFormSchema } from "./schema";

const saturdayMorning = { dayOfWeek: 6, startTime: "10:00", endTime: "12:00", label: null };

describe("grup biçimlendirme", () => {
  it("ad yoksa gün ve saat aralığını kullanır", () => {
    expect(formatGroupName(saturdayMorning)).toBe("Cumartesi 10:00–12:00");
  });

  it("ad varsa onu kullanır, boşluktan ibaretse yok sayar", () => {
    expect(formatGroupName({ ...saturdayMorning, label: "Yetişkinler" })).toBe("Yetişkinler");
    expect(formatGroupName({ ...saturdayMorning, label: "  " })).toBe(formatGroupSchedule(saturdayMorning));
  });

  it("haftayı Pazartesiden başlatıp saate göre sıralar", () => {
    const sunday = { dayOfWeek: 0, startTime: "10:00", endTime: "12:00" };
    const monday = { dayOfWeek: 1, startTime: "18:00", endTime: "20:00" };
    const saturdayAfternoon = { dayOfWeek: 6, startTime: "13:00", endTime: "15:00" };
    const sorted = [sunday, saturdayAfternoon, saturdayMorning, monday].sort(compareGroups);
    expect(sorted).toEqual([monday, saturdayMorning, saturdayAfternoon, sunday]);
  });
});

describe("groupFormSchema", () => {
  const valid = { dayOfWeek: "6", startTime: "10:00", endTime: "12:00", label: "" };

  it("geçerli formu kabul eder, boş adı null yapar", () => {
    expect(groupFormSchema.parse(valid)).toEqual({ dayOfWeek: 6, startTime: "10:00", endTime: "12:00", label: null });
  });

  it("bitiş başlangıçtan sonra değilse reddeder", () => {
    expect(groupFormSchema.safeParse({ ...valid, endTime: "10:00" }).success).toBe(false);
    expect(groupFormSchema.safeParse({ ...valid, endTime: "09:00" }).success).toBe(false);
  });

  it.each(["9:00", "24:00", "10:60", "on"])("%s saatini reddeder", (startTime) => {
    expect(groupFormSchema.safeParse({ ...valid, startTime }).success).toBe(false);
  });

  it.each(["7", "-1", "", "1.5"])("%s gününü reddeder", (dayOfWeek) => {
    expect(groupFormSchema.safeParse({ ...valid, dayOfWeek }).success).toBe(false);
  });
});
