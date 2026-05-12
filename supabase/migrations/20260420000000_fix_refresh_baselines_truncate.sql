-- =============================================================
-- claude-eta — fix refresh_baselines() safeupdate failure
--
-- Supabase enables pg_safeupdate which blocks DELETE statements
-- that lack a WHERE clause, causing the function to fail with:
--   "DELETE requires a WHERE clause"
--
-- The intent is to clear baselines_cache before recomputing it.
-- Use an explicit WHERE predicate so pg_safeupdate allows the
-- statement while preserving MVCC reads during the refresh.
-- =============================================================

create or replace function public.refresh_baselines()
returns void as $$
begin
  delete from public.baselines_cache where true;

  with recent as (
    select *
    from public.velocity_records
    where contributed_at > now() - interval '90 days'
      and record_unit = 'work_item'
  )
  insert into public.baselines_cache (
    task_type, project_loc_bucket, model,
    sample_count, median_seconds, p25_seconds, p75_seconds,
    p10_seconds, p90_seconds, avg_tool_calls, avg_files_edited,
    volatility
  )
  select
    task_type, null, null,
    count(*),
    percentile_cont(0.50) within group (order by duration_seconds)::integer,
    percentile_cont(0.25) within group (order by duration_seconds)::integer,
    percentile_cont(0.75) within group (order by duration_seconds)::integer,
    percentile_cont(0.10) within group (order by duration_seconds)::integer,
    percentile_cont(0.90) within group (order by duration_seconds)::integer,
    round(avg(tool_calls), 1),
    round(avg(files_edited), 1),
    case
      when (percentile_cont(0.75) within group (order by duration_seconds) -
            percentile_cont(0.25) within group (order by duration_seconds)) /
           nullif(percentile_cont(0.50) within group (order by duration_seconds), 0) > 1.5
      then 'high'
      when (percentile_cont(0.75) within group (order by duration_seconds) -
            percentile_cont(0.25) within group (order by duration_seconds)) /
           nullif(percentile_cont(0.50) within group (order by duration_seconds), 0) > 0.7
      then 'medium'
      else 'low'
    end
  from recent
  group by task_type
  having count(*) >= 10;

  with recent as (
    select *
    from public.velocity_records
    where contributed_at > now() - interval '90 days'
      and record_unit = 'work_item'
      and model is not null
  )
  insert into public.baselines_cache (
    task_type, project_loc_bucket, model,
    sample_count, median_seconds, p25_seconds, p75_seconds,
    p10_seconds, p90_seconds, avg_tool_calls, avg_files_edited,
    volatility
  )
  select
    task_type, null, model,
    count(*),
    percentile_cont(0.50) within group (order by duration_seconds)::integer,
    percentile_cont(0.25) within group (order by duration_seconds)::integer,
    percentile_cont(0.75) within group (order by duration_seconds)::integer,
    percentile_cont(0.10) within group (order by duration_seconds)::integer,
    percentile_cont(0.90) within group (order by duration_seconds)::integer,
    round(avg(tool_calls), 1),
    round(avg(files_edited), 1),
    case
      when (percentile_cont(0.75) within group (order by duration_seconds) -
            percentile_cont(0.25) within group (order by duration_seconds)) /
           nullif(percentile_cont(0.50) within group (order by duration_seconds), 0) > 1.5
      then 'high'
      when (percentile_cont(0.75) within group (order by duration_seconds) -
            percentile_cont(0.25) within group (order by duration_seconds)) /
           nullif(percentile_cont(0.50) within group (order by duration_seconds), 0) > 0.7
      then 'medium'
      else 'low'
    end
  from recent
  group by task_type, model
  having count(*) >= 5;

  with recent as (
    select *
    from public.velocity_records
    where contributed_at > now() - interval '90 days'
      and record_unit = 'work_item'
      and project_loc_bucket is not null
  )
  insert into public.baselines_cache (
    task_type, project_loc_bucket, model,
    sample_count, median_seconds, p25_seconds, p75_seconds,
    p10_seconds, p90_seconds, avg_tool_calls, avg_files_edited,
    volatility
  )
  select
    task_type, project_loc_bucket, null,
    count(*),
    percentile_cont(0.50) within group (order by duration_seconds)::integer,
    percentile_cont(0.25) within group (order by duration_seconds)::integer,
    percentile_cont(0.75) within group (order by duration_seconds)::integer,
    percentile_cont(0.10) within group (order by duration_seconds)::integer,
    percentile_cont(0.90) within group (order by duration_seconds)::integer,
    round(avg(tool_calls), 1),
    round(avg(files_edited), 1),
    case
      when (percentile_cont(0.75) within group (order by duration_seconds) -
            percentile_cont(0.25) within group (order by duration_seconds)) /
           nullif(percentile_cont(0.50) within group (order by duration_seconds), 0) > 1.5
      then 'high'
      when (percentile_cont(0.75) within group (order by duration_seconds) -
            percentile_cont(0.25) within group (order by duration_seconds)) /
           nullif(percentile_cont(0.50) within group (order by duration_seconds), 0) > 0.7
      then 'medium'
      else 'low'
    end
  from recent
  group by task_type, project_loc_bucket
  having count(*) >= 5;

  with recent as (
    select *
    from public.velocity_records
    where contributed_at > now() - interval '90 days'
      and record_unit = 'work_item'
      and project_loc_bucket is not null
      and model is not null
  )
  insert into public.baselines_cache (
    task_type, project_loc_bucket, model,
    sample_count, median_seconds, p25_seconds, p75_seconds,
    p10_seconds, p90_seconds, avg_tool_calls, avg_files_edited,
    volatility
  )
  select
    task_type, project_loc_bucket, model,
    count(*),
    percentile_cont(0.50) within group (order by duration_seconds)::integer,
    percentile_cont(0.25) within group (order by duration_seconds)::integer,
    percentile_cont(0.75) within group (order by duration_seconds)::integer,
    percentile_cont(0.10) within group (order by duration_seconds)::integer,
    percentile_cont(0.90) within group (order by duration_seconds)::integer,
    round(avg(tool_calls), 1),
    round(avg(files_edited), 1),
    case
      when (percentile_cont(0.75) within group (order by duration_seconds) -
            percentile_cont(0.25) within group (order by duration_seconds)) /
           nullif(percentile_cont(0.50) within group (order by duration_seconds), 0) > 1.5
      then 'high'
      when (percentile_cont(0.75) within group (order by duration_seconds) -
            percentile_cont(0.25) within group (order by duration_seconds)) /
           nullif(percentile_cont(0.50) within group (order by duration_seconds), 0) > 0.7
      then 'medium'
      else 'low'
    end
  from recent
  group by task_type, project_loc_bucket, model
  having count(*) >= 5;
end;
$$ language plpgsql security definer;

revoke all on function public.refresh_baselines() from public;
grant execute on function public.refresh_baselines() to service_role;
