-- Let the athlete choose how many strength/gym sessions per week (0 = none).
-- Supersedes the include_strength boolean, which we keep populated for back-compat.
alter table profiles add column if not exists strength_days smallint;
