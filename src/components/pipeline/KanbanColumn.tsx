import { GripVertical } from "lucide-react";
import { Droppable, Draggable } from "@hello-pangea/dnd";
import type { PipelineLead, PipelineStage } from "./types";
import { LeadCard } from "./LeadCard";

export function KanbanColumn({
  stage,
  title,
  topBorderClass,
  leads,
  sessionUserId,
  sessionRole,
}: {
  stage: PipelineStage;
  title: string;
  topBorderClass: string;
  leads: PipelineLead[];
  sessionUserId: string | null;
  sessionRole: string | null;
}) {
  return (
    <section className="w-[340px] shrink-0 rounded-lg border border-gold/20 bg-white shadow-[0_4px_24px_rgba(10,22,40,0.02)] overflow-hidden flex flex-col">
      <div
        className={[
          "border-t-[3px] px-4 py-3 border-b border-light-grey/70 bg-[#FAFAFA] flex items-center justify-between",
          topBorderClass,
        ].join(" ")}
      >
        <div className="flex items-center gap-2">
          <div className="text-xs tracking-[0.2em] uppercase text-medium-grey">
            {title}
          </div>
        </div>
        <div className="text-xs font-semibold text-navy bg-white border border-light-grey rounded-full px-2 py-0.5">
          {leads.length}
        </div>
      </div>

      <Droppable droppableId={stage}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={[
              "p-4 flex-1 overflow-y-auto",
              snapshot.isDraggingOver ? "bg-gold/5" : "",
            ].join(" ")}
          >
            <div className="flex flex-col gap-4 min-h-[120px]">
              {leads.map((lead, index) => (
                <Draggable key={lead.id} draggableId={lead.id} index={index}>
                  {(dragProvided) => (
                    <div
                      ref={dragProvided.innerRef}
                      {...dragProvided.draggableProps}
                      className="flex rounded-lg overflow-hidden border border-light-grey/80 bg-white shadow-[0_2px_15px_rgba(10,22,40,0.04)] hover:shadow-[0_6px_18px_rgba(10,22,40,0.06)] transition-shadow"
                    >
                      <button
                        type="button"
                        {...dragProvided.dragHandleProps}
                        className="shrink-0 w-9 flex items-center justify-center border-r border-light-grey/70 bg-cream/40 text-medium-grey hover:bg-cream/70 cursor-grab active:cursor-grabbing"
                        aria-label="Drag to move between stages"
                      >
                        <GripVertical className="w-4 h-4" />
                      </button>
                      <LeadCard lead={lead} sessionUserId={sessionUserId} sessionRole={sessionRole} />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          </div>
        )}
      </Droppable>
    </section>
  );
}

