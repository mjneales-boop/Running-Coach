import { useState } from 'react';
import { DndContext, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { Pill } from './ui/Pill';
import { Check } from './ui/Check';
import { SecLabel } from './ui/SecLabel';
import { weeklyKmDone, formatDateShort } from '../lib/logic';
import { WORKOUTS } from '../constants/workouts';
import type { Week, CompletionEntry, DayAbbr, Day } from '../types';

interface WeekStripProps {
  week: Week;
  today: Date;
  completion: Record<string, CompletionEntry>;
  onDayClick: (weekId: string, dayAbbr: DayAbbr) => void;
  onPrev: () => void;
  onToday: () => void;
  onNext: () => void;
  onMoveGym: (fromDate: string, toDate: string, gym: string, workoutId: string, existingTarget?: { gym: string; workoutId: string } | null) => void;
  onAddGym: (date: string, gym: string, workoutId: string) => void;
  onRemoveGym: (date: string) => void;
}

const DAY_LABELS: Record<DayAbbr, string> = {
  mon: 'MON', tue: 'TUE', wed: 'WED',
  thu: 'THU', fri: 'FRI', sat: 'SAT', sun: 'SUN',
};

const GYM_OPTIONS = Object.values(WORKOUTS).map((w) => ({ id: w.id, name: w.name }));

function ghostBtnStyle(extra?: React.CSSProperties): React.CSSProperties {
  return {
    fontFamily: 'var(--mono)',
    fontSize: 12.5,
    fontWeight: 500,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    transition: 'border-color 150ms ease, color 150ms ease',
    ...extra,
  };
}

function GymChip({
  day,
  onRemove,
}: {
  day: Day;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: day.date + '-gym',
    data: { date: day.date, gym: day.gym, workoutId: day.workoutId },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="gym-chip"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
        padding: '3px 8px 3px 6px',
        borderRadius: 5,
        background: 'rgba(0,217,255,0.08)',
        border: '1px solid rgba(0,217,255,0.2)',
        cursor: isDragging ? 'grabbing' : 'grab',
        opacity: isDragging ? 0.3 : 1,
        userSelect: 'none',
        transition: 'opacity 120ms',
        fontSize: 11,
        fontFamily: 'var(--mono)',
        color: 'var(--accent)',
        letterSpacing: '0.04em',
        maxWidth: '100%',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ fontSize: 11 }}>⬛</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {day.gym}
      </span>
      <button
        onClick={onRemove}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          padding: '0 0 0 2px',
          lineHeight: 1,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
        }}
        title="Remove gym from this day"
      >
        ×
      </button>
    </div>
  );
}

function GymChipOverlay({ label }: { label: string }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: '3px 8px 3px 6px',
        borderRadius: 5,
        background: 'rgba(0,217,255,0.18)',
        border: '1px solid rgba(0,217,255,0.5)',
        fontSize: 11,
        fontFamily: 'var(--mono)',
        color: 'var(--accent)',
        letterSpacing: '0.04em',
        boxShadow: '0 4px 16px rgba(0,217,255,0.15)',
        cursor: 'grabbing',
        pointerEvents: 'none',
      }}
    >
      <span style={{ fontSize: 11 }}>⬛</span>
      {label}
    </div>
  );
}

function AddGymPopover({
  onSelect,
  onClose,
}: {
  onSelect: (id: string, name: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'calc(100% + 6px)',
        left: 0,
        zIndex: 50,
        background: 'var(--bg-2)',
        border: '1px solid var(--border-hover)',
        borderRadius: 8,
        padding: '6px 0',
        minWidth: 160,
        boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
      }}
    >
      {GYM_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(opt.id, opt.name);
          }}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--mono)',
            fontSize: 12,
            color: 'var(--text-dim)',
            padding: '8px 14px',
            letterSpacing: '0.03em',
            transition: 'background 100ms',
          }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-3)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'transparent')}
        >
          {opt.name}
        </button>
      ))}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        style={{
          display: 'block',
          width: '100%',
          textAlign: 'left',
          background: 'transparent',
          border: 'none',
          borderTop: '1px solid var(--border)',
          cursor: 'pointer',
          fontFamily: 'var(--mono)',
          fontSize: 11,
          color: 'var(--text-muted)',
          padding: '8px 14px',
          marginTop: 2,
        }}
      >
        cancel
      </button>
    </div>
  );
}

