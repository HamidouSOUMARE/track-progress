import { describe, expect, it } from "vitest";
import { resolveSelectedDay, todayStamp, todayWeekday } from "@/data/weekdays";

describe("todayWeekday", () => {
  it("fait commencer la semaine le lundi", () => {
    expect(todayWeekday(new Date("2026-08-17T10:00:00"))).toBe("lundi");
    expect(todayWeekday(new Date("2026-08-22T10:00:00"))).toBe("samedi");
    expect(todayWeekday(new Date("2026-08-23T10:00:00"))).toBe("dimanche");
  });
});

describe("resolveSelectedDay", () => {
  const now = new Date("2026-08-23T10:00:00");

  it("reprend le jour consulté après un rafraîchissement", () => {
    expect(resolveSelectedDay({ day: "jeudi", date: todayStamp(now) }, now)).toBe("jeudi");
  });

  it("repart du jour courant quand la sélection date de la veille", () => {
    expect(resolveSelectedDay({ day: "jeudi", date: "2026-8-22" }, now)).toBe("dimanche");
  });

  it("repart du jour courant sans sélection mémorisée", () => {
    expect(resolveSelectedDay(null, now)).toBe("dimanche");
  });
});
