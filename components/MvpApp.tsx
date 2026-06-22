"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FileText,
  Link2,
  Library,
  Play,
  Plus,
  Save,
  Search,
  Sparkles,
  Table2,
  Trash2,
  Wand2,
  type LucideIcon,
} from "lucide-react";
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

type Tab = "intake" | "review" | "viewer" | "specs" | "library";

const navigationItems: Array<{ tab: Tab; label: string; icon: LucideIcon }> = [
  { tab: "intake", label: "Intake", icon: Wand2 },
  { tab: "review", label: "Review", icon: Sparkles },
  { tab: "viewer", label: "Spec Viewer", icon: Table2 },
  { tab: "specs", label: "Saved Specs", icon: FileText },
  { tab: "library", label: "Library", icon: Library },
];

function tabFromParam(value: string | null): Tab | null {
  if (value === "intake" || value === "review" || value === "viewer" || value === "specs" || value === "library") {
    return value;
  }
  return null;
}

const exampleIntake: GameIntake = {
  gameTitle: "Sample Match Timed",
  genre: "Match-3 timed puzzle",
  coreLoop: "Level / round based",
  gameModes: "Journey, Daily Challenge",
  mechanics: "Limited time, Match objectives, Powerups, Revive, Play-on, Difficulty tiers",
  winConditions: "Complete all level objectives before time expires",
  loseConditions: "Out of time, delivery failed",
  economy: "Currency, Item inventory",
  itemsOrPowerups: "shuffle, takeaway, hourglass, toolkit",
  powerupNames: "shuffle, takeaway, hourglass, toolkit",
  iap: "Store enabled, Paid products",
  ads: "Rewarded Ads, Interstitial Ads",
  rewardedAdPlacements: "2x_rewards, daily_reward, ad_reward, powerup",
  interstitialAdPlacements: "game_end, session_resume, mid_game",
  liveOps: "Events / seasons, Missions / milestones",
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
    label: "Game Structure",
    helper: "Pick the broad play structure.",
    options: ["Level / round based", "Session based"],
  },
  {
    name: "mechanics",
    label: "Mechanics",
    helper: "Pick mechanics that affect payload requirements.",
    options: ["Limited moves", "Limited time", "Match objectives", "Powerups", "Revive", "Play-on", "Difficulty tiers"],
  },
  {
    name: "economy",
    label: "Economy",
    helper: "Pick systems that require transaction tracking.",
    options: ["Currency", "Item inventory", "Lives / energy"],
  },
  {
    name: "iap",
    label: "IAP",
    helper: "Pick paid purchase surfaces.",
    options: ["Store enabled", "Paid products"],
  },
  {
    name: "ads",
    label: "Ads",
    helper: "Pick ad formats used by the game.",
    options: ["Rewarded Ads", "Interstitial Ads"],
  },
  {
    name: "liveOps",
    label: "Live Ops",
    helper: "Pick limited-time or recurring event systems.",
    options: ["Events / seasons", "Missions / milestones", "Leaderboards"],
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
  const tone = categoryTone(label);

  function toggle(option: string) {
    const next = selectedSet.has(option)
      ? selected.filter((item) => item !== option)
      : [...selected, option];
    form.setValue(name, next.join(", "), { shouldDirty: true, shouldValidate: true });
  }

  return (
    <details className={`rounded-md border border-line border-l-2 bg-white shadow-sm open:shadow-md ${tone.border}`}>
      <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-3 rounded-md px-4 py-3">
        <span>
          <span className={`block text-sm font-semibold ${tone.text}`}>{label}</span>
          <span className="mt-1 block text-xs text-slate-500">
            {selected.length ? `${selected.length} selected` : helper}
          </span>
        </span>
        <ToneChip tone={tone}>Choose</ToneChip>
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

function statusTone(status: string) {
  const lower = status.toLowerCase();
  if (lower.includes("review") || lower.includes("approved") || lower.includes("final")) {
    return {
      chip: "border-emerald/30 bg-emerald/10 text-emerald",
      metric: "text-emerald",
      bar: "bg-emerald",
    };
  }
  if (lower.includes("change") || lower.includes("error") || lower.includes("fail")) {
    return {
      chip: "border-rose/30 bg-rose/10 text-rose",
      metric: "text-rose",
      bar: "bg-rose",
    };
  }
  if (lower.includes("draft")) {
    return {
      chip: "border-amber/30 bg-amber/10 text-amber",
      metric: "text-amber",
      bar: "bg-amber",
    };
  }
  return {
    chip: "border-line bg-sage text-slate-500",
    metric: "text-ink",
    bar: "bg-line",
  };
}

function categoryTone(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("economy") || lower.includes("currency") || lower.includes("transaction")) {
    return {
      text: "text-emerald",
      border: "border-l-emerald",
      chip: "border-emerald/30 bg-emerald/10 text-emerald",
      table: "bg-emerald/10 text-emerald",
      bar: "bg-emerald",
    };
  }
  if (lower.includes("iap") || lower.includes("store") || lower.includes("purchase")) {
    return {
      text: "text-amber",
      border: "border-l-amber",
      chip: "border-amber/30 bg-amber/10 text-amber",
      table: "bg-amber/10 text-amber",
      bar: "bg-amber",
    };
  }
  if (lower.includes("ad") || lower.includes("iaa") || lower.includes("rewarded") || lower.includes("interstitial")) {
    return {
      text: "text-cyan",
      border: "border-l-cyan",
      chip: "border-cyan/30 bg-cyan/10 text-cyan",
      table: "bg-cyan/10 text-cyan",
      bar: "bg-cyan",
    };
  }
  if (lower.includes("live") || lower.includes("event") || lower.includes("mission")) {
    return {
      text: "text-violet",
      border: "border-l-violet",
      chip: "border-violet/30 bg-violet/10 text-violet",
      table: "bg-violet/10 text-violet",
      bar: "bg-violet",
    };
  }
  if (lower.includes("game") || lower.includes("play") || lower.includes("core")) {
    return {
      text: "text-cobalt",
      border: "border-l-cobalt",
      chip: "border-cobalt/30 bg-cobalt/10 text-cobalt",
      table: "bg-cobalt/10 text-cobalt",
      bar: "bg-cobalt",
    };
  }
  return {
    text: "text-slate-500",
    border: "border-l-line",
    chip: "border-line bg-sage text-slate-500",
    table: "bg-sage text-slate-500",
    bar: "bg-line",
  };
}

function metricTone(label: string, value: string | number) {
  const lowerLabel = label.toLowerCase();
  if (lowerLabel.includes("status")) return statusTone(String(value));
  if (lowerLabel.includes("event")) return { metric: "text-cobalt", bar: "bg-cobalt" };
  if (lowerLabel.includes("payload")) return { metric: "text-emerald", bar: "bg-emerald" };
  if (lowerLabel.includes("pack")) return { metric: "text-violet", bar: "bg-violet" };
  if (lowerLabel.includes("updated")) return { metric: "text-amber", bar: "bg-amber" };
  return { metric: "text-ink", bar: "bg-line" };
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`status-chip w-fit rounded border px-2 py-1 text-[11px] font-semibold ${statusTone(status).chip}`}>
      {status}
    </span>
  );
}

