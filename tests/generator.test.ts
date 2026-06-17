import { describe, expect, it } from "vitest";

import { canonicalFieldName } from "@/lib/canonical";
import { getLibrarySnapshot } from "@/lib/db";
import { generateSpecFromRules, selectFeaturePacks } from "@/lib/generator";
import type { GameIntake } from "@/lib/types";

const baseIntake: GameIntake = {
  gameTitle: "Test Game",
  genre: "Puzzle",
  coreLoop: "Start a level and complete objectives.",
  gameModes: "Journey",
  mechanics: "",
  winConditions: "Complete objectives",
  loseConditions: "No moves left",
  economy: "",
  itemsOrPowerups: "",
  powerupNames: "",
  iap: "",
  ads: "",
  rewardedAdPlacements: "",
  interstitialAdPlacements: "",
  liveOps: "",
  notes: "",
};

describe("analytics generator", () => {
  it("loads all expected library sections from the seed", () => {
    const snapshot = getLibrarySnapshot();
    expect(snapshot.events.length).toBeGreaterThanOrEqual(11);
    expect(snapshot.payloads.length).toBeGreaterThanOrEqual(200);
    expect(snapshot.generationPacks.map((pack) => pack.featurePack)).toContain("Platform Ad Payload Enrichment");
    expect(snapshot.governanceDecisions.length).toBeGreaterThanOrEqual(3);
  });

  it("maps canonical aliases", () => {
    expect(canonicalFieldName("type")).toBe("source");
    expect(canonicalFieldName("itemtype")).toBe("item");
    expect(canonicalFieldName("dollar_vallue")).toBe("dollar_value");
  });

  it("selects feature packs from mechanics", () => {
    const packs = selectFeaturePacks({
      ...baseIntake,
      mechanics: "timed match-3 with boosters and rewarded ads",
      economy: "coins and powerups",
      iap: "shop bundles",
      liveOps: "daily challenge season event",
      ads: "Rewarded Ads, Interstitial Ads",
      rewardedAdPlacements: "2x_rewards, powerup",
      interstitialAdPlacements: "game_end",
    });
    expect(packs).toContain("Core Gameplay Round");
    expect(packs).toContain("Economy Transactions");
    expect(packs).toContain("Store / IAP Funnel");
    expect(packs).toContain("Live Ops");
    expect(packs).toContain("Rewarded Ads / IAA Rewards");
    expect(packs).toContain("Platform Ad Payload Enrichment");
  });

  it("includes platform ad payload enrichment without manual ad event specs", () => {
    const spec = generateSpecFromRules(
      {
        ...baseIntake,
        mechanics: "boosters",
        economy: "coins",
        ads: "Rewarded Ads",
        rewardedAdPlacements: "2x_rewards, powerup",
        powerupNames: "shuffle",
      },
      getLibrarySnapshot(),
    );
    expect(spec.platformAdPayloads.length).toBeGreaterThan(0);
    expect(spec.platformAdPayloads.map((payload) => payload.canonicalPayloadName)).toContain("placement");
    expect(spec.generatedEvents.some((event) => event.eventName.startsWith("Ad_"))).toBe(false);
    expect(spec.platformAdPayloads.every((payload) => payload.adFamily === "Rewarded")).toBe(true);
    expect(spec.platformAdPayloads.find((payload) => payload.canonicalPayloadName === "placement")?.example).toBe(
      "2x_rewards, powerup, powerup_shuffle",
    );
  });

  it("excludes ad packs when the intake has no ads", () => {
    const spec = generateSpecFromRules(baseIntake, getLibrarySnapshot());
    expect(spec.selectedFeaturePacks).not.toContain("Platform Ad Payload Enrichment");
    expect(spec.selectedFeaturePacks).not.toContain("Rewarded Ads / IAA Rewards");
    expect(spec.platformAdPayloads).toHaveLength(0);
  });

  it("uses powerup names for Game_End payloads and transaction item examples", () => {
    const spec = generateSpecFromRules(
      {
        ...baseIntake,
        mechanics: "boosters and powerups",
        economy: "coins and item inventory",
        powerupNames: "shuffle, Magic Wand",
      },
      getLibrarySnapshot(),
    );

    const gameEnd = spec.generatedEvents.find((event) => event.eventName === "Game_End");
    expect(gameEnd?.payloadFields.map((payload) => payload.canonicalFieldName)).toContain("powerup_shuffle_used");
    expect(gameEnd?.payloadFields.map((payload) => payload.canonicalFieldName)).toContain("powerup_magic_wand_used");
    expect(gameEnd?.payloadFields.map((payload) => payload.canonicalFieldName)).not.toContain("powerup_{name}_used");

    const itemTransaction = spec.generatedEvents.find((event) => event.eventName === "Item_Transaction");
    expect(itemTransaction?.payloadFields.find((payload) => payload.canonicalFieldName === "item")?.example).toBe(
      '"powerup_shuffle", "powerup_magic_wand"',
    );
  });

  it("keeps game_length as a core Game_End payload", () => {
    const spec = generateSpecFromRules(baseIntake, getLibrarySnapshot());
    const gameEndPayloads = spec.generatedEvents
      .find((event) => event.eventName === "Game_End")
      ?.payloadFields.map((payload) => payload.canonicalFieldName);

    expect(gameEndPayloads).toContain("game_length");
    expect(gameEndPayloads).not.toContain("game_end_reason");
    expect(gameEndPayloads).not.toContain("time_limit");
    expect(gameEndPayloads).not.toContain("time_per_match");
  });

  it("does not include game-specific illegal region or worm target Game_End payloads", () => {
    const snapshot = getLibrarySnapshot();
    const spec = generateSpecFromRules(
      baseIntake,
      {
        ...snapshot,
        payloads: [
          ...snapshot.payloads,
          {
            eventName: "Game_End",
            featurePack: "Core Gameplay Round",
            category: "Core",
            fieldName: "illegal_regions",
            canonicalFieldName: "illegal_regions",
            fieldDescription: "Game-specific illegal region count.",
            example: "2",
            dataType: "Integer",
            requiredness: "Optional",
            note: "",
            sourceLabel: "Test",
            sourceGame: "Test",
          },
          {
            eventName: "Game_End",
            featurePack: "Core Gameplay Round",
            category: "Core",
            fieldName: "worms_target",
            canonicalFieldName: "worms_target",
            fieldDescription: "Game-specific worm target count.",
            example: "5",
            dataType: "Integer",
            requiredness: "Optional",
            note: "",
            sourceLabel: "Test",
            sourceGame: "Test",
          },
        ],
      },
    );
    const gameEndPayloads = spec.generatedEvents
      .find((event) => event.eventName === "Game_End")
      ?.payloadFields.map((payload) => payload.canonicalFieldName);

    expect(gameEndPayloads).not.toContain("illegal_regions");
    expect(gameEndPayloads).not.toContain("worms_target");
  });

  it("maps Limited time only to time_limit and Match objectives to time_per_match", () => {
    const timedSpec = generateSpecFromRules({ ...baseIntake, mechanics: "Limited time" }, getLibrarySnapshot());
    const timedPayloads = timedSpec.generatedEvents
      .find((event) => event.eventName === "Game_End")
      ?.payloadFields.map((payload) => payload.canonicalFieldName);

    expect(timedPayloads).toContain("game_length");
    expect(timedPayloads).toContain("time_limit");
    expect(timedPayloads).not.toContain("time_per_match");

    const objectiveSpec = generateSpecFromRules({ ...baseIntake, mechanics: "Match objectives" }, getLibrarySnapshot());
    const objectivePayloads = objectiveSpec.generatedEvents
      .find((event) => event.eventName === "Game_End")
      ?.payloadFields.map((payload) => payload.canonicalFieldName);

    expect(objectivePayloads).toContain("game_length");
    expect(objectivePayloads).toContain("time_per_match");
    expect(objectivePayloads).not.toContain("time_limit");
  });

  it("does not include game-specific revive and play-on reason payloads", () => {
    const spec = generateSpecFromRules({ ...baseIntake, mechanics: "Revive, Play-on" }, getLibrarySnapshot());
    const gameEndPayloads = spec.generatedEvents
      .find((event) => event.eventName === "Game_End")
      ?.payloadFields.map((payload) => payload.canonicalFieldName);

    expect(gameEndPayloads).toContain("revives_used");
    expect(gameEndPayloads).toContain("playons_used");
    expect(gameEndPayloads).not.toContain("revives_delivery_failed_used");
    expect(gameEndPayloads).not.toContain("revives_out_of_time_used");
    expect(gameEndPayloads).not.toContain("playon_delivery_failed_used");
    expect(gameEndPayloads).not.toContain("playon_out_of_time_used");
  });

  it("maps Currency and Item Inventory to separate transaction events", () => {
    const currencySpec = generateSpecFromRules({ ...baseIntake, economy: "Currency" }, getLibrarySnapshot());
    expect(currencySpec.generatedEvents.map((event) => event.eventName)).toContain("Currency_Transaction");
    expect(currencySpec.generatedEvents.map((event) => event.eventName)).not.toContain("Item_Transaction");

    const itemSpec = generateSpecFromRules({ ...baseIntake, economy: "Item inventory" }, getLibrarySnapshot());
    expect(itemSpec.generatedEvents.map((event) => event.eventName)).toContain("Item_Transaction");
    expect(itemSpec.generatedEvents.map((event) => event.eventName)).not.toContain("Currency_Transaction");
  });

  it("adds item examples for revive, play-on, and lives item transactions", () => {
    const spec = generateSpecFromRules(
      {
        ...baseIntake,
        mechanics: "Revive, Play-on",
        economy: "Lives / energy",
      },
      getLibrarySnapshot(),
    );
    const itemTransaction = spec.generatedEvents.find((event) => event.eventName === "Item_Transaction");
    expect(itemTransaction?.payloadFields.find((payload) => payload.canonicalFieldName === "item")?.example).toBe(
      '"revive", "playon", "lives"',
    );
  });

  it("uses selected interstitial placements for interstitial platform payloads", () => {
    const spec = generateSpecFromRules(
      {
        ...baseIntake,
        ads: "Interstitial Ads",
        interstitialAdPlacements: "game_end, session_resume, mid_game",
      },
      getLibrarySnapshot(),
    );

    expect(spec.platformAdPayloads.length).toBeGreaterThan(0);
    expect(spec.platformAdPayloads.every((payload) => payload.adFamily === "Interstitial")).toBe(true);
    expect(spec.platformAdPayloads.find((payload) => payload.canonicalPayloadName === "placement")?.example).toBe(
      "game_end, session_resume, mid_game",
    );
  });

  it("does not create platform payload rows for banner-only ads", () => {
    const spec = generateSpecFromRules({ ...baseIntake, ads: "Banner Ads" }, getLibrarySnapshot());
    expect(spec.selectedFeaturePacks).not.toContain("Platform Ad Payload Enrichment");
    expect(spec.platformAdPayloads).toHaveLength(0);
  });
});
