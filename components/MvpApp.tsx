"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { BookOpen, FileText, Library, Play, Plus, Save, Search, Sparkles, Trash2, Wand2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { UseFormReturn, useForm } from "react-hook-form";

import { splitTextList } from "@/lib/canonical";
import {
  GeneratedEvent,
  GeneratedPayloadField,
  GeneratedSpec,
  GameIntake,
  intakeSchema,
  LibrarySnapshot,
  SavedSpecSummary,
} from "@/lib/types";

type Tab = "intake" | "review" | "specs" | "library";

const exampleIntake: GameIntake = {
  gameTitle: "Sample Match Timed",
  genre: "Match-3 timed puzzle",
  coreLoop: "Level start, Player action loop, Level end, Retry / continue flow",
  gameModes: "Journey, Daily Challenge",
  mechanics: "Limited time, Match objectives, Boosters / powerups, Possible matches, Revive, Play-on",
  winConditions: "Complete all level objectives before time expires",
  loseConditions: "Out of time, delivery failed",
  economy: "Soft currency, Item inventory, Earn/spend transactions, Level win rewards, Ad rewards",
  itemsOrPowerups: "shuffle, takeaway, hourglass, toolkit",
  powerupNames: "shuffle, takeaway, hourglass, toolkit",
  iap: "Shop / store, Coin packs, Booster bundles, Remove ads",
  ads: "Rewarded Ads, Interstitial Ads",
  rewardedAdPlacements: "2x_rewards, daily_reward, ad_reward, powerup",
  interstitialAdPlacements: "game_end, session_resume, mid_game",
  liveOps: "Daily challenge, Season event",
  notes: "Include platform ad payload enrichment but do not create manual ad lifecycle specs.",
};

const intakeOptionGroups: Array<{
  name: keyof Pick<GameIntake, "coreLoop" | "mechanics" | "economy" | "iap" | "ads" | "liveOps">;
  label: string;
  helper: string;
  options: string[];
}> = [
  {
    name: "coreLoop",
    label: "Core Loop",
    helper: "Pick the repeated gameplay steps.",
    options: [
      "Level start",
      "Player action loop",
      "Level end",
      "Retry / continue flow",
      "Session-based round",
      "Tutorial flow",
      "Progression map",
    ],
  },
  {
    name: "mechanics",
    label: "Mechanics",
    helper: "Pick the main gameplay systems.",
    options: [
      "Limited moves",
      "Limited time",
      "Match objectives",
      "Boosters / powerups",
      "Possible matches",
      "Revive",
      "Play-on",
      "Extra slot / extra grill",
      "Skip objective",
      "Difficulty tiers",
      "Collection objective",
    ],
  },
  {
    name: "economy",
    label: "Economy",
    helper: "Pick currencies, rewards, and inventory systems.",
    options: [
      "Soft currency",
      "Hard currency",
      "Item inventory",
      "Earn/spend transactions",
      "Level win rewards",
      "Ad rewards",
      "Daily rewards",
      "Collection rewards",
      "Lives / energy",
    ],
  },
  {
    name: "iap",
    label: "IAP",
    helper: "Pick paid purchase surfaces.",
    options: [
      "Shop / store",
      "Coin packs",
      "Booster bundles",
      "Starter pack",
      "Remove ads",
      "Limited-time offer",
      "Season pass",
    ],
  },
  {
    name: "ads",
    label: "Ads",
    helper: "Pick ad formats used by the game.",
    options: ["Rewarded Ads", "Interstitial Ads", "Banner Ads"],
  },
  {
    name: "liveOps",
    label: "Live Ops",
    helper: "Pick limited-time or recurring event systems.",
    options: [
      "Daily challenge",
      "Season event",
      "Leaderboard event",
      "Mission milestones",
      "Treasure quest",
      "Battle pass",
      "Event progress",
      "Event completion",
    ],
  },
];

const rewardedAdPlacementOptions = ["2x_rewards", "daily_reward", "ad_reward", "powerup"];
const interstitialAdPlacementOptions = ["game_end", "session_resume", "mid_game"];

function Field({
  label,
  name,
  register,
  placeholder,
}: {
  label: string;
  name: keyof GameIntake;
  register: ReturnType<typeof useForm<GameIntake>>["register"];
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      <textarea
        {...register(name)}
        placeholder={placeholder}
        className="focus-ring min-h-24 w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm shadow-sm"
      />
    </label>
  );
}

