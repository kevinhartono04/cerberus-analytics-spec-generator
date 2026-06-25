import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseAnalyticsSpecFile } from "@/lib/import-spec";
import { generatedSpecSchema } from "@/lib/types";

function fixturePath(fileName: string) {
  return path.join(process.cwd(), "..", fileName);
}

describe("analytics spec import parser", () => {
  it("imports standard Sizzle Sort sheets and ignores non-standard IAA", () => {
    const spec = parseAnalyticsSpecFile({
      fileName: "Sizzle Sort - Analytics Spec.xlsx",
      buffer: fs.readFileSync(fixturePath("Sizzle Sort - Analytics Spec.xlsx")),
    });

    const payloadCount = spec.generatedEvents.reduce((total, event) => total + event.payloadFields.length, 0);
    const serialized = JSON.stringify(spec);

    expect(() => generatedSpecSchema.parse(spec)).not.toThrow();
    expect(spec.generatedEvents).toHaveLength(8);
    expect(payloadCount).toBe(84);
    expect(spec.platformAdPayloads).toHaveLength(0);
    expect(serialized).not.toContain("Athena Sizzle team note");
    expect(serialized).not.toContain("If player open shop and make purchase outside of gamescreen");
    expect(
      spec.generatedEvents
        .flatMap((event) => event.payloadFields)
        .map((payload) => payload.canonicalFieldName),
    ).toContain("dollar_value");
  });

  it("imports standard Word Chain IAA rows as platform ad payloads", () => {
    const spec = parseAnalyticsSpecFile({
      fileName: "Word Chain - Analytics Spec.xlsx",
      buffer: fs.readFileSync(fixturePath("Word Chain - Analytics Spec.xlsx")),
    });

    expect(() => generatedSpecSchema.parse(spec)).not.toThrow();
    expect(spec.platformAdPayloads).toHaveLength(6);
    expect(spec.platformAdPayloads.map((payload) => payload.adFamily)).toEqual([
      "Rewarded",
      "Rewarded",
      "Rewarded",
      "Interstitial",
      "Interstitial",
      "Interstitial",
    ]);
    expect(spec.platformAdPayloads.map((payload) => payload.platformEventName)).not.toContain("Ad_Close_Rewarded");
    expect(spec.platformAdPayloads.map((payload) => payload.platformEventName)).not.toContain("Ad_Close_Interstitial");
    expect(spec.selectedFeaturePacks).toContain("Platform Ad Payload Enrichment");
  });

  it("imports single-sheet standard CSV rows", () => {
    const csv = [
      "Event Name,Description,Argument Type,Argument Value,Arg Value Example,Payload Name,Payload Value,Payload Value Example",
      "Game_Start,Start a round,start_type,Round start type,\"new\",level,Current level,16",
      ",,,,,game_round_id,Round id,abc123",
    ].join("\n");
    const spec = parseAnalyticsSpecFile({ fileName: "CSV Game.csv", buffer: Buffer.from(csv) });

    expect(spec.intake.gameTitle).toBe("CSV Game");
    expect(spec.generatedEvents).toHaveLength(1);
    expect(spec.generatedEvents[0].payloadFields).toHaveLength(2);
    expect(spec.generatedEvents[0].payloadFields[0].type).toBe("Number");
  });

  it("uses provided game title and genre overrides", () => {
    const csv = [
      "Event Name,Description,Argument Type,Argument Value,Arg Value Example,Payload Name,Payload Value,Payload Value Example",
      "Game_Start,Start a round,start_type,Round start type,\"new\",level,Current level,16",
    ].join("\n");
    const spec = parseAnalyticsSpecFile({
      fileName: "CSV Game.csv",
      buffer: Buffer.from(csv),
      gameTitle: "Player Named Game",
      genre: "Word puzzle",
    });

    expect(spec.intake.gameTitle).toBe("Player Named Game");
    expect(spec.intake.genre).toBe("Word puzzle");

    const blankGenreSpec = parseAnalyticsSpecFile({
      fileName: "CSV Game.csv",
      buffer: Buffer.from(csv),
      gameTitle: "Player Named Game",
      genre: "",
    });
    expect(blankGenreSpec.intake.genre).toBe("");
  });

  it("imports single-sheet Word Chain-style IAA CSV rows", () => {
    const csv = [
      "Event Name,Description,Payload Name,Payload Value,Payload Value Example",
      "Ad_Call_Rewarded,Rewarded platform event,placement,Rewarded placement,\"powerup\"",
      "Ad_Close_Rewarded,,,,",
      "Ad_Call_Interstitial,Interstitial platform event,placement,Interstitial placement,\"game_end\"",
    ].join("\n");
    const spec = parseAnalyticsSpecFile({ fileName: "IAA.csv", buffer: Buffer.from(csv) });

    expect(spec.generatedEvents).toHaveLength(0);
    expect(spec.platformAdPayloads).toHaveLength(2);
    expect(spec.platformAdPayloads.map((payload) => payload.adFamily)).toEqual(["Rewarded", "Interstitial"]);
  });
});
