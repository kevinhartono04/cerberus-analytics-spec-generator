import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import fs from "node:fs";
import path from "node:path";

import { appMeta, libraryRecords } from "@/lib/schema";
import type {
  GeneratedSpec,
  GenerationPack,
  LibraryData,
  LibraryEvent,
  LibraryPayload,
  LibrarySnapshot,
  PlatformAdPayload,
  SavedSpecSummary,
} from "@/lib/types";
import { generatedSpecSchema } from "@/lib/types";

const rootDir = path.resolve(process.cwd(), "..");
const seedPath = path.join(rootDir, "outputs", "analytics_library", "analytics_reference_library.json");
const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "analytics.sqlite");

let cachedSnapshot: LibrarySnapshot | null = null;

function asString(value: unknown) {
  return value == null ? "" : String(value);
}

function ensureDb() {
  fs.mkdirSync(dataDir, { recursive: true });
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  const db = drizzle(sqlite);

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS library_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      section TEXT NOT NULL,
      record_key TEXT NOT NULL,
      payload TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS saved_specs (
      id TEXT PRIMARY KEY NOT NULL,
      game_title TEXT NOT NULL,
      genre TEXT NOT NULL,
      status TEXT NOT NULL,
      event_count INTEGER NOT NULL,
      payload_count INTEGER NOT NULL,
      generated_at TEXT NOT NULL,
      saved_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      payload TEXT NOT NULL
    );
  `);

  const seedStat = fs.statSync(seedPath);
  const seedVersion = `${seedStat.mtimeMs}:${seedStat.size}`;
  const current = db.select().from(appMeta).where(eq(appMeta.key, "seed_version")).get();

  if (current?.value !== seedVersion) {
    const raw = JSON.parse(fs.readFileSync(seedPath, "utf8")) as LibraryData;
    sqlite.exec("DELETE FROM library_records;");
    const insert = sqlite.prepare("INSERT INTO library_records (section, record_key, payload) VALUES (?, ?, ?)");
    const transaction = sqlite.transaction(() => {
      for (const [section, rows] of Object.entries(raw)) {
        if (!Array.isArray(rows)) continue;
        rows.forEach((row, index) => {
          const key =
            asString(row.event_name) ||
            asString(row.feature_pack) ||
            asString(row.canonical_field_name) ||
            asString(row.platform_event_name) ||
            `${section}-${index}`;
          insert.run(section, key, JSON.stringify(row));
        });
      }
      sqlite
        .prepare("INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)")
        .run("seed_version", seedVersion);
    });
    transaction();
    cachedSnapshot = null;
  }

  return { db, sqlite };
}

function getSection(section: string) {
  const { db } = ensureDb();
  return db
    .select()
    .from(libraryRecords)
    .where(eq(libraryRecords.section, section))
    .all()
    .map((row) => JSON.parse(row.payload) as Record<string, unknown>);
}

export function getLibrarySnapshot(): LibrarySnapshot {
  if (cachedSnapshot) return cachedSnapshot;

  const events = getSection("event_catalog").map(
    (row): LibraryEvent => ({
      eventName: asString(row.event_name),
      featurePack: asString(row.feature_pack),
      category: asString(row.category),
      standardStatus: asString(row.standard_status),
      triggerDescription: asString(row.trigger_description),
      argumentType: asString(row.argument_type),
      argumentDescription: asString(row.argument_description),
      argumentExamples: asString(row.argument_examples),
      sourceCoverage: asString(row.source_coverage),
      canonicalPayloadFields: asString(row.canonical_payload_fields),
      generatorGuidance: asString(row.generator_guidance),
    }),
  );

  const payloads = getSection("payload_fields").map(
    (row): LibraryPayload => ({
      eventName: asString(row.event_name),
      featurePack: asString(row.feature_pack),
      category: asString(row.category),
      fieldName: asString(row.field_name),
      canonicalFieldName: asString(row.canonical_field_name),
      fieldDescription: asString(row.field_description),
      example: asString(row.example),
      dataType: asString(row.data_type),
      requiredness: asString(row.requiredness),
      note: asString(row.note),
      sourceLabel: asString(row.source_label),
      sourceGame: asString(row.source_game),
    }),
  );

  const generationPacks = getSection("generation_packs").map(
    (row): GenerationPack => ({
      featurePack: asString(row.feature_pack),
      applicableWhen: asString(row.applicable_when),
      recommendedEventsOrPlatformEvents: asString(row.recommended_events_or_platform_events),
      launchPriority: asString(row.launch_priority),
      notes: asString(row.notes),
    }),
  );

  const platformAdPayloads = getSection("platform_ad_payloads").map(
    (row): PlatformAdPayload => ({
      platformEventName: asString(row.platform_event_name),
      adFamily: asString(row.ad_family),
      description: asString(row.description),
      fieldName: asString(row.field_name),
      canonicalFieldName: asString(row.canonical_field_name),
      fieldDescription: asString(row.field_description),
      example: asString(row.example),
      dataType: asString(row.data_type),
      requiredness: asString(row.requiredness),
      featurePack: asString(row.feature_pack),
      sourceLabel: asString(row.source_label),
      sourceGame: asString(row.source_game),
    }),
  );

  cachedSnapshot = {
    events,
    payloads,
    generationPacks,
    governanceDecisions: getSection("governance_decisions") as Array<Record<string, string>>,
    platformAdPayloads,
    scenarios: getSection("scenario_library") as Array<Record<string, string>>,
  };
  return cachedSnapshot;
}

function specStatus(spec: GeneratedSpec) {
  if (!spec.generatedEvents.length) return "Draft";
  if (spec.generatedEvents.some((event) => event.status === "Needs changes")) return "Needs changes";
  if (spec.generatedEvents.every((event) => event.status === "Reviewed")) return "Reviewed";
  return "Draft";
}

function specPayloadCount(spec: GeneratedSpec) {
  return spec.generatedEvents.reduce((total, event) => total + event.payloadFields.length, 0) + spec.platformAdPayloads.length;
}

function rowToSavedSpecSummary(row: Record<string, unknown>): SavedSpecSummary {
  return {
    id: asString(row.id),
    gameTitle: asString(row.game_title),
    genre: asString(row.genre),
    status: asString(row.status),
    eventCount: Number(row.event_count ?? 0),
    payloadCount: Number(row.payload_count ?? 0),
    generatedAt: asString(row.generated_at),
    savedAt: asString(row.saved_at),
    updatedAt: asString(row.updated_at),
  };
}

export function listSavedSpecs(): SavedSpecSummary[] {
  const { sqlite } = ensureDb();
  return sqlite
    .prepare(
      `
      SELECT id, game_title, genre, status, event_count, payload_count, generated_at, saved_at, updated_at
      FROM saved_specs
      ORDER BY updated_at DESC
    `,
    )
    .all()
    .map((row) => rowToSavedSpecSummary(row as Record<string, unknown>));
}

export function getSavedSpec(id: string): GeneratedSpec | null {
  const { sqlite } = ensureDb();
  const row = sqlite.prepare("SELECT payload FROM saved_specs WHERE id = ?").get(id) as { payload: string } | undefined;
  if (!row) return null;
  return generatedSpecSchema.parse(JSON.parse(row.payload));
}

export function saveSpec(specInput: unknown): SavedSpecSummary {
  const { sqlite } = ensureDb();
  const spec = generatedSpecSchema.parse(specInput);
  const existing = sqlite.prepare("SELECT saved_at FROM saved_specs WHERE id = ?").get(spec.id) as
    | { saved_at: string }
    | undefined;
  const now = new Date().toISOString();
  const savedAt = existing?.saved_at ?? now;
  const status = specStatus(spec);
  const eventCount = spec.generatedEvents.length;
  const payloadCount = specPayloadCount(spec);

  sqlite
    .prepare(
      `
      INSERT INTO saved_specs (
        id, game_title, genre, status, event_count, payload_count, generated_at, saved_at, updated_at, payload
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        game_title = excluded.game_title,
        genre = excluded.genre,
        status = excluded.status,
        event_count = excluded.event_count,
        payload_count = excluded.payload_count,
        generated_at = excluded.generated_at,
        updated_at = excluded.updated_at,
        payload = excluded.payload
    `,
    )
    .run(
      spec.id,
      spec.intake.gameTitle,
      spec.intake.genre,
      status,
      eventCount,
      payloadCount,
      spec.generatedAt,
      savedAt,
      now,
      JSON.stringify(spec),
    );

  return {
    id: spec.id,
    gameTitle: spec.intake.gameTitle,
    genre: spec.intake.genre,
    status,
    eventCount,
    payloadCount,
    generatedAt: spec.generatedAt,
    savedAt,
    updatedAt: now,
  };
}

export function deleteSavedSpec(id: string) {
  const { sqlite } = ensureDb();
  const result = sqlite.prepare("DELETE FROM saved_specs WHERE id = ?").run(id);
  return result.changes > 0;
}