function ToneChip({ children, tone }: { children: React.ReactNode; tone: ReturnType<typeof categoryTone> }) {
  return (
    <span className={`tone-chip w-fit rounded border px-2 py-1 text-[11px] font-semibold uppercase ${tone.chip}`}>
      {children}
    </span>
  );
}

function DataTypePill({ type }: { type: string }) {
  const lower = type.toLowerCase();
  const tone = lower.includes("int") || lower.includes("number") || lower.includes("float")
    ? "border-amber/30 bg-amber/10 text-amber"
    : lower.includes("bool")
      ? "border-violet/30 bg-violet/10 text-violet"
      : lower.includes("id")
        ? "border-cyan/30 bg-cyan/10 text-cyan"
        : "border-cobalt/30 bg-cobalt/10 text-cobalt";

  return (
    <span className={`tone-chip inline-flex w-fit items-center rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold ${tone}`}>
      {type || "-"}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  const tone = metricTone(label, value);
  return (
    <div className="relative overflow-hidden rounded-md border border-line bg-white p-4 shadow-sm">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${tone.bar}`} />
      <div className="font-mono text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`metric-value mt-2 text-3xl font-bold leading-none ${tone.metric}`}>{value}</div>
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

type PlatformAdPayloadRow = GeneratedSpec["platformAdPayloads"][number];

type AdPayloadGroup = {
  key: string;
  adFamily: string;
  canonicalPayloadName: string;
  payloadName: string;
  description: string;
  example: string;
  requiredness: string;
  platformEventNames: string[];
  rowIndexes: number[];
};

function adPayloadGroupKey(adFamily: string, canonicalPayloadName: string) {
  return `${adFamily}::${canonicalPayloadName}`;
}

function adPayloadGroupsFor(payloads: PlatformAdPayloadRow[]) {
  const groups = new Map<string, AdPayloadGroup>();

  payloads.forEach((payload, index) => {
    const key = adPayloadGroupKey(payload.adFamily, payload.canonicalPayloadName);
    const existing = groups.get(key);
    if (existing) {
      existing.rowIndexes.push(index);
      if (!existing.platformEventNames.includes(payload.platformEventName)) {
        existing.platformEventNames.push(payload.platformEventName);
      }
      return;
    }

    groups.set(key, {
      key,
      adFamily: payload.adFamily,
      canonicalPayloadName: payload.canonicalPayloadName,
      payloadName: payload.payloadName,
      description: payload.description,
      example: payload.example,
      requiredness: payload.requiredness,
      platformEventNames: [payload.platformEventName],
      rowIndexes: [index],
    });
  });

  return [...groups.values()].sort(
    (left, right) =>
      left.adFamily.localeCompare(right.adFamily) || left.canonicalPayloadName.localeCompare(right.canonicalPayloadName),
  );
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
        <div key={`payload-${payloadIndex}`} className="rounded-md border border-line bg-mist p-3">
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
                className="focus-ring h-9 w-full rounded-md border border-line bg-white px-2 font-mono text-sm font-semibold text-cobalt"
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
                className="focus-ring min-h-20 w-full rounded-md border border-line bg-white px-2 py-1 font-mono text-sm text-emerald"
              />
            </label>
            <button
              type="button"
              onClick={() => onDelete(payloadIndex)}
              className="focus-ring mt-5 inline-flex h-9 items-center justify-center gap-1 rounded-md border border-rose/40 bg-rose/10 px-2 text-xs font-semibold text-rose hover:bg-rose/20"
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

function SidebarNavButton({
  item,
  activeTab,
  setActiveTab,
  collapsed,
}: {
  item: (typeof navigationItems)[number];
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  collapsed: boolean;
}) {
  const Icon = item.icon;
  const isActive = activeTab === item.tab;

  return (
    <button
      type="button"
      title={collapsed ? item.label : undefined}
      aria-label={item.label}
      aria-current={isActive ? "page" : undefined}
      onClick={() => setActiveTab(item.tab)}
      className={`focus-ring group flex h-11 w-full items-center gap-3 rounded-md border px-3 text-sm font-semibold transition-colors ${
        collapsed ? "justify-center" : "justify-start max-md:justify-center"
      } ${
        isActive
          ? "border-cobalt bg-cobalt text-white"
          : "border-transparent bg-transparent text-slate-500 hover:border-line hover:bg-sage hover:text-ink"
      }`}
    >
      <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-white" : "text-slate-500 group-hover:text-ink"}`} />
      {collapsed ? null : <span className="truncate max-md:hidden">{item.label}</span>}
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
  const [adPayloadFilter, setAdPayloadFilter] = useState("");
  const [selectedAdPayloadGroupKey, setSelectedAdPayloadGroupKey] = useState("");
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
  const adPayloadGroups = useMemo(() => adPayloadGroupsFor(spec?.platformAdPayloads ?? []), [spec?.platformAdPayloads]);
  const filteredAdPayloadGroups = useMemo(() => {
    if (!spec) return [];
    const lower = adPayloadFilter.toLowerCase();
    return adPayloadGroups.filter((group) =>
      [
        group.adFamily,
        group.canonicalPayloadName,
        group.description,
        group.example,
        group.requiredness,
        ...group.platformEventNames,
      ]
        .join(" ")
        .toLowerCase()
        .includes(lower),
    );
  }, [adPayloadFilter, adPayloadGroups, spec]);

  useEffect(() => {
    if (!spec?.generatedEvents.length) {
      setSelectedEventIndex(0);
      return;
    }
    if (selectedEventIndex >= spec.generatedEvents.length) {
      setSelectedEventIndex(spec.generatedEvents.length - 1);
    }
  }, [selectedEventIndex, spec?.generatedEvents.length]);

  useEffect(() => {
    if (!adPayloadGroups.length) {
      setSelectedAdPayloadGroupKey("");
      return;
    }
    if (!adPayloadGroups.some((group) => group.key === selectedAdPayloadGroupKey)) {
      setSelectedAdPayloadGroupKey(adPayloadGroups[0].key);
    }
  }, [adPayloadGroups, selectedAdPayloadGroupKey]);

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

  function updatePlatformAdPayloadGroup(
    group: AdPayloadGroup,
    patch: Partial<GeneratedSpec["platformAdPayloads"][number]>,
  ) {
    if (!spec) return;
    const targetRows = new Set(group.rowIndexes);
    const platformAdPayloads = spec.platformAdPayloads.map((payload, index) =>
      targetRows.has(index) ? { ...payload, ...patch } : payload,
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
  const selectedAdPayloadGroup =
    filteredAdPayloadGroups.find((group) => group.key === selectedAdPayloadGroupKey) ?? filteredAdPayloadGroups[0] ?? null;

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
                const tone = categoryTone(`${eventRow.category} ${eventRow.featurePack} ${eventRow.eventName}`);
                return (
                  <button
                    key={`${eventRow.eventName}-${eventIndex}`}
                    type="button"
                    onClick={() => setSelectedEventIndex(eventIndex)}
                    className={`focus-ring block w-full border-l-2 px-3 py-3 text-left text-sm ${tone.border} ${
                      isSelected ? "bg-sage shadow-sm" : "hover:bg-sage"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className={`truncate font-mono text-sm font-semibold ${tone.text}`}>{eventRow.eventName}</div>
                        <div className="mt-1 truncate text-xs text-slate-600">{eventRow.featurePack}</div>
                      </div>
                      <StatusChip status={eventRow.status} />
                    </div>
                    <div className="mt-2 line-clamp-2 text-xs text-slate-500">{eventRow.trigger}</div>
                    <div className="mt-2 font-mono text-[11px] font-semibold uppercase text-slate-500">
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
                    <h3 className={`mt-1 font-mono text-lg font-bold ${categoryTone(`${selectedEvent.category} ${selectedEvent.featurePack} ${selectedEvent.eventName}`).text}`}>
                      {selectedEvent.eventName}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <ToneChip tone={categoryTone(`${selectedEvent.category} ${selectedEvent.featurePack} ${selectedEvent.eventName}`)}>
                        {selectedEvent.category}
                      </ToneChip>
                      <span className="text-sm text-slate-600">{selectedEvent.featurePack}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteEvent(selectedEventIndex)}
                    className="focus-ring inline-flex items-center justify-center gap-2 rounded-md border border-rose/40 bg-rose/10 px-3 py-2 text-sm font-semibold text-rose hover:bg-rose/20"
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
          <div className="mb-3 flex flex-col justify-between gap-3 md:flex-row md:items-start">
            <div>
              <h3 className="font-bold text-ink">Platform Ad Payload Enrichment</h3>
              <p className="mt-1 text-sm text-slate-600">
                Edit one payload definition per ad type. Changes apply to every platform-triggered event in that ad type.
              </p>
            </div>
            <span className="w-fit rounded bg-sage px-2 py-1 text-xs font-semibold uppercase text-slate-600">
              {adPayloadGroups.length} payload definitions
            </span>
          </div>

          <div className="mb-3 flex items-center gap-3">
            <Search className="h-4 w-4 text-slate-500" />
            <input
              value={adPayloadFilter}
              onChange={(event) => setAdPayloadFilter(event.target.value)}
              placeholder="Filter ad payloads..."
              className="focus-ring w-full rounded-md border border-line px-3 py-2 text-sm"
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
            <div className="max-h-[560px] overflow-auto rounded-md border border-line bg-mist">
              <div className="sticky top-0 border-b border-line bg-sage px-3 py-2 text-xs font-semibold uppercase text-slate-600">
                Ad Payload Definitions
              </div>
              <div className="divide-y divide-line">
                {filteredAdPayloadGroups.map((group) => {
                  const isSelected = group.key === selectedAdPayloadGroup?.key;
                  const tone = categoryTone(`${group.adFamily} ad payload`);
                  return (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() => setSelectedAdPayloadGroupKey(group.key)}
                      className={`focus-ring block w-full border-l-2 px-3 py-3 text-left text-sm ${tone.border} ${
                        isSelected ? "bg-sage shadow-sm" : "hover:bg-sage"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className={`truncate font-mono text-sm font-semibold ${tone.text}`}>{group.canonicalPayloadName}</div>
                          <div className="mt-1 truncate text-xs text-slate-600">{group.adFamily} Ads</div>
                        </div>
                        <ToneChip tone={tone}>{group.platformEventNames.length} events</ToneChip>
                      </div>
                      <div className="mt-2 line-clamp-2 text-xs text-slate-500">{group.description}</div>
                      <div className="mt-2 truncate font-mono text-xs text-slate-700">{group.example}</div>
                    </button>
                  );
                })}
                {!filteredAdPayloadGroups.length ? (
                  <div className="px-3 py-8 text-center text-sm text-slate-500">No matching ad payloads</div>
                ) : null}
              </div>
            </div>

            <div className="rounded-md border border-line bg-white p-4">
              {selectedAdPayloadGroup ? (
                <div className="space-y-5">
                  <div className="flex flex-col justify-between gap-3 border-b border-line pb-4 md:flex-row md:items-start">
                    <div>
                      <div className="text-xs font-semibold uppercase text-slate-500">Ad Payload Definition</div>
                      <h4 className={`mt-1 font-mono text-lg font-bold ${categoryTone(`${selectedAdPayloadGroup.adFamily} ad payload`).text}`}>
                        {selectedAdPayloadGroup.canonicalPayloadName}
                      </h4>
                      <p className="text-sm text-slate-600">
                        Applies to all {selectedAdPayloadGroup.adFamily.toLowerCase()} platform ad events.
                      </p>
                    </div>
                    <ToneChip tone={categoryTone(`${selectedAdPayloadGroup.adFamily} ad payload`)}>
                      {selectedAdPayloadGroup.requiredness}
                    </ToneChip>
                  </div>

                  <div className="grid gap-3 md:grid-cols-[180px_1fr]">
                    <div className="rounded-md border border-line bg-mist p-3">
                      <div className="text-xs font-semibold uppercase text-slate-500">Ad Family</div>
                      <div className="mt-1 break-words text-sm font-semibold text-ink">{selectedAdPayloadGroup.adFamily}</div>
                    </div>
                    <div className="rounded-md border border-line bg-mist p-3">
                      <div className="text-xs font-semibold uppercase text-slate-500">Affected Events</div>
                      <div className="mt-1 break-words text-sm font-semibold text-ink">
                        {selectedAdPayloadGroup.platformEventNames.join(", ")}
                      </div>
                    </div>
                  </div>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Payload Name</span>
                    <input
                      data-testid="ad-payload-name"
                      aria-label={`${selectedAdPayloadGroup.adFamily} ${selectedAdPayloadGroup.canonicalPayloadName} payload name`}
                      value={selectedAdPayloadGroup.canonicalPayloadName}
                      onChange={(event) => {
                        const nextName = event.target.value;
                        updatePlatformAdPayloadGroup(selectedAdPayloadGroup, {
                          payloadName: nextName,
                          canonicalPayloadName: nextName,
                        });
                        setSelectedAdPayloadGroupKey(adPayloadGroupKey(selectedAdPayloadGroup.adFamily, nextName));
                      }}
                      className="focus-ring h-11 w-full rounded-md border border-line px-3 text-sm font-semibold"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Requiredness</span>
                    <input
                      data-testid="ad-payload-requiredness"
                      aria-label={`${selectedAdPayloadGroup.adFamily} ${selectedAdPayloadGroup.canonicalPayloadName} requiredness`}
                      value={selectedAdPayloadGroup.requiredness}
                      onChange={(event) =>
                        updatePlatformAdPayloadGroup(selectedAdPayloadGroup, { requiredness: event.target.value })
                      }
                      className="focus-ring h-11 w-full rounded-md border border-line px-3 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Description</span>
                    <textarea
                      data-testid="ad-payload-description"
                      aria-label={`${selectedAdPayloadGroup.adFamily} ${selectedAdPayloadGroup.canonicalPayloadName} platform description`}
                      value={selectedAdPayloadGroup.description}
                      onChange={(event) =>
                        updatePlatformAdPayloadGroup(selectedAdPayloadGroup, { description: event.target.value })
                      }
                      className="focus-ring min-h-24 w-full rounded-md border border-line px-3 py-2 text-sm"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-xs font-semibold uppercase text-slate-500">Example</span>
                    <textarea
                      data-testid="ad-payload-example"
                      aria-label={`${selectedAdPayloadGroup.adFamily} ${selectedAdPayloadGroup.canonicalPayloadName} platform example`}
                      value={selectedAdPayloadGroup.example}
                      onChange={(event) => updatePlatformAdPayloadGroup(selectedAdPayloadGroup, { example: event.target.value })}
                      className="focus-ring min-h-20 w-full rounded-md border border-line px-3 py-2 font-mono text-sm"
                    />
                  </label>
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-line p-10 text-center text-sm text-slate-500">
                  Select an ad payload to review its details.
                </div>
              )}
            </div>
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
                  <StatusChip status={savedSpec.status} />
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
                      className="focus-ring inline-flex items-center gap-1 rounded-md border border-rose/40 bg-rose/10 px-3 py-2 text-xs font-semibold text-rose hover:bg-rose/20"
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

type SpecViewerRow = {
  id: string;
  eventName: string;
  category: string;
  featurePack: string;
  trigger: string;
  argumentName: string;
  argumentDescription: string;
  argumentExamples: string;
  payloadName: string;
  payloadDescription: string;
  payloadExample: string;
  payloadType: string;
  requiredness: string;
  notes: string;
  status: string;
};

type SpecViewerGroupId = "gameplay" | "economy" | "iap" | "iaa" | "liveOps" | "other";

type SpecViewerGroup = {
  id: SpecViewerGroupId;
  label: string;
  description: string;
  events: GeneratedEvent[];
  platformAdPayloads: PlatformAdPayloadRow[];
};

const specViewerGroupMeta: Array<Pick<SpecViewerGroup, "id" | "label" | "description">> = [
  {
    id: "gameplay",
    label: "Gameplay",
    description: "Core round lifecycle specs: Game_Start and Game_End.",
  },
  {
    id: "economy",
    label: "Economy",
    description: "Currency_Transaction and Item_Transaction specs.",
  },
  {
    id: "iap",
    label: "IAP",
    description: "Store_Open and Store_Product_Purchase_* specs.",
  },
  {
    id: "iaa",
    label: "IAA",
    description: "Platform ad event payload specs for Ad_* events.",
  },
  {
    id: "liveOps",
    label: "Live Ops",
    description: "Event_Start, Event_Progress, and Event_End specs.",
  },
  {
    id: "other",
    label: "Other",
    description: "Additional custom or uncategorized event specs.",
  },
];

function groupIdForEventName(eventName: string): SpecViewerGroupId {
  if (eventName === "Game_Start" || eventName === "Game_End") return "gameplay";
  if (eventName === "Currency_Transaction" || eventName === "Item_Transaction") return "economy";
  if (eventName === "Store_Open" || eventName.startsWith("Store_Product_Purchase_")) return "iap";
  if (eventName.startsWith("Ad_")) return "iaa";
  if (eventName.startsWith("Event_")) return "liveOps";
  return "other";
}

function payloadCountForEvents(events: GeneratedEvent[]) {
  return events.reduce((total, event) => total + event.payloadFields.length, 0);
}

function platformEventCount(payloads: PlatformAdPayloadRow[]) {
  return new Set(payloads.map((payload) => payload.platformEventName)).size;
}

function specViewerGroupsFor(spec: GeneratedSpec): SpecViewerGroup[] {
  const groups = new Map<SpecViewerGroupId, SpecViewerGroup>(
    specViewerGroupMeta.map((meta) => [meta.id, { ...meta, events: [], platformAdPayloads: [] }]),
  );

  spec.generatedEvents.forEach((event) => {
    groups.get(groupIdForEventName(event.eventName))?.events.push(event);
  });

  spec.platformAdPayloads.forEach((payload) => {
    groups.get("iaa")?.platformAdPayloads.push(payload);
  });

  return [...groups.values()].filter((group) => group.events.length || group.platformAdPayloads.length);
}

function eventMatchesQuery(event: GeneratedEvent, lowerQuery: string) {
  if (!lowerQuery) return true;
  return [
    event.eventName,
    event.category,
    event.featurePack,
    event.trigger,
    event.argumentName,
    event.argumentDescription,
    event.argumentExamples,
    event.status,
    ...event.payloadFields.flatMap((payload) => [
      payload.canonicalFieldName,
      payload.description,
      payload.example,
      payload.type,
      payload.requiredness,
      payload.notes,
    ]),
  ]
    .join(" ")
    .toLowerCase()
    .includes(lowerQuery);
}

function adPayloadMatchesQuery(payload: PlatformAdPayloadRow, lowerQuery: string) {
  if (!lowerQuery) return true;
  return [
    payload.platformEventName,
    payload.adFamily,
    payload.canonicalPayloadName,
    payload.description,
    payload.example,
    payload.requiredness,
  ]
    .join(" ")
    .toLowerCase()
    .includes(lowerQuery);
}

function groupedPlatformAdPayloads(payloads: PlatformAdPayloadRow[]) {
  const groups = new Map<string, { eventName: string; adFamily: string; payloads: PlatformAdPayloadRow[] }>();
  payloads.forEach((payload) => {
    const existing = groups.get(payload.platformEventName);
    if (existing) {
      existing.payloads.push(payload);
      return;
    }
    groups.set(payload.platformEventName, {
      eventName: payload.platformEventName,
      adFamily: payload.adFamily,
      payloads: [payload],
    });
  });
  return [...groups.values()].sort((left, right) => left.eventName.localeCompare(right.eventName));
}

function rowsForSpec(spec: GeneratedSpec): SpecViewerRow[] {
  return spec.generatedEvents.flatMap((event) => {
    if (!event.payloadFields.length) {
      return [
        {
          id: `${event.eventName}-event`,
          eventName: event.eventName,
          category: event.category,
          featurePack: event.featurePack,
          trigger: event.trigger,
          argumentName: event.argumentName,
          argumentDescription: event.argumentDescription,
          argumentExamples: event.argumentExamples,
          payloadName: "",
          payloadDescription: "",
          payloadExample: "",
          payloadType: "",
          requiredness: "",
          notes: "",
          status: event.status,
        },
      ];
    }
    return event.payloadFields.map((payload, payloadIndex) => ({
      id: `${event.eventName}-${payload.canonicalFieldName}-${payloadIndex}`,
      eventName: event.eventName,
      category: event.category,
      featurePack: event.featurePack,
      trigger: event.trigger,
      argumentName: event.argumentName,
      argumentDescription: event.argumentDescription,
      argumentExamples: event.argumentExamples,
      payloadName: payload.canonicalFieldName,
      payloadDescription: payload.description,
      payloadExample: payload.example,
      payloadType: payload.type,
      requiredness: payload.requiredness,
      notes: payload.notes,
      status: event.status,
    }));
  });
}

function EventSpecCard({ event }: { event: GeneratedEvent }) {
  const tone = categoryTone(`${event.category} ${event.featurePack} ${event.eventName}`);
  return (
    <article className={`rounded-md border border-line border-l-2 bg-white shadow-sm ${tone.border}`}>
      <div className="border-b border-line px-4 py-3">
        <div className="flex flex-col justify-between gap-2 md:flex-row md:items-start">
          <div>
            <h4 className={`font-mono text-base font-bold ${tone.text}`}>{event.eventName}</h4>
            <p className="text-sm text-slate-600">{event.featurePack}</p>
          </div>
          <StatusChip status={event.status} />
        </div>
        <p className="mt-3 text-sm text-slate-700">{event.trigger || "No trigger description yet."}</p>
      </div>

      {(event.argumentName || event.argumentDescription || event.argumentExamples) ? (
        <div className="grid gap-3 border-b border-line bg-mist/50 px-4 py-3 md:grid-cols-3">
          <div>
            <div className="text-xs font-semibold uppercase text-slate-500">Argument</div>
            <div className={`mt-1 font-mono text-sm font-semibold ${tone.text}`}>{event.argumentName || "-"}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-slate-500">Description</div>
            <div className="mt-1 text-sm text-slate-700">{event.argumentDescription || "-"}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase text-slate-500">Examples</div>
            <div className="mt-1 font-mono text-xs text-slate-700">{event.argumentExamples || "-"}</div>
          </div>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-left text-[15px]">
          <thead className={`text-xs uppercase ${tone.table}`}>
            <tr>
              <th className="px-3 py-2">Payload</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Example</th>
              <th className="px-3 py-2">Type</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {event.payloadFields.map((payload, payloadIndex) => (
              <tr key={`${event.eventName}-${payload.canonicalFieldName}-${payloadIndex}`}>
                <td className={`px-3 py-3 align-top font-mono font-semibold ${tone.text}`}>{payload.canonicalFieldName}</td>
                <td className="px-3 py-3 align-top text-slate-700">{payload.description}</td>
                <td className="px-3 py-3 align-top font-mono text-sm text-emerald">{payload.example}</td>
                <td className="px-3 py-3 align-top"><DataTypePill type={payload.type} /></td>
              </tr>
            ))}
            {!event.payloadFields.length ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-sm text-slate-500">
                  No payloads specified for this event.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function PlatformAdEventCard({
  eventName,
  adFamily,
  payloads,
}: {
  eventName: string;
  adFamily: string;
  payloads: PlatformAdPayloadRow[];
}) {
  const tone = categoryTone(`${adFamily} ad event`);
  return (
    <article className={`rounded-md border border-line border-l-2 bg-white shadow-sm ${tone.border}`}>
      <div className="flex flex-col justify-between gap-2 border-b border-line px-4 py-3 md:flex-row md:items-start">
        <div>
          <h4 className={`font-mono text-base font-bold ${tone.text}`}>{eventName}</h4>
          <p className="text-sm text-slate-600">{adFamily} platform ad event</p>
        </div>
        <ToneChip tone={tone}>{payloads.length} payloads</ToneChip>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-[15px]">
          <thead className={`text-xs uppercase ${tone.table}`}>
            <tr>
              <th className="px-3 py-2">Payload</th>
              <th className="px-3 py-2">Description</th>
              <th className="px-3 py-2">Example</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {payloads.map((payload, payloadIndex) => (
              <tr key={`${payload.platformEventName}-${payload.canonicalPayloadName}-${payloadIndex}`}>
                <td className={`px-3 py-3 align-top font-mono font-semibold ${tone.text}`}>{payload.canonicalPayloadName}</td>
                <td className="px-3 py-3 align-top text-slate-700">{payload.description}</td>
                <td className="px-3 py-3 align-top font-mono text-sm text-emerald">{payload.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </article>
  );
}

function SpecViewer({
  specs,
  savedSpecs,
  activeSpecId,
  setActiveSpecId,
  isLoading,
  onOpenEdit,
  onCopyShareLink,
  shareStatus,
}: {
  specs: GeneratedSpec[];
  savedSpecs: SavedSpecSummary[];
  activeSpecId: string;
  setActiveSpecId: (id: string) => void;
  isLoading: boolean;
  onOpenEdit: (id: string) => Promise<void>;
  onCopyShareLink: (id: string) => Promise<void>;
  shareStatus: string;
}) {
  const [query, setQuery] = useState("");
  const [activeGroupId, setActiveGroupId] = useState<SpecViewerGroupId>("gameplay");
  const activeSpec = specs.find((item) => item.id === activeSpecId) ?? specs[0] ?? null;
  const groups = useMemo(() => (activeSpec ? specViewerGroupsFor(activeSpec) : []), [activeSpec]);
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0] ?? null;
  const filteredGroupEvents = useMemo(() => {
    if (!activeGroup) return [];
    const lower = query.toLowerCase();
    return activeGroup.events.filter((event) => eventMatchesQuery(event, lower));
  }, [activeGroup, query]);
  const filteredPlatformAdPayloadGroups = useMemo(() => {
    if (!activeGroup) return [];
    const lower = query.toLowerCase();
    return groupedPlatformAdPayloads(activeGroup.platformAdPayloads.filter((payload) => adPayloadMatchesQuery(payload, lower)));
  }, [activeGroup, query]);

  useEffect(() => {
    if (!groups.length) return;
    if (!groups.some((group) => group.id === activeGroupId)) {
      setActiveGroupId(groups[0].id);
    }
  }, [activeGroupId, groups]);

  if (isLoading) {
    return (
      <section className="rounded-md border border-line bg-white p-10 text-center shadow-sm">
        <Table2 className="mx-auto h-8 w-8 text-cobalt" />
        <h2 className="mt-4 text-xl font-bold text-ink">Loading saved specs</h2>
      </section>
    );
  }

  if (!savedSpecs.length) {
    return (
      <section className="rounded-md border border-dashed border-line bg-white p-10 text-center shadow-sm">
        <Table2 className="mx-auto h-8 w-8 text-cobalt" />
        <h2 className="mt-4 text-xl font-bold text-ink">No saved specs to view</h2>
        <p className="mt-2 text-sm text-slate-600">Generate and save a game spec first, then it will appear here.</p>
      </section>
    );
  }

  if (!activeSpec) {
    return (
      <section className="rounded-md border border-line bg-white p-10 text-center shadow-sm">
        <Table2 className="mx-auto h-8 w-8 text-cobalt" />
        <h2 className="mt-4 text-xl font-bold text-ink">Select a game spec</h2>
      </section>
    );
  }

  const activeSummary = savedSpecs.find((item) => item.id === activeSpec.id);

  return (
    <section className="space-y-4">
      <div className="rounded-md border border-line bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-cobalt">
              <Table2 className="h-4 w-4" />
              Spec Viewer
            </div>
            <h2 className="mt-1 text-xl font-bold text-ink">{activeSpec.intake.gameTitle}</h2>
            <p className="text-sm text-slate-600">
              {activeSpec.intake.genre || "Unspecified genre"} · {activeSpec.generatedEvents.length} events ·{" "}
              {rowsForSpec(activeSpec).length} payload rows
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCopyShareLink(activeSpec.id)}
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold hover:bg-sage"
            >
              <Link2 className="h-4 w-4" />
              Copy Link
            </button>
            <button
              type="button"
              onClick={() => onOpenEdit(activeSpec.id)}
              className="focus-ring inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              <FileText className="h-4 w-4" />
              Edit Spec
            </button>
          </div>
        </div>
        {shareStatus ? <div className="border-b border-line px-4 py-2 text-xs font-semibold text-cobalt">{shareStatus}</div> : null}

        {savedSpecs.length > 1 ? (
          <div className="flex gap-1 overflow-x-auto border-b border-line bg-mist px-3 pt-3">
            {savedSpecs.map((savedSpec) => (
              <button
                key={savedSpec.id}
                type="button"
                onClick={() => setActiveSpecId(savedSpec.id)}
                className={`focus-ring shrink-0 rounded-t-md border border-b-0 px-4 py-2 text-sm font-semibold ${
                  activeSpec.id === savedSpec.id
                    ? "border-line bg-sage text-ink"
                    : "border-transparent bg-transparent text-slate-600 hover:bg-white/70"
                }`}
              >
                {savedSpec.gameTitle}
              </button>
            ))}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-4">
          <Metric label="Status" value={activeSummary?.status ?? reviewStatusForEvents(activeSpec.generatedEvents)} />
          <Metric label="Events" value={activeSpec.generatedEvents.length} />
          <Metric label="Payload Rows" value={rowsForSpec(activeSpec).length} />
          <Metric label="Updated" value={activeSummary ? new Date(activeSummary.updatedAt).toLocaleDateString() : "-"} />
        </div>

        <div className="border-t border-line px-4 py-4">
          <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Spec groups">
            {groups.map((group) => {
              const eventCount = group.events.length + platformEventCount(group.platformAdPayloads);
              const payloadCount = payloadCountForEvents(group.events) + group.platformAdPayloads.length;
              const isActive = group.id === activeGroup?.id;
              const tone = categoryTone(group.label);
              return (
                <button
                  key={group.id}
                  type="button"
                  aria-label={`View ${group.label} spec group`}
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveGroupId(group.id);
                    setQuery("");
                  }}
                  className={`focus-ring shrink-0 rounded-md border px-4 py-3 text-left text-sm ${
                    isActive ? `border-cobalt bg-cobalt text-white shadow-sm` : `border-line bg-white text-slate-700 hover:bg-mist`
                  }`}
                >
                  <div className={`mb-2 h-0.5 w-8 rounded ${isActive ? "bg-white/80" : tone.bar}`} />
                  <div className={`font-mono text-sm font-bold ${isActive ? "text-white" : tone.text}`}>{group.label}</div>
                  <div className={`mt-1 text-xs ${isActive ? "text-white/80" : "text-slate-500"}`}>
                    {eventCount} events · {payloadCount} payloads
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {activeGroup ? (
          <div className="border-t border-line bg-mist/50 px-4 py-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase text-slate-500">Current Group</div>
                <h3 className={`mt-1 text-lg font-bold ${categoryTone(activeGroup.label).text}`}>{activeGroup.label}</h3>
                <p className="text-sm text-slate-600">{activeGroup.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:min-w-72">
                <div className="rounded-md border border-line bg-white px-3 py-2">
                  <div className="text-xs font-semibold uppercase text-slate-500">Events</div>
                  <div className="mt-1 text-lg font-bold text-ink">
                    {activeGroup.events.length + platformEventCount(activeGroup.platformAdPayloads)}
                  </div>
                </div>
                <div className="rounded-md border border-line bg-white px-3 py-2">
                  <div className="text-xs font-semibold uppercase text-slate-500">Payloads</div>
                  <div className="mt-1 text-lg font-bold text-ink">
                    {payloadCountForEvents(activeGroup.events) + activeGroup.platformAdPayloads.length}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-3 rounded-md border border-line bg-white px-3 py-2 shadow-sm">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${activeGroup.label.toLowerCase()} specs...`}
                className="focus-ring w-full border-0 bg-transparent text-sm outline-none"
              />
            </div>

            <div className="mt-4 space-y-4">
              {filteredGroupEvents.map((event) => (
                <EventSpecCard key={event.eventName} event={event} />
              ))}

              {filteredPlatformAdPayloadGroups.map((platformEvent) => (
                <PlatformAdEventCard
                  key={platformEvent.eventName}
                  eventName={platformEvent.eventName}
                  adFamily={platformEvent.adFamily}
                  payloads={platformEvent.payloads}
                />
              ))}

              {!filteredGroupEvents.length && !filteredPlatformAdPayloadGroups.length ? (
                <div className="rounded-md border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-slate-500">
                  No specs match the current search in {activeGroup.label}.
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="border-t border-line px-4 py-10 text-center text-sm text-slate-500">
            No grouped specs are available for this game.
          </div>
        )}
      </div>
    </section>
  );
}

export default function MvpApp({ library }: { library: LibrarySnapshot }) {
  const [activeTab, setActiveTab] = useState<Tab>("intake");
  const [hasReadUrlState, setHasReadUrlState] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [spec, setSpec] = useState<GeneratedSpec | null>(null);
  const [savedSpecs, setSavedSpecs] = useState<SavedSpecSummary[]>([]);
  const [viewerSpecs, setViewerSpecs] = useState<GeneratedSpec[]>([]);
  const [viewerActiveSpecId, setViewerActiveSpecId] = useState("");
  const [isViewerLoading, setIsViewerLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");
  const [shareStatus, setShareStatus] = useState("");

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

  function viewerShareUrl(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "viewer");
    url.searchParams.set("spec", id);
    return url.toString();
  }

  async function copyViewerShareLink(id: string) {
    if (!id) return;
    const url = viewerShareUrl(id);
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Share link copied");
    } catch {
      window.prompt("Copy this share link", url);
      setShareStatus("Share link ready");
    }
  }

  async function loadViewerSpecs(targetSpecId = viewerActiveSpecId) {
    setIsViewerLoading(true);
    setError("");
    try {
      const response = await fetch("/api/specs");
      if (!response.ok) throw new Error(await response.text());
      const summaries = (await response.json()) as SavedSpecSummary[];
      setSavedSpecs(summaries);
      const fullSpecs = await Promise.all(
        summaries.map(async (summary) => {
          const specResponse = await fetch(`/api/specs/${summary.id}`);
          if (!specResponse.ok) throw new Error(await specResponse.text());
          return (await specResponse.json()) as GeneratedSpec;
        }),
      );
      setViewerSpecs(fullSpecs);
      if (!fullSpecs.some((item) => item.id === targetSpecId)) {
        setViewerActiveSpecId(fullSpecs[0]?.id ?? "");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load saved specs");
    } finally {
      setIsViewerLoading(false);
    }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlSpecId = params.get("spec") ?? "";
    const urlTab = tabFromParam(params.get("tab")) ?? (urlSpecId ? "viewer" : null);
    if (urlSpecId) setViewerActiveSpecId(urlSpecId);
    if (urlTab) setActiveTab(urlTab);
    setHasReadUrlState(true);
  }, []);

  useEffect(() => {
    if (!hasReadUrlState) return;
    const url = new URL(window.location.href);
    if (activeTab === "intake") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", activeTab);
    }
    if (activeTab === "viewer" && viewerActiveSpecId) {
      url.searchParams.set("spec", viewerActiveSpecId);
    } else {
      url.searchParams.delete("spec");
    }
    window.history.replaceState(null, "", url.toString());
  }, [activeTab, hasReadUrlState, viewerActiveSpecId]);

  useEffect(() => {
    if (!shareStatus) return;
    const timeout = window.setTimeout(() => setShareStatus(""), 2500);
    return () => window.clearTimeout(timeout);
  }, [shareStatus]);

  useEffect(() => {
    refreshSavedSpecs().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load saved specs");
    });
  }, []);

  useEffect(() => {
    if (activeTab === "viewer") {
      void loadViewerSpecs();
    }
  }, [activeTab]);

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
      if (activeTab === "viewer") await loadViewerSpecs();
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
    setViewerSpecs((items) => items.filter((item) => item.id !== id));
    if (viewerActiveSpecId === id) setViewerActiveSpecId("");
    await refreshSavedSpecs();
  }

  return (
    <main className="theme-dark min-h-screen bg-mist">
      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-line bg-white/95 transition-[width] duration-200 ${
            sidebarCollapsed ? "w-20" : "w-20 md:w-72"
          }`}
        >
          <div className={`border-b border-line px-4 py-5 ${sidebarCollapsed ? "text-center" : ""}`}>
            <div
              className={`flex items-center gap-2 font-mono text-xs font-semibold uppercase text-cobalt ${
                sidebarCollapsed ? "justify-center" : "max-md:justify-center"
              }`}
            >
              <Wand2 className="h-4 w-4" />
              {sidebarCollapsed ? null : <span className="max-md:hidden">Local MVP</span>}
            </div>
            {sidebarCollapsed ? null : (
              <h1 className="mt-2 text-xl font-bold leading-tight text-ink max-md:hidden">Game Analytics Spec Generator</h1>
            )}
          </div>

          <nav className="flex flex-1 flex-col gap-1 p-3" aria-label="Primary navigation">
            {navigationItems.map((item) => (
              <SidebarNavButton
                key={item.tab}
                item={item}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                collapsed={sidebarCollapsed}
              />
            ))}
          </nav>

          <div className="border-t border-line p-3">
            <button
              type="button"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              onClick={() => setSidebarCollapsed((value) => !value)}
              className={`focus-ring flex h-10 w-full items-center gap-2 rounded-md border border-line bg-mist px-3 text-sm font-semibold text-slate-500 hover:bg-sage hover:text-ink ${
                sidebarCollapsed ? "justify-center" : "justify-start max-md:justify-center"
              }`}
            >
              {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              {sidebarCollapsed ? null : <span className="max-md:hidden">Collapse</span>}
            </button>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-8">
        {activeTab === "intake" ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 rounded-lg border border-line bg-white p-5 shadow-soft">
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
              <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-ink">
                  <Library className="h-4 w-4" />
                  Library Seed
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  Seeded from {library.events.length} canonical events and {library.generationPacks.length} generation packs.
                </p>
              </div>
              <div className="rounded-lg border border-line bg-white p-4 shadow-sm">
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
        {activeTab === "viewer" ? (
          <SpecViewer
            specs={viewerSpecs}
            savedSpecs={savedSpecs}
            activeSpecId={viewerActiveSpecId}
            setActiveSpecId={setViewerActiveSpecId}
            isLoading={isViewerLoading}
            onOpenEdit={openSavedSpec}
            onCopyShareLink={copyViewerShareLink}
            shareStatus={shareStatus}
          />
        ) : null}
        {activeTab === "specs" ? (
          <SavedSpecsBrowser savedSpecs={savedSpecs} onOpen={openSavedSpec} onDelete={deleteSpec} />
        ) : null}
        {activeTab === "library" ? <LibraryBrowser library={library} /> : null}
          </div>
        </section>
      </div>
    </main>
  );
}