function TextInput({
  label,
  name,
  register,
  placeholder,
  help,
}: {
  label: string;
  name: keyof GameIntake;
  register: ReturnType<typeof useForm<GameIntake>>["register"];
  placeholder?: string;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-ink">{label}</span>
      <input
        {...register(name)}
        placeholder={placeholder}
        className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3 text-sm shadow-sm"
      />
      {help ? <span className="mt-2 block text-xs text-slate-500">{help}</span> : null}
    </label>
  );
}

function CheckboxDropdown({
  form,
  name,
  label,
  helper,
  options,
  allowCustom = true,
}: {
  form: UseFormReturn<GameIntake>;
  name: keyof GameIntake;
  label: string;
  helper: string;
  options: string[];
  allowCustom?: boolean;
}) {
  const value = form.watch(name) ?? "";
  const selected = splitTextList(value);
  const selectedSet = new Set(selected);

  function toggle(option: string) {
    const next = selectedSet.has(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    form.setValue(name, next.join(", "), { shouldDirty: true, shouldValidate: true });
  }

  return (
    <details className="rounded-md border border-line bg-white shadow-sm open:shadow-md">
      <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-md px-4 py-3">
        <span>
          <span className="block text-sm font-semibold text-ink">{label}</span>
          <span className="mt-1 block text-xs text-slate-500">
            {selected.length ? `${selected.length} selected` : helper}
          </span>
        </span>
        <span className="rounded bg-mist px-2 py-1 text-xs font-semibold text-slate-600">Choose</span>
      </summary>
      <div className="border-t border-line p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          {options.map((option) => (
            <label
              key={option}
              className="flex items-start gap-2 rounded-md border border-line bg-mist px-3 py-2 text-sm hover:bg-slate-50"
            >
              <input
                type="checkbox"
                checked={selectedSet.has(option)}
                onChange={() => toggle(option)}
                className="mt-0.5 h-4 w-4 rounded border-line text-cobalt"
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {allowCustom ? (
          <label className="mt-3 block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Selected / custom entries
            </span>
            <textarea
              {...form.register(name)}
              className="focus-ring min-h-20 w-full resize-y rounded-md border border-line bg-white px-3 py-2 text-sm"
              placeholder="Selections appear here. Add custom items separated by commas."
            />
          </label>
        ) : null}
      </div>
    </details>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border border-line bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-bold text-ink">{value}</div>
    </div>
  );
}

function payloadFieldFromName(name: string): GeneratedPayloadField {
  return {
    fieldName: name,
    canonicalFieldName: name,
    type: "string",
    requiredness: "Recommended",
    description: "Custom payload field added during spec review.",
    example: "",
    notes: "Review data type, requiredness, and example before implementation.",
  };
}

function newCustomEvent(index: number): GeneratedEvent {
  return {
    eventName: `Custom_Event_${index}`,
    category: "Custom",
    featurePack: "Custom Review Additions",
    trigger: "",
    argumentName: "",
    argumentDescription: "",
    argumentExamples: "",
    payloadFields: [],
    sourceReferences: ["Manual reviewer addition"],
    generationReason: "Added manually during spec review.",
    status: "Draft",
  };
}

function reviewStatusForEvents(events: GeneratedEvent[]) {
  if (!events.length) return "Draft";
  if (events.some((event) => event.status === "Needs changes")) return "Needs changes";
  if (events.every((event) => event.status === "Reviewed")) return "Reviewed";
  return "Draft";
}

function PayloadDetailsEditor({
  eventName,
  payloadFields,
  onChange,
  onDelete,
  onAdd,
}: {
  eventName: string;
  payloadFields: GeneratedPayloadField[];
  onChange: (payloadIndex: number, patch: Partial<GeneratedPayloadField>) => void;
  onDelete: (payloadIndex: number) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-3">
      {payloadFields.map((payload, payloadIndex) => (
        <div key={`${payload.canonicalFieldName}-${payloadIndex}`} className="rounded-md border border-line bg-mist p-3">
          <div className="grid gap-3 lg:grid-cols-[180px_1fr_180px_auto]">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Payload</span>
              <input
                aria-label={`${eventName} payload name ${payloadIndex + 1}`}
                value={payload.canonicalFieldName}
                onChange={(event) =>
                  onChange(payloadIndex, {
                    fieldName: event.target.value,
                    canonicalFieldName: event.target.value,
                  })
                }
                className="focus-ring h-9 w-full rounded-md border border-line bg-white px-2 text-sm font-semibold"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Description</span>
              <textarea
                aria-label={`${eventName} ${payload.canonicalFieldName} description`}
                value={payload.description}
                onChange={(event) => onChange(payloadIndex, { description: event.target.value })}
                className="focus-ring min-h-20 w-full rounded-md border border-line bg-white px-2 py-1 text-sm"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Example</span>
              <textarea
                aria-label={`${eventName} ${payload.canonicalFieldName} example`}
                value={payload.example}
                onChange={(event) => onChange(payloadIndex, { example: event.target.value })}
                className="focus-ring min-h-20 w-full rounded-md border border-line bg-white px-2 py-1 text-sm"
              />
            </label>
            <button
              type="button"
              onClick={() => onDelete(payloadIndex)}
              className="focus-ring mt-5 inline-flex h-9 items-center justify-center gap-1 rounded-md border border-line bg-white px-2 text-xs font-semibold hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={onAdd}
        className="focus-ring inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold hover:bg-slate-50"
      >
        <Plus className="h-3.5 w-3.5" />
        Add Payload
      </button>
    </div>
  );
}

function TabButton({
  tab,
  activeTab,
  setActiveTab,
  children,
}: {
  tab: Tab;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => setActiveTab(tab)}
      className={`focus-ring rounded-md px-4 py-2 text-sm font-semibold ${
        activeTab === tab ? "bg-cobalt text-white" : "bg-white text-ink hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function LibraryBrowser({ library }: { library: LibrarySnapshot }) {
  const [query, setQuery] = useState("");
  const lower = query.toLowerCase();
  const events = library.events.filter((event) =>
    [event.eventName, event.featurePack, event.category, event.generatorGuidance].join(" ").toLowerCase().includes(lower),
  );

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Metric label="Events" value={library.events.length} />
        <Metric label="Payload Rows" value={library.payloads.length} />
        <Metric label="Feature Packs" value={library.generationPacks.length} />
        <Metric label="Ad Payload Rows" value={library.platformAdPayloads.length} />
      </div>

      <div className="flex items-center gap-3 rounded-md border border-line bg-white px-3 py-2 shadow-sm">
        <Search className="h-4 w-4 text-slate-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search events, packs, categories..."
          className="focus-ring w-full border-0 bg-transparent text-sm outline-none"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-md border border-line bg-white shadow-sm">
          <div className="border-b border-line px-4 py-3 font-semibold">Generation Packs</div>
          <div className="divide-y divide-line">
            {library.generationPacks.map((pack) => (
              <div key={pack.featurePack} className="p-4">
                <div className="font-semibold text-ink">{pack.featurePack}</div>
                <p className="mt-1 text-sm text-slate-600">{pack.applicableWhen}</p>
                <p className="mt-2 text-xs font-semibold text-slate-500">{pack.launchPriority}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-line bg-white shadow-sm">
          <div className="border-b border-line px-4 py-3 font-semibold">Governance Decisions</div>
          <div className="divide-y divide-line">
            {library.governanceDecisions.map((decision) => (
              <div key={decision.area} className="p-4 text-sm">
                <div className="font-semibold text-ink">{decision.area}</div>
                <p className="mt-1 text-slate-600">{decision.decision}</p>
                {decision.legacy_aliases ? (
                  <p className="mt-2 text-xs text-slate-500">Aliases: {decision.legacy_aliases}</p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-white shadow-sm">
        <div className="border-b border-line px-4 py-3 font-semibold">Event Catalog</div>
        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="sticky top-0 bg-sage text-xs uppercase text-slate-600">
              <tr>
                <th className="px-3 py-2">Event</th>
                <th className="px-3 py-2">Pack</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Payloads</th>
                <th className="px-3 py-2">Guidance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {events.map((event) => (
                <tr key={event.eventName}>
                  <td className="px-3 py-3 font-semibold">{event.eventName}</td>
                  <td className="px-3 py-3">{event.featurePack}</td>
                  <td className="px-3 py-3">{event.category}</td>
                  <td className="px-3 py-3 text-slate-600">{event.canonicalPayloadFields}</td>
                  <td className="px-3 py-3 text-slate-600">{event.generatorGuidance}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function SpecReview({
  spec,
  setSpec,
  onSave,
  saveStatus,
}: {
  spec: GeneratedSpec | null;
  setSpec: (spec: GeneratedSpec) => void;
  onSave: () => Promise<void>;
  saveStatus: string;
}) {
  const [globalFilter, setGlobalFilter] = useState("");
  const [selectedEventIndex, setSelectedEventIndex] = useState(0);
  const filteredEventIndexes = useMemo(() => {
    if (!spec) return [];
    const lower = globalFilter.toLowerCase();
    return spec.generatedEvents
      .map((event, index) => ({ event, index }))
      .filter(({ event }) =>
        [event.eventName, event.featurePack, event.category, event.status, event.trigger].join(" ").toLowerCase().includes(lower),
      )
      .map(({ index }) => index);
  }, [globalFilter, spec]);

  useEffect(() => {
    if (!spec?.generatedEvents.length) {
      setSelectedEventIndex(0);
      return;
    }
    if (selectedEventIndex >= spec.generatedEvents.length) {
      setSelectedEventIndex(spec.generatedEvents.length - 1);
    }
  }, [selectedEventIndex, spec?.generatedEvents.length]);

  function updateEvent(rowIndex: number, patch: Partial<GeneratedEvent>) {
    if (!spec) return;
    const nextEvents = spec.generatedEvents.map((item, index) => (index === rowIndex ? { ...item, ...patch } : item));
    setSpec({ ...spec, generatedEvents: nextEvents });
  }

  function addCustomEvent() {
    if (!spec) return;
    const nextEvent = newCustomEvent(spec.generatedEvents.length + 1);
    setSpec({
      ...spec,
      generatedEvents: [...spec.generatedEvents, nextEvent],
    });
    setSelectedEventIndex(spec.generatedEvents.length);
  }

  function deleteEvent(rowIndex: number) {
    if (!spec) return;
    const nextEvents = spec.generatedEvents.filter((_item, index) => index !== rowIndex);
    setSpec({ ...spec, generatedEvents: nextEvents });
    setSelectedEventIndex(Math.max(0, Math.min(rowIndex, nextEvents.length - 1)));
  }

  function updateEventPayload(rowIndex: number, payloadIndex: number, patch: Partial<GeneratedPayloadField>) {
    if (!spec) return;
    const eventRow = spec.generatedEvents[rowIndex];
    const nextPayloadFields = eventRow.payloadFields.map((payload, index) =>
      index === payloadIndex ? { ...payload, ...patch } : payload,
    );
    updateEvent(rowIndex, { payloadFields: nextPayloadFields });
  }

  function addEventPayload(rowIndex: number) {
    if (!spec) return;
    const eventRow = spec.generatedEvents[rowIndex];
    updateEvent(rowIndex, {
      payloadFields: [...eventRow.payloadFields, payloadFieldFromName(`custom_payload_${eventRow.payloadFields.length + 1}`)],
    });
  }

  function deleteEventPayload(rowIndex: number, payloadIndex: number) {
    if (!spec) return;
    const eventRow = spec.generatedEvents[rowIndex];
    updateEvent(rowIndex, {
      payloadFields: eventRow.payloadFields.filter((_payload, index) => index !== payloadIndex),
    });
  }

  function updatePlatformAdPayload(
    payloadIndex: number,
    patch: Partial<GeneratedSpec["platformAdPayloads"][number]>,
  ) {
    if (!spec) return;
    const platformAdPayloads = spec.platformAdPayloads.map((payload, index) =>
      index === payloadIndex ? { ...payload, ...patch } : payload,
    );
    setSpec({ ...spec, platformAdPayloads });
  }

  if (!spec) {
    return (
      <section className="rounded-md border border-dashed border-line bg-white p-10 text-center shadow-sm">
        <Sparkles className="mx-auto h-8 w-8 text-cobalt" />
        <h2 className="mt-4 text-xl font-bold text-ink">No spec generated yet</h2>
        <p className="mt-2 text-sm text-slate-600">Fill the game intake and generate a draft analytics spec.</p>
      </section>
    );
  }

  const selectedEvent = spec.generatedEvents[selectedEventIndex] ?? null;

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Metric label="Generated Events" value={spec.generatedEvents.length} />
        <Metric label="Feature Packs" value={spec.selectedFeaturePacks.length} />
        <Metric label="Platform Ad Payloads" value={spec.platformAdPayloads.length} />
        <Metric label="Review Status" value={reviewStatusForEvents(spec.generatedEvents)} />
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-md border border-line bg-white p-4 shadow-sm md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-bold text-ink">{spec.intake.gameTitle}</h2>
          <p className="text-sm text-slate-600">Generated {new Date(spec.generatedAt).toLocaleString()}</p>
          {saveStatus ? <p className="mt-1 text-xs font-semibold text-cobalt">{saveStatus}</p> : null}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={addCustomEvent}
            className="focus-ring inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
          >
            <Plus className="h-4 w-4" />
            Add Event
          </button>
          <button
            type="button"
            onClick={onSave}
            className="focus-ring inline-flex items-center gap-2 rounded-md bg-cobalt px-3 py-2 text-sm font-semibold text-white hover:bg-cobalt/90"
          >
            <Save className="h-4 w-4" />
            Save Spec
          </button>
        </div>
      </div>

      <div className="rounded-md border border-line bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-3">
          <Search className="h-4 w-4 text-slate-500" />
          <input
            value={globalFilter}
            onChange={(event) => setGlobalFilter(event.target.value)}
            placeholder="Filter generated events..."
            className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm"
          />
        </div>
        <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <div className="max-h-[720px] overflow-auto rounded-md border border-line bg-mist">
            <div className="sticky top-0 border-b border-line bg-sage px-3 py-2 text-xs font-semibold uppercase text-slate-600">
              Events
            </div>
            <div className="divide-y divide-line">
              {filteredEventIndexes.map((eventIndex) => {
                const eventRow = spec.generatedEvents[eventIndex];
                const isSelected = eventIndex === selectedEventIndex;
                return (
                  <button
                    key={`${eventRow.eventName}-${eventIndex}`}
                    type="button"
                    onClick={() => setSelectedEventIndex(eventIndex)}
                    className={`focus-ring block w-full px-3 py-3 text-left text-sm ${
                      isSelected ? "bg-white shadow-sm" : "hover:bg-white/70"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-semibold text-ink">{eventRow.eventName}</div>
                        <div className="mt-1 truncate text-xs text-slate-600">{eventRow.featurePack}</div>
                      </div>
                      <span className="shrink-0 rounded bg-white px-2 py-1 text-[11px] font-semibold text-slate-600">
                        {eventRow.status}
                      </span>
                    </div>
                    <div className="mt-2 line-clamp-2 text-xs text-slate-500">{eventRow.trigger}</div>
                    <div className="mt-2 text-[11px] font-semibold uppercase text-slate-500">
                      {eventRow.payloadFields.length} payloads
                    </div>
                  </button>
                );
              })}
              {!filteredEventIndexes.length ? (
                <div className="px-3 py-8 text-center text-sm text-slate-500">No matching events</div>
              ) : null}
            </div>
          </div>

          <div className="rounded-md border border-line bg-white p-4">
            {selectedEvent ? (
              <div className="space-y-5">
                <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 md:flex-row md:items-start">
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-500">Event Details</div>
                    <h3 className="mt-1 text-lg font-bold text-ink">{selectedEvent.eventName}</h3>
                    <p className="text-sm text-slate-600">{selectedEvent.featurePack}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteEvent(selectedEventIndex)}
                    className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete Event
                  </button>
                </div>

                <div className="grid gap-4 md:grid-cols-[1fr_220px]">
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Event Name</span>
                    <input
                      value={selectedEvent.eventName}
                      onChange={(event) => updateEvent(selectedEventIndex, { eventName: event.target.value })}
                      className="focus-ring h-11 w-full rounded-md border border-line px-3 text-sm font-semibold"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Status</span>
                    <select
                      value={selectedEvent.status}
                      onChange={(event) => updateEvent(selectedEventIndex, { status: event.target.value })}
                      className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3 text-sm"
                    >
                      <option>Draft</option>
                      <option>Reviewed</option>
                      <option>Needs changes</option>
                    </select>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Trigger Condition</span>
                  <textarea
                    value={selectedEvent.trigger}
                    onChange={(event) => updateEvent(selectedEventIndex, { trigger: event.target.value })}
                    className="focus-ring min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm"
                  />
                </label>

                <div>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-ink">Payload Details</h4>
                      <p className="text-sm text-slate-600">Edit field names, descriptions, and example values for this event.</p>
                    </div>
                  </div>
                  <PayloadDetailsEditor
                    eventName={selectedEvent.eventName}
                    payloadFields={selectedEvent.payloadFields}
                    onChange={(payloadIndex, patch) => updateEventPayload(selectedEventIndex, payloadIndex, patch)}
                    onDelete={(payloadIndex) => deleteEventPayload(selectedEventIndex, payloadIndex)}
                    onAdd={() => addEventPayload(selectedEventIndex)}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-md border border-dashed border-line p-10 text-center text-sm text-slate-500">
                Select an event to review its details.
              </div>
            )}
          </div>
        </div>
      </div>

      {spec.platformAdPayloads.length ? (
        <div className="rounded-md border border-line bg-white p-4 shadow-sm">
          <h3 className="font-bold text-ink">Platform Ad Payload Enrichment</h3>
          <p className="mt-1 text-sm text-slate-600">
            These are additional payloads for platform-triggered ad events, not manual ad lifecycle specs.
          </p>
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {spec.platformAdPayloads.map((payload, payloadIndex) => (
              <div
                key={`${payload.platformEventName}-${payload.canonicalPayloadName}-${payloadIndex}`}
                className="rounded-md border border-line bg-mist p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold text-ink">{payload.platformEventName}</div>
                    <div className="text-xs font-semibold uppercase text-slate-500">{payload.adFamily}</div>
                  </div>
                  <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-slate-600">
                    {payload.requiredness}
                  </span>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-[180px_1fr]">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Payload</span>
                    <input
                      aria-label={`${payload.platformEventName} platform payload name ${payloadIndex + 1}`}
                      value={payload.canonicalPayloadName}
                      onChange={(event) =>
                        updatePlatformAdPayload(payloadIndex, {
                          payloadName: event.target.value,
                          canonicalPayloadName: event.target.value,
                        })
                      }
                      className="focus-ring h-9 w-full rounded-md border border-line bg-white px-2 text-sm font-semibold"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Description</span>
                    <textarea
                      aria-label={`${payload.platformEventName} ${payload.canonicalPayloadName} platform description`}
                      value={payload.description}
                      onChange={(event) => updatePlatformAdPayload(payloadIndex, { description: event.target.value })}
                      className="focus-ring min-h-20 w-full rounded-md border border-line bg-white px-2 py-1 text-sm"
                    />
                  </label>
                </div>
                <label className="mt-3 block">
                  <span className="mb-1 block text-xs font-semibold uppercase text-slate-500">Example</span>
                  <textarea
                    aria-label={`${payload.platformEventName} ${payload.canonicalPayloadName} platform example`}
                    value={payload.example}
                    onChange={(event) => updatePlatformAdPayload(payloadIndex, { example: event.target.value })}
                    className="focus-ring min-h-16 w-full rounded-md border border-line bg-white px-2 py-1 text-sm"
                  />
                </label>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SavedSpecsBrowser({
  savedSpecs,
  onOpen,
  onDelete,
}: {
  savedSpecs: SavedSpecSummary[];
  onOpen: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  if (!savedSpecs.length) {
    return (
      <section className="rounded-md border border-dashed border-line bg-white p-10 text-center shadow-sm">
        <FileText className="mx-auto h-8 w-8 text-cobalt" />
        <h2 className="mt-4 text-xl font-bold text-ink">No saved specs yet</h2>
        <p className="mt-2 text-sm text-slate-600">Generate a draft, review it, then save it here as a game spec page.</p>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
        <div>
          <h2 className="text-xl font-bold text-ink">Saved Game Specs</h2>
          <p className="text-sm text-slate-600">Open a saved spec to review, edit, and save changes again.</p>
        </div>
        <Metric label="Saved Specs" value={savedSpecs.length} />
      </div>

      <div className="overflow-hidden rounded-md border border-line bg-white shadow-sm">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="bg-sage text-xs uppercase text-slate-600">
            <tr>
              <th className="px-3 py-2">Game</th>
              <th className="px-3 py-2">Genre</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Events</th>
              <th className="px-3 py-2">Payloads</th>
              <th className="px-3 py-2">Updated</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {savedSpecs.map((savedSpec) => (
              <tr key={savedSpec.id}>
                <td className="px-3 py-3">
                  <div className="font-semibold text-ink">{savedSpec.gameTitle}</div>
                  <div className="text-xs text-slate-500">Generated {new Date(savedSpec.generatedAt).toLocaleString()}</div>
                </td>
                <td className="px-3 py-3">{savedSpec.genre || "Unspecified"}</td>
                <td className="px-3 py-3">
                  <span className="rounded bg-mist px-2 py-1 text-xs font-semibold">{savedSpec.status}</span>
                </td>
                <td className="px-3 py-3">{savedSpec.eventCount}</td>
                <td className="px-3 py-3">{savedSpec.payloadCount}</td>
                <td className="px-3 py-3">{new Date(savedSpec.updatedAt).toLocaleString()}</td>
                <td className="px-3 py-3">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onOpen(savedSpec.id)}
                      className="focus-ring inline-flex items-center gap-1 rounded-md bg-cobalt px-3 py-2 text-xs font-semibold text-white hover:bg-cobalt/90"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Delete ${savedSpec.gameTitle}?`)) void onDelete(savedSpec.id);
                      }}
                      className="focus-ring inline-flex items-center gap-1 rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold hover:bg-red-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function MvpApp({ library }: { library: LibrarySnapshot }) {
  const [activeTab, setActiveTab] = useState<Tab>("intake");
  const [spec, setSpec] = useState<GeneratedSpec | null>(null);
  const [savedSpecs, setSavedSpecs] = useState<SavedSpecSummary[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  const form = useForm<GameIntake>({
    resolver: zodResolver(intakeSchema),
    defaultValues: {
      gameTitle: "",
      genre: "",
      coreLoop: "",
      gameModes: "",
      mechanics: "",
      winConditions: "",
      loseConditions: "",
      economy: "",
      itemsOrPowerups: "",
      powerupNames: "",
      iap: "",
      ads: "",
      rewardedAdPlacements: "",
      interstitialAdPlacements: "",
      liveOps: "",
      notes: "",
    },
  });

  const selectedAds = splitTextList(form.watch("ads") ?? "");
  const showRewardedPlacements = selectedAds.includes("Rewarded Ads");
  const showInterstitialPlacements = selectedAds.includes("Interstitial Ads");
  const formErrors = Object.values(form.formState.errors)
    .map((formError) => formError?.message)
    .filter(Boolean);

  async function refreshSavedSpecs() {
    const response = await fetch("/api/specs");
    if (!response.ok) throw new Error(await response.text());
    setSavedSpecs((await response.json()) as SavedSpecSummary[]);
  }

  useEffect(() => {
    refreshSavedSpecs().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load saved specs");
    });
  }, []);

  async function onSubmit(values: GameIntake) {
    setIsGenerating(true);
    setError("");
    setSaveStatus("");
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!response.ok) throw new Error(await response.text());
      const generated = (await response.json()) as GeneratedSpec;
      setSpec(generated);
      setActiveTab("review");
      await refreshSavedSpecs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  async function saveCurrentSpec() {
    if (!spec) return;
    setError("");
    setSaveStatus("Saving...");
    try {
      const response = await fetch("/api/specs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(spec),
      });
      if (!response.ok) throw new Error(await response.text());
      const saved = (await response.json()) as SavedSpecSummary;
      await refreshSavedSpecs();
      setSaveStatus(`Saved ${new Date(saved.updatedAt).toLocaleString()}`);
    } catch (err) {
      setSaveStatus("");
      setError(err instanceof Error ? err.message : "Could not save spec");
    }
  }

  async function openSavedSpec(id: string) {
    setError("");
    const response = await fetch(`/api/specs/${id}`);
    if (!response.ok) {
      setError(await response.text());
      return;
    }
    const savedSpec = (await response.json()) as GeneratedSpec;
    setSpec(savedSpec);
    form.reset(savedSpec.intake);
    setSaveStatus("Saved spec loaded");
    setActiveTab("review");
  }

  async function deleteSpec(id: string) {
    setError("");
    const response = await fetch(`/api/specs/${id}`, { method: "DELETE" });
    if (!response.ok) {
      setError(await response.text());
      return;
    }
    if (spec?.id === id) {
      setSpec(null);
      setSaveStatus("");
    }
    await refreshSavedSpecs();
  }

  return (
    <main className="min-h-screen bg-mist">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-cobalt">
              <Wand2 className="h-4 w-4" />
              Local MVP
            </div>
            <h1 className="mt-1 text-2xl font-bold text-ink">Game Analytics Spec Generator</h1>
          </div>
          <nav className="flex gap-2">
            <TabButton tab="intake" activeTab={activeTab} setActiveTab={setActiveTab}>
              Intake
            </TabButton>
            <TabButton tab="review" activeTab={activeTab} setActiveTab={setActiveTab}>
              Review
            </TabButton>
            <TabButton tab="specs" activeTab={activeTab} setActiveTab={setActiveTab}>
              Saved Specs
            </TabButton>
            <TabButton tab="library" activeTab={activeTab} setActiveTab={setActiveTab}>
              Library
            </TabButton>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-6 py-6">
        {activeTab === "intake" ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 rounded-md border border-line bg-white p-5 shadow-soft">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-ink">Game Title</span>
                  <input
                    {...form.register("gameTitle")}
                    className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3 text-sm shadow-sm"
                    placeholder="Sizzle Sort"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-ink">Genre</span>
                  <input
                    {...form.register("genre")}
                    className="focus-ring h-11 w-full rounded-md border border-line bg-white px-3 text-sm shadow-sm"
                    placeholder="Match-3 timed puzzle"
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {intakeOptionGroups.map((group) => (
                  <CheckboxDropdown key={group.name} form={form} {...group} allowCustom={group.name !== "ads"} />
                ))}
                {showRewardedPlacements ? (
                  <CheckboxDropdown
                    form={form}
                    name="rewardedAdPlacements"
                    label="Rewarded Ad Placements"
                    helper="Pick where rewarded ads can appear."
                    options={rewardedAdPlacementOptions}
                    allowCustom={false}
                  />
                ) : null}
                {showInterstitialPlacements ? (
                  <CheckboxDropdown
                    form={form}
                    name="interstitialAdPlacements"
                    label="Interstitial Ad Placements"
                    helper="Pick where interstitial ads can appear."
                    options={interstitialAdPlacementOptions}
                    allowCustom={false}
                  />
                ) : null}
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Game Modes" name="gameModes" register={form.register} />
                <Field label="Win Conditions" name="winConditions" register={form.register} />
                <Field label="Lose Conditions" name="loseConditions" register={form.register} />
                <Field label="Items / Powerups" name="itemsOrPowerups" register={form.register} />
                <TextInput
                  label="Powerup Names"
                  name="powerupNames"
                  register={form.register}
                  placeholder="shuffle, takeaway, hourglass, toolkit"
                  help="Generates Game_End payloads like powerup_shuffle_used and transaction item examples like powerup_shuffle."
                />
                <Field label="Notes" name="notes" register={form.register} />
              </div>
              {formErrors.length ? (
                <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
                  {formErrors.map((message) => (
                    <div key={message}>{message}</div>
                  ))}
                </div>
              ) : null}
              {error ? <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="focus-ring inline-flex items-center gap-2 rounded-md bg-cobalt px-4 py-2 text-sm font-semibold text-white hover:bg-cobalt/90 disabled:opacity-60"
                >
                  <Play className="h-4 w-4" />
                  {isGenerating ? "Generating..." : "Generate Spec"}
                </button>
                <button
                  type="button"
                  onClick={() => form.reset(exampleIntake)}
                  className="focus-ring inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  <Sparkles className="h-4 w-4" />
                  Load Example
                </button>
              </div>
            </form>

            <aside className="space-y-4">
              <div className="rounded-md border border-line bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-ink">
                  <Library className="h-4 w-4" />
                  Library Seed
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Seeded from {library.events.length} canonical events and {library.generationPacks.length} generation packs.
                </p>
              </div>
              <div className="rounded-md border border-line bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-ink">
                  <BookOpen className="h-4 w-4" />
                  Intake Tips
                </div>
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  {splitTextList("Mention ads only if the game has ads; Include IAP/store terms if purchases exist; Add lose conditions to improve Game_End payload recommendations").map(
                    (tip) => (
                      <li key={tip}>{tip}</li>
                    ),
                  )}
                </ul>
              </div>
            </aside>
          </section>
        ) : null}

        {activeTab === "review" ? (
          <SpecReview spec={spec} setSpec={setSpec} onSave={saveCurrentSpec} saveStatus={saveStatus} />
        ) : null}
        {activeTab === "specs" ? (
          <SavedSpecsBrowser savedSpecs={savedSpecs} onOpen={openSavedSpec} onDelete={deleteSpec} />
        ) : null}
        {activeTab === "library" ? <LibraryBrowser library={library} /> : null}
      </div>
    </main>
  );
}
