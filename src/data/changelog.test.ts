import { describe, expect, it } from "vitest";
import { RELEASES, unseenReleases, type Release } from "@/data/changelog";

const releases: Release[] = ["v4", "v3", "v2", "v1", "v0"].map((id) => ({
  id,
  date: "2026-10-27",
  notes: [],
}));

describe("unseenReleases", () => {
  it("annonce les versions parues depuis la dernière vue", () => {
    expect(unseenReleases(releases, "v2", true).map((release) => release.id)).toEqual([
      "v4",
      "v3",
    ]);
  });

  it("ne répète pas une version déjà vue", () => {
    expect(unseenReleases(releases, "v4", true)).toEqual([]);
  });

  it("épargne les nouveautés à un nouvel utilisateur", () => {
    expect(unseenReleases(releases, null, false)).toEqual([]);
  });

  it("montre la dernière version à un utilisateur qui avait déjà l'app", () => {
    expect(unseenReleases(releases, null, true).map((release) => release.id)).toEqual(["v4"]);
  });

  it("résume une longue absence aux versions les plus récentes", () => {
    expect(unseenReleases(releases, "v0", true)).toHaveLength(3);
  });

  it("retombe sur la dernière version quand le repère est inconnu", () => {
    expect(unseenReleases(releases, "retirée", true).map((release) => release.id)).toEqual([
      "v4",
    ]);
  });
});

describe("RELEASES", () => {
  it("garde chaque annonce courte et identifiable", () => {
    const ids = RELEASES.map((release) => release.id);
    expect(new Set(ids).size).toBe(ids.length);

    for (const release of RELEASES) {
      expect(release.notes.length, release.id).toBeGreaterThan(0);
      expect(release.notes.length, release.id).toBeLessThanOrEqual(4);
    }
  });
});
