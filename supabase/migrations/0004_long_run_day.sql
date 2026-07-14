-- Preferred long-run day of week ('mon'..'sun', or NULL for no preference).
-- Collected in onboarding; the plan generator schedules the weekly long run here.
alter table profiles add column if not exists long_run_day text;
