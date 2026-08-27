# STRIDE — project conventions

Instructions here apply to all work in this repository.

## UI copy and labels

- **Never prefix a section label with `//`.** Section headings render as plain
  text. The `SecLabel` primitive used to emit `// consistency`; it does not any
  more, and it must not be reintroduced — in `SecLabel`, in any component that
  writes its own heading, or anywhere else in rendered UI. This applies to every
  future change, not just the one that removed it.
- Comment syntax belongs in code, not on screen.

## Design language

The Strength tab brief (`../STRIDE-strength-tab-brief.md`) is the reference for
tokens, typography and motion. In short:

- Numbers that matter are Archivo; labels, units and timestamps are JetBrains
  Mono, uppercase, letter-spaced. Never swap those roles.
- Every logged value carries `.stride-num` for tabular numerals, so committing a
  set never shifts layout.
- `accent` (#00D9FF) means exactly three things: live/active, committed just now,
  and personal record. `success` green appears only on the session receipt's
  streak line.
- A lighter set than last time is muted, never red. Deloads are training.

## Honesty rules

These are not stylistic preferences — they were violated once and caught in
review, so they are written down.

- Never state a relationship the data on screen contradicts. Copy that makes a
  claim about the athlete's numbers must be derived from those numbers, not
  hardcoded. See `durabilityNote` in `src/lib/strength.ts`.
- Never claim lifting caused a running improvement. Sample sizes here cannot
  support a causal claim.
- Consistency metrics must not be inflated. A recovery skip counts as honoured;
  a completed run does not count as evidence a gym session happened.
- No streak-loss warnings, guilt copy, trophies, badges, confetti or emoji.

## Tests

`npm test` (vitest). Pure logic in `src/lib/` should be unit-tested; the metrics
layer in `src/lib/strength.ts` is covered and should stay that way.
