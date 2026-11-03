-- ==============================================================================
-- Wosandi / Zenith Smart Study Engine — Mock Data Management Script
-- Provides a 1-Command Mock Data Deletion Function for Supabase SQL Editor
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. STORED FUNCTION: delete_all_mock_data()
-- Run this in Supabase SQL Editor to delete ALL mock data in ONE command:
-- SELECT delete_all_mock_data();
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_all_mock_data()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_registry RECORD;
  v_registry_json JSONB;
  deleted_sessions INT := 0;
  deleted_full_papers INT := 0;
  deleted_unit_papers INT := 0;
  deleted_sr_logs INT := 0;
  reset_tracker INT := 0;
  v_id UUID;
BEGIN
  -- Read registry if present
  SELECT remarks INTO v_registry
  FROM public.full_papers
  WHERE time_taken = 'APP_CONFIG_MOCK_REGISTRY'
  LIMIT 1;

  IF v_registry.remarks IS NOT NULL THEN
    BEGIN
      v_registry_json := v_registry.remarks::JSONB;
    EXCEPTION WHEN OTHERS THEN
      v_registry_json := NULL;
    END;
  END IF;

  -- 1. Delete Study Timer Sessions tagged with [MOCK] or in registry
  IF v_registry_json ? 'session_ids' AND jsonb_array_length(v_registry_json->'session_ids') > 0 THEN
    DELETE FROM public.study_timer_sessions
    WHERE id IN (
      SELECT value::text::uuid FROM jsonb_array_elements_text(v_registry_json->'session_ids')
    ) OR unit_name LIKE '%[MOCK]%';
  ELSE
    DELETE FROM public.study_timer_sessions
    WHERE unit_name LIKE '%[MOCK]%';
  END IF;
  GET DIAGNOSTICS deleted_sessions = ROW_COUNT;

  -- 2. Delete Unit Papers from registry
  IF v_registry_json ? 'unit_paper_ids' AND jsonb_array_length(v_registry_json->'unit_paper_ids') > 0 THEN
    DELETE FROM public.unit_papers
    WHERE id IN (
      SELECT value::text::uuid FROM jsonb_array_elements_text(v_registry_json->'unit_paper_ids')
    );
    GET DIAGNOSTICS deleted_unit_papers = ROW_COUNT;
  END IF;

  -- 3. Delete Spaced Repetition Logs from registry
  IF v_registry_json ? 'sr_log_ids' AND jsonb_array_length(v_registry_json->'sr_log_ids') > 0 THEN
    DELETE FROM public.spaced_repetition_log
    WHERE id IN (
      SELECT value::text::uuid FROM jsonb_array_elements_text(v_registry_json->'sr_log_ids')
    );
    GET DIAGNOSTICS deleted_sr_logs = ROW_COUNT;
  END IF;

  -- 4. Delete Full Papers tagged with [MOCK_DATA] or in registry
  IF v_registry_json ? 'full_paper_ids' AND jsonb_array_length(v_registry_json->'full_paper_ids') > 0 THEN
    DELETE FROM public.full_papers
    WHERE id IN (
      SELECT value::text::uuid FROM jsonb_array_elements_text(v_registry_json->'full_paper_ids')
    ) OR remarks LIKE '%[MOCK_DATA]%';
  ELSE
    DELETE FROM public.full_papers
    WHERE remarks LIKE '%[MOCK_DATA]%';
  END IF;
  GET DIAGNOSTICS deleted_full_papers = ROW_COUNT;

  -- 5. Reset mock tracker progress units back to uncompleted
  IF v_registry_json ? 'tracker_syl_ids' AND jsonb_array_length(v_registry_json->'tracker_syl_ids') > 0 THEN
    UPDATE public.tracker_progress
    SET lesson_done = false,
        lesson_done_at = NULL,
        lesson_days = 0,
        hw_done = false,
        hw_done_at = NULL,
        hw_days = 0,
        papers_done_count = 0,
        paper_days = 0,
        updated_at = NOW()
    WHERE syllabus_id IN (
      SELECT value::text::uuid FROM jsonb_array_elements_text(v_registry_json->'tracker_syl_ids')
    );
    GET DIAGNOSTICS reset_tracker = ROW_COUNT;
  END IF;

  -- 6. Delete Mock Registry Row
  DELETE FROM public.full_papers
  WHERE time_taken = 'APP_CONFIG_MOCK_REGISTRY';

  RETURN format('SUCCESS: Deleted %s study sessions, %s unit papers, %s full exam papers, %s spaced repetition logs, and reset %s tracker units.',
    deleted_sessions, deleted_unit_papers, deleted_full_papers, deleted_sr_logs, reset_tracker);
END;
$$;

-- ==============================================================================
-- INSTRUCTIONS:
-- 1. To DELETE ALL MOCK DATA IN ONE SQL COMMAND:
--    SELECT delete_all_mock_data();
--
-- 2. To DELETE ALL MOCK DATA IN ONE TERMINAL COMMAND:
--    npm run mock:delete
--    (or: node scripts/mock-data.js delete)
-- ==============================================================================
