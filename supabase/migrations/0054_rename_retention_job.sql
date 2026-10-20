-- Lectern — rename the retention job to match the product
--
-- 0019 scheduled the nightly retention sweep as 'verity-retention'. The
-- product is now Lectern, and this is the one place the old name survives
-- where a find-and-replace could not reach it: the job lives in cron.job, not
-- in a file, so editing 0019 would only have made that file disagree with the
-- database — the exact fault 0052 existed to repair.
--
-- The job it runs, public.run_retention(400), is unchanged. Only the name is.
--
-- Safe to re-run, and safe to run while the app is live: the sweep is a
-- nightly delete of conversations older than 400 days, and this database has
-- nothing near that age, so a missed night costs nothing either way.

do $$
begin
  perform cron.unschedule('verity-retention');
exception when others then
  -- Already renamed, or never scheduled. Both fine.
  null;
end;
$$;

do $$
begin
  perform cron.unschedule('lectern-retention');
exception when others then
  null;
end;
$$;

-- Same schedule as 0019: 18:00 UTC is 02:00 in Singapore, outside school
-- hours for the first market, so a large delete never lands in a lesson.
select cron.schedule(
  'lectern-retention',
  '0 18 * * *',
  $$select public.run_retention(400)$$
);

-- Check exactly one job is registered, under the new name only:
--   select jobname, schedule, active from cron.job
--   where jobname in ('verity-retention', 'lectern-retention');
