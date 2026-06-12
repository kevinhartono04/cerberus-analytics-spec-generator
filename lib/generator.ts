import { canonicalFieldName, containsAny } from "@/lib/canonical";
import type { GameIntake, GeneratedEvent, GeneratedSpec, LibrarySnapshot } from "@/lib/types";

const PACKS = {
  core: "Core Gameplay Round",
  economy: "Economy Transactions",
  iap: "Store / IAP Funnel",
  liveOps: "Live Ops",
  rewarded: "Rewarded Ads / IAA Rewards",
  platformAds: "Platform Ad Payload Enrichment",
};

export function selectFeaturePacks(intake: GameIntake) {
  const text = [
    intake.genre,
    intake.coreLoop,
    intake.gameModes,
    intake.mechanics,
    intake.winConditions,
    intake.loseConditions,
      intake.economy,
    intake.itemsOrPowerups,
    intake.powerupNames,
    intake.iap,
    intake.ads,
    intake.rewardedAdPlacements,
    intake.interstitialAdPlacements,
    intake.liveOps,
    intake.notes,
  ].join(" ");

  const packs = new Set<string>([PACKS.core]);

  if (
    containsAny(text, [
      "currency",
      "coin",
      "coins",
      "economy",
      "booster",
      "powerup",
      "power-up",
      "item",
      "inventory",
      "life",
      "lives",
      "purchase",
      "spend",
      "earn",
    ])
  ) {
    packs.add(PACKS.economy);
  }

  if (containsAny(text, ["iap", "store", "shop", "bundle", "product", "ad remove", "no ads", "paid"])) {
    packs.add(PACKS.iap);
  }

  if (containsAny(text, ["live ops", "liveops", "event", "season", "mission", "daily challenge", "leaderboard"])) {
    packs.add(PACKS.liveOps);
  }

  const selectedAds = new Set(splitValues(intake.ads));

  if (selectedAds.has("Rewarded Ads") || containsAny(text, ["rewarded", "reward video", "rv", "ad_reward", "2x_reward", "daily_reward"])) {
    packs.add(PACKS.rewarded);
  }

  if (selectedAds.has("Rewarded Ads") || selectedAds.has("Interstitial Ads")) {
    packs.add(PACKS.platformAds);
  }

  if (!selectedAds.has("Rewarded Ads") && !selectedAds.has("Interstitial Ads") && !containsAny(text, ["ad", "ads", "interstitial", "rewarded", "rv"])) {
    packs.delete(PACKS.platformAds);
    packs.delete(PACKS.rewarded);
  }

  return [...packs];
}