function DayCard({
  d,
  week,
  isToday,
  isDone,
  isRest,
  metric,
  dateLabel,
  onDayClick,
  onRemoveGym,
  onAddGym,
  activeDragDate,
}: {
  d: Day;
  week: Week;
  isToday: boolean;
  isDone: boolean;
  isRest: boolean;
  metric: string;
  dateLabel: string;
  onDayClick: (weekId: string, dayAbbr: DayAbbr) => void;
  onRemoveGym: (date: string) => void;
  onAddGym: (date: string, gym: string, workoutId: string) => void;
  activeDragDate: string | null;
}) {
  const [showAddPopover, setShowAddPopover] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const { setNodeRef, isOver } = useDroppable({ id: d.date });
  const isDragSource = activeDragDate === d.date;
  const isDropTarget = isOver && !isDragSource;

  let borderColor = isToday ? 'var(--accent)' : 'var(--border)';
  if (isDropTarget) borderColor = 'rgba(0,217,255,0.6)';
  else if (isHovered && !isToday) borderColor = 'var(--border-hover)';

  return (
    <div
      ref={setNodeRef}
      style={{ position: 'relative' }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setShowAddPopover(false); }}
    >
      <div
        onClick={() => onDayClick(week.id, d.d)}
        style={{
          background: isDropTarget ? 'rgba(0,217,255,0.04)' : isToday ? 'var(--bg-3)' : 'var(--bg-2)',
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          minHeight: 150,
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          cursor: 'pointer',
          transition: 'border-color 150ms ease, background 150ms ease',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: isToday ? 'var(--accent)' : 'var(--text-dim)',
              }}
            >
              {DAY_LABELS[d.d]}
            </div>
            <div
              style={{
                fontFamily: 'var(--mono)',
                fontSize: 11.5,
                color: 'var(--text-muted)',
                marginTop: 3,
              }}
            >
              {dateLabel}
            </div>
          </div>
          {isDone && <Check />}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
          <Pill type={d.type} size="sm" />
          <span
            style={{
              fontFamily: 'var(--mono)',
              fontSize: 14,
              fontWeight: 500,
              color: isRest ? 'var(--text-muted)' : 'var(--text-dim)',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {metric}
          </span>

          {/* Gym chip */}
          {d.workoutId && d.gym && (
            <GymChip
              day={d}
              onRemove={(e) => {
                e.stopPropagation();
                onRemoveGym(d.date);
              }}
            />
          )}

          {/* Add gym button — shows on hover when no gym */}
          {!d.workoutId && isHovered && (
            <div style={{ position: 'relative' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAddPopover((v) => !v);
                }}
                style={{
                  marginTop: 2,
                  fontFamily: 'var(--mono)',
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  background: 'transparent',
                  border: '1px dashed var(--border)',
                  borderRadius: 5,
                  padding: '3px 8px',
                  cursor: 'pointer',
                  letterSpacing: '0.04em',
                  transition: 'border-color 150ms, color 150ms',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
                  (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
                }}
              >
                + gym
              </button>
              {showAddPopover && (
                <AddGymPopover
                  onSelect={(id, name) => {
                    onAddGym(d.date, name, id);
                    setShowAddPopover(false);
                  }}
                  onClose={() => setShowAddPopover(false)}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function WeekStrip({
  week,
  today,
  completion,
  onDayClick,
  onPrev,
  onToday,
  onNext,
  onMoveGym,
  onAddGym,
  onRemoveGym,
}: WeekStripProps) {
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const doneKm = Math.round(weeklyKmDone(week, completion));
  const [activeDragDay, setActiveDragDay] = useState<{ date: string; gym: string; workoutId: string } | null>(null);

  function handleDragStart(event: DragStartEvent) {
    const data = event.active.data.current as { date: string; gym: string; workoutId: string };
    setActiveDragDay(data);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragDay(null);
    const { active, over } = event;
    if (!over) return;
    const fromDate = (active.data.current as { date: string }).date;
    const toDate = over.id as string;
    if (fromDate === toDate) return;

    const fromData = active.data.current as { date: string; gym: string; workoutId: string };
    const targetDay = week.days.find((d) => d.date === toDate);
    const existingGym = targetDay?.workoutId && targetDay?.gym
      ? { gym: targetDay.gym, workoutId: targetDay.workoutId }
      : null;

    onMoveGym(fromDate, toDate, fromData.gym, fromData.workoutId, existingGym);
  }

  const navButtons = (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {(['<', 'today', '>'] as const).map((label) => (
        <button
          key={label}
          onClick={label === '<' ? onPrev : label === '>' ? onNext : onToday}
          style={ghostBtnStyle()}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-hover)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-dim)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)';
            (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)';
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <SecLabel className="week-header" action={navButtons}>
        {`this week · ${week.label} · target ${week.targetKm}km · done ${doneKm}km`}
      </SecLabel>

      <div className="week-strip-scroll">
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div
            className="week-strip-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              gap: 10,
            }}
          >
            {week.days.map((d) => {
              const isToday = d.date === todayStr;
              const isDone = completion[`${week.id}-${d.d}`]?.done ?? false;
              const isRest = d.type === 'REST';
              const metric =
                d.km != null ? `${d.km} km` :
                d.duration != null ? `${d.duration} min` :
                '—';
              const dateLabel = formatDateShort(new Date(d.date + 'T12:00:00'));

              return (
                <DayCard
                  key={d.d}
                  d={d}
                  week={week}
                  isToday={isToday}
                  isDone={isDone}
                  isRest={isRest}
                  metric={metric}
                  dateLabel={dateLabel}
                  onDayClick={onDayClick}
                  onRemoveGym={onRemoveGym}
                  onAddGym={onAddGym}
                  activeDragDate={activeDragDay?.date ?? null}
                />
              );
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {activeDragDay && <GymChipOverlay label={activeDragDay.gym} />}
          </DragOverlay>
        </DndContext>
      </div>
    </>
  );
}
