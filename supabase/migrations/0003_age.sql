-- Athlete age, asked at onboarding — masters runners need more conservative
-- loading, so the plan generator factors it in.
alter table profiles add column if not exists age smallint;