function splitValues(value: string) {
  return value
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function powerupSlugs(intake: GameIntake) {
  return splitValues(intake.powerupNames)
    .map(slugify)
    .filter(Boolean);
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function powerupItemExamples(intake: GameIntake) {
  return powerupSlugs(intake)
    .map((name) => `"powerup_${name}"`)
    .join(", ");
}

function adFamiliesForIntake(intake: GameIntake) {
  const selectedAds = new Set(splitValues(intake.ads));
  const families = new Set<string>();
  if (selectedAds.has("Rewarded Ads")) families.add("Rewarded");
  if (selectedAds.has("Interstitial Ads")) families.add("Interstitial");
  return families;
}

function placementExampleFor(intake: GameIntake, adFamily: string) {
  const placements =
    adFamily === "Rewarded"
      ? splitValues(intake.rewardedAdPlacements)
      : adFamily === "Interstitial"
        ? splitValues(intake.interstitialAdPlacements)
        : [];
  const values = placements.flatMap((placement) => {
    if (adFamily === "Rewarded" && placement === "powerup") {
      return ["powerup", ...powerupSlugs(intake).map((name) => `powerup_${name}`)];
    }
    return [placement];
  });
  return [...new Set(values)].join(", ");
}

function payloadsForEvent(snapshot: LibrarySnapshot, eventName: string, intake: GameIntake) {
  const seen = new Set<string>();
  const slugs = powerupSlugs(intake);
  const itemExamples = powerupItemExamples(intake);
  const payloads = snapshot.payloads
    .filter((payload) => payload.eventName === eventName)
    .filter((payload) => {
      if (!slugs.length) return true;
      const field = canonicalFieldName(payload.canonicalFieldName || payload.fieldName);
      if (field === "powerup_used") return true;
      return !/^powerup_.+_used$/.test(field);
    })
    .filter((payload) => {
      const key = canonicalFieldName(payload.canonicalFieldName || payload.fieldName);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((payload) => ({
      fieldName: payload.fieldName,
      canonicalFieldName: canonicalFieldName(payload.canonicalFieldName || payload.fieldName),
      type: payload.dataType,
      requiredness: payload.requiredness,
      description: payload.fieldDescription,
      example:
        itemExamples && payload.eventName.includes("Transaction") && canonicalFieldName(payload.canonicalFieldName || payload.fieldName) === "item"
          ? itemExamples
          : payload.example,
      notes:
        itemExamples && payload.eventName.includes("Transaction") && canonicalFieldName(payload.canonicalFieldName || payload.fieldName) === "item"
          ? [payload.note, "Example generated from Powerup Names intake."].filter(Boolean).join(" ")
          : payload.note,
    }));

  if (eventName === "Game_End") {
    for (const name of slugs) {
      const fieldName = `powerup_${name}_used`;
      if (seen.has(fieldName)) continue;
      seen.add(fieldName);
      payloads.push({
        fieldName,
        canonicalFieldName: fieldName,
        type: "Integer",
        requiredness: "Required/default (generated)",
        description: `<the number of ${name.replaceAll("_", " ")} power ups used in the game round>`,
        example: "2",
        notes: "Generated from Powerup Names intake.",
      });
    }
  }

  return payloads;
}

function triggerFor(intake: GameIntake, eventName: string, fallback: string) {
  const title = intake.gameTitle || "the game";
  if (eventName === "Game_Start") {
    return `Fire when a player starts or resumes a playable round/session in ${title}.`;
  }
  if (eventName === "Game_End") {
    const lose = intake.loseConditions ? ` Lose conditions include: ${intake.loseConditions}.` : "";
    const win = intake.winConditions ? ` Win conditions include: ${intake.winConditions}.` : "";
    return `Fire when a playable round/session in ${title} ends.${win}${lose}`;
  }
  return fallback;
}

function reasonFor(eventName: string, pack: string, intake: GameIntake) {
  if (pack === PACKS.platformAds) {
    return "Ads are present, so platform ad events need consistent additional payloads; no manual ad lifecycle event specs are generated.";
  }
  if (eventName.includes("Transaction")) {
    return "The intake mentions economy, items, purchases, rewards, or ads, so transaction events are needed to track earn/spend outcomes.";
  }
  if (eventName.startsWith("Store")) {
    return "The intake mentions IAP/store behavior, so the store purchase funnel should be tracked.";
  }
  if (eventName.startsWith("Event_")) {
    return "The intake mentions live ops or events, so limited-time event lifecycle tracking is included.";
  }
  return `${intake.gameTitle || "This game"} has discrete gameplay rounds or attempts, so core gameplay start/end tracking is included.`;
}

export function generateSpecFromRules(intake: GameIntake, snapshot: LibrarySnapshot): GeneratedSpec {
  const selectedFeaturePacks = selectFeaturePacks(intake);
  const eventRows = snapshot.events.filter((event) => selectedFeaturePacks.includes(event.featurePack));
  const generatedEvents: GeneratedEvent[] = eventRows.map((event) => ({
    eventName: event.eventName,
    category: event.category,
    featurePack: event.featurePack,
    trigger: triggerFor(intake, event.eventName, event.triggerDescription),
    argumentName: event.argumentType,
    argumentDescription: event.argumentDescription,
    argumentExamples: event.argumentExamples,
    payloadFields: payloadsForEvent(snapshot, event.eventName, intake),
    sourceReferences: event.sourceCoverage.split(",").map((item) => item.trim()).filter(Boolean),
    generationReason: reasonFor(event.eventName, event.featurePack, intake),
    status: "Draft",
  }));

  const platformAdPayloads = selectedFeaturePacks.includes(PACKS.platformAds)
    ? snapshot.platformAdPayloads
        .filter((payload) => adFamiliesForIntake(intake).has(payload.adFamily))
        .map((payload) => {
          const canonical = canonicalFieldName(payload.canonicalFieldName || payload.fieldName);
          return {
            platformEventName: payload.platformEventName,
            adFamily: payload.adFamily,
            payloadName: payload.fieldName,
            canonicalPayloadName: canonical,
            description: payload.fieldDescription,
            example: canonical === "placement" ? placementExampleFor(intake, payload.adFamily) : payload.example,
            requiredness: payload.requiredness,
          };
        })
    : [];

  const assumptions = [
    "Generated specs are drafts and should be reviewed by analytics, design, and engineering before implementation.",
    "Canonical field names are used for new specs: source, item, and dollar_value.",
  ];

  if (selectedFeaturePacks.includes(PACKS.platformAds)) {
    assumptions.push("Ad lifecycle events are platform-triggered; this spec only requires additional payload enrichment.");
  }

  return {
    id: `${Date.now()}`,
    generatedAt: new Date().toISOString(),
    intake,
    selectedFeaturePacks,
    generatedEvents,
    platformAdPayloads,
    assumptions,
  };
}

export async function enhanceSpecWithAi(spec: GeneratedSpec) {
  if (!process.env.OPENAI_API_KEY) {
    return { spec, aiUsed: false };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      input: [
        {
          role: "system",
          content:
            "You refine draft game analytics specs. Return only valid JSON matching the input object. Do not rename events or canonical payload fields.",
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Improve trigger wording and generationReason fields. Keep schema and event/payload names unchanged.",
            spec,
          }),
        },
      ],
      text: { format: { type: "json_object" } },
    }),
  });

  if (!response.ok) {
    return { spec, aiUsed: false, aiError: await response.text() };
  }

  const data = await response.json();
  const text = data.output_text ?? data.output?.[0]?.content?.[0]?.text;
  if (!text) return { spec, aiUsed: false };

  try {
    return { spec: JSON.parse(text) as GeneratedSpec, aiUsed: true };
  } catch {
    return { spec, aiUsed: false };
  }
}
