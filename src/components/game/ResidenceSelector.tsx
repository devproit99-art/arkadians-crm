"use client";

import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

const BUYER_GAME_UNLOCK_KEY = "arkadians_buyer_game_unlocked";

type Step =
  | "lifestyle"
  | "space"
  | "view"
  | "budget"
  | "amenities"
  | "contact"
  | "result";

type Choice = {
  lifestyle?: string;
  space?: string;
  view?: string;
  budget?: string;
  amenities: string[];
  name?: string;
  phone?: string;
  email?: string;
  preferredTime?: string;
};

const amenitySeed = [
  "Pool & Spa",
  "Fitness Centre",
  "Tennis & Padel",
  "Library",
  "Rooftop Events",
  "Children’s Play Area",
  "Mosque",
  "Business Centre",
];

function StepShell({
  stepIndex,
  title,
  subtitle,
  children,
}: {
  stepIndex: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-gold/20 bg-white shadow-[0_10px_35px_rgba(10,22,40,0.06)] overflow-hidden">
      <div className="px-6 py-4 border-b border-light-grey/70 bg-[#FAFAFA] flex items-end justify-between">
        <div>
          <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">
            Step {String(stepIndex).padStart(2, "0")}
          </div>
          <div className="mt-2 font-(--font-display) text-xl text-navy tracking-tight">
            {title}
          </div>
          <div className="mt-1 text-sm text-medium-grey">{subtitle}</div>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function OptionGrid({
  options,
  selected,
  onSelect,
}: {
  options: { title: string; desc: string }[];
  selected?: string;
  onSelect: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {options.map((o) => {
        const isSelected = selected === o.title;
        return (
          <button
            key={o.title}
            type="button"
            onClick={() => onSelect(o.title)}
            className={[
              "text-left rounded-lg border p-5 transition-all",
              isSelected
                ? "border-gold bg-[linear-gradient(135deg,rgba(201,168,76,0.22),rgba(201,168,76,0.08))] shadow-[0_0_24px_rgba(201,168,76,0.18)]"
                : "border-light-grey hover:border-gold/50 hover:bg-[#FAFAFA]",
            ].join(" ")}
          >
            <div className="font-medium text-navy">{o.title}</div>
            <div className="mt-1 text-sm text-medium-grey">{o.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

export function ResidenceSelector({
  playBasePath = "/game/play",
}: {
  /** Where “Enter 3D experience” links (e.g. `/experience/play` for public share link). */
  playBasePath?: string;
} = {}) {
  const [step, setStep] = useState<Step>("lifestyle");
  const [choice, setChoice] = useState<Choice>({ amenities: amenitySeed });

  useEffect(() => {
    if (step !== "result") return;
    try {
      sessionStorage.setItem(BUYER_GAME_UNLOCK_KEY, "1");
    } catch {
      // ignore (private mode / storage blocked)
    }
  }, [step]);

  const stepIndex = useMemo(() => {
    const map: Record<Step, number> = {
      lifestyle: 1,
      space: 2,
      view: 3,
      budget: 4,
      amenities: 5,
      contact: 6,
      result: 7,
    };
    return map[step];
  }, [step]);

  function next() {
    const order: Step[] = ["lifestyle", "space", "view", "budget", "amenities", "contact", "result"];
    const i = order.indexOf(step);
    setStep(order[Math.min(order.length - 1, i + 1)]);
  }

  function back() {
    const order: Step[] = ["lifestyle", "space", "view", "budget", "amenities", "contact", "result"];
    const i = order.indexOf(step);
    setStep(order[Math.max(0, i - 1)]);
  }

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const items = [...choice.amenities];
    const [removed] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, removed);
    setChoice((c) => ({ ...c, amenities: items }));
  }

  const canNext =
    (step === "lifestyle" && !!choice.lifestyle) ||
    (step === "space" && !!choice.space) ||
    (step === "view" && !!choice.view) ||
    (step === "budget" && !!choice.budget) ||
    step === "amenities" ||
    (step === "contact" && !!choice.name && !!choice.phone) ||
    step === "result";

  return (
    <div className="max-w-[980px] mx-auto">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="h-1 w-full bg-light-grey rounded-full overflow-hidden">
          <div
            className="h-full bg-[linear-gradient(90deg,#C9A84C,#A6862E)]"
            style={{ width: `${Math.min(100, (Math.min(stepIndex, 6) / 6) * 100)}%` }}
          />
        </div>
        <div className="text-xs tracking-[0.2em] uppercase text-medium-grey shrink-0">
          {Math.min(stepIndex, 6)} / 6
        </div>
      </div>

      {step === "lifestyle" ? (
        <StepShell
          stepIndex={1}
          title="Lifestyle"
          subtitle="What best describes your lifestyle?"
        >
          <OptionGrid
            selected={choice.lifestyle}
            onSelect={(v) => setChoice((c) => ({ ...c, lifestyle: v }))}
            options={[
              { title: "Family Living", desc: "Space, comfort, and long-term ease." },
              { title: "Professional", desc: "Convenience, access, and daily rhythm." },
              { title: "Investor", desc: "Yield profile and long-view value." },
              { title: "Retiree", desc: "Quiet, wellbeing, and simplicity." },
              { title: "Luxury Seeker", desc: "Signature finishes and premium presence." },
            ]}
          />
        </StepShell>
      ) : null}

      {step === "space" ? (
        <StepShell
          stepIndex={2}
          title="Space"
          subtitle="How much space does your ideal residence need?"
        >
          <OptionGrid
            selected={choice.space}
            onSelect={(v) => setChoice((c) => ({ ...c, space: v }))}
            options={[
              { title: "2-Bedroom Suite", desc: "Efficient luxury for modern living." },
              { title: "3-Bedroom Suite", desc: "Balanced space for work and family." },
              { title: "3-Bedroom Large", desc: "Generous rooms with grand proportions." },
              { title: "4-Bedroom Duplex", desc: "Two-level living with privacy." },
              { title: "The Penthouse", desc: "Signature collection, bespoke layouts." },
            ]}
          />
        </StepShell>
      ) : null}

      {step === "view" ? (
        <StepShell stepIndex={3} title="View" subtitle="Which view inspires you most?">
          <OptionGrid
            selected={choice.view}
            onSelect={(v) => setChoice((c) => ({ ...c, view: v }))}
            options={[
              { title: "Arabian Sea", desc: "A horizon-led, waterfront panorama." },
              { title: "Golf Greens", desc: "Calm, open, and structured views." },
              { title: "City Skyline", desc: "Energy, lights, and elevation." },
              { title: "Dual Sea & Golf", desc: "A premium dual-aspect profile." },
            ]}
          />
        </StepShell>
      ) : null}

      {step === "budget" ? (
        <StepShell
          stepIndex={4}
          title="Budget"
          subtitle="What is your investment range?"
        >
          <OptionGrid
            selected={choice.budget}
            onSelect={(v) => setChoice((c) => ({ ...c, budget: v }))}
            options={[
              { title: "PKR 1 – 3 Crore", desc: "Entry into the registry." },
              { title: "PKR 3 – 5 Crore", desc: "Flexible premium choices." },
              { title: "PKR 5 – 8 Crore", desc: "High-demand configurations." },
              { title: "PKR 8 – 15 Crore", desc: "Signature tiers and elevation." },
              { title: "PKR 15 Crore+", desc: "Bespoke, top-level positions." },
            ]}
          />
        </StepShell>
      ) : null}

      {step === "amenities" ? (
        <StepShell
          stepIndex={5}
          title="Amenities"
          subtitle="Rank the amenities most important to you"
        >
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="amenities">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="flex flex-col gap-2"
                >
                  {choice.amenities.map((a, index) => (
                    <Draggable draggableId={a} index={index} key={a}>
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className="rounded-lg border border-light-grey bg-white px-4 py-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded bg-cream border border-light-grey flex items-center justify-center text-xs font-semibold text-navy">
                              {index + 1}
                            </div>
                            <div className="text-sm font-medium text-navy">{a}</div>
                          </div>
                          <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">
                            Drag
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </StepShell>
      ) : null}

      {step === "contact" ? (
        <StepShell
          stepIndex={6}
          title="Contact"
          subtitle="Almost there. Let us prepare your personalised recommendation."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name (required)">
              <input
                className="w-full rounded-lg border border-light-grey px-3 py-2 text-sm"
                value={choice.name ?? ""}
                onChange={(e) => setChoice((c) => ({ ...c, name: e.target.value }))}
              />
            </Field>
            <Field label="Phone (required)">
              <input
                className="w-full rounded-lg border border-light-grey px-3 py-2 text-sm"
                value={choice.phone ?? ""}
                onChange={(e) => setChoice((c) => ({ ...c, phone: e.target.value }))}
              />
            </Field>
            <Field label="Email (optional)">
              <input
                className="w-full rounded-lg border border-light-grey px-3 py-2 text-sm"
                value={choice.email ?? ""}
                onChange={(e) => setChoice((c) => ({ ...c, email: e.target.value }))}
              />
            </Field>
            <Field label="Preferred contact time (optional)">
              <input
                className="w-full rounded-lg border border-light-grey px-3 py-2 text-sm"
                value={choice.preferredTime ?? ""}
                onChange={(e) => setChoice((c) => ({ ...c, preferredTime: e.target.value }))}
              />
            </Field>
          </div>
        </StepShell>
      ) : null}

      {step === "result" ? (
        <div className="rounded-lg border border-gold/30 bg-white shadow-[0_10px_35px_rgba(10,22,40,0.06)] p-8 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-56 h-56 rounded-full bg-gold/10 blur-3xl pointer-events-none" />
          <div className="relative z-10">
            <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">
              Your Ideal Residence
            </div>
            <div className="mt-2 font-(--font-display) text-3xl text-navy tracking-tight">
              {choice.space ?? "3-Bedroom Large"} Suite
            </div>
            <div className="mt-2 text-medium-grey">
              Suggested view: {choice.view ?? "Arabian Sea"} • Priority:{" "}
              {choice.amenities[0]}
            </div>
            <div className="mt-6 rounded-lg border border-light-grey bg-[#FAFAFA] p-5 text-sm text-medium-grey leading-relaxed">
              Based on your preferences, we recommend a configuration that aligns with your lifestyle and
              budget tier, with a clear path to a private viewing schedule.
            </div>
            <div className="mt-6">
              <Link
                href={playBasePath}
                className="inline-flex w-full items-center justify-center rounded px-5 py-3 text-xs font-semibold tracking-[0.2em] uppercase text-white bg-[linear-gradient(135deg,#0A1628,#1a2c4e)] hover:shadow-[0_4px_15px_rgba(10,22,40,0.30)] transition-shadow text-center"
              >
                Enter 3D experience
              </Link>
            </div>
            <p className="mt-3 text-[11px] text-medium-grey text-center">
              Powered by the{" "}
              <a
                href="https://github.com/cerebriustech-AutomateX/arkadians-game"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-navy hover:text-gold transition-colors"
              >
                arkadians-game
              </a>{" "}
              experience (hosted here after your questionnaire).
            </p>
            <button
              type="button"
              className="mt-4 w-full rounded px-5 py-3 text-xs font-semibold tracking-[0.2em] uppercase text-white bg-[linear-gradient(135deg,#C9A84C,#A6862E)] hover:shadow-[0_0_28px_rgba(201,168,76,0.22)] transition-shadow"
            >
              Book Private Viewing
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={back}
          disabled={step === "lifestyle"}
          className="rounded px-4 py-2 text-xs font-semibold tracking-[0.2em] uppercase border border-light-grey text-medium-grey disabled:opacity-40"
        >
          Back
        </button>
        <button
          type="button"
          onClick={next}
          disabled={!canNext || step === "result"}
          className="rounded px-5 py-2 text-xs font-semibold tracking-[0.2em] uppercase text-white bg-[linear-gradient(135deg,#0A1628,#1a2c4e)] disabled:opacity-40"
        >
          {step === "contact" ? "Generate" : step === "result" ? "Done" : "Next"}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">{label}</div>
      <div className="mt-2">{children}</div>
    </label>
  );
}

