-- ============================================================
-- MOGA Scheduler — Initial Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- ── Extensions ───────────────────────────────────────────────
-- uuid_generate_v4() is available by default in Supabase

-- ── User profiles (role management) ──────────────────────────
-- One row per auth.users entry.
-- role: 'admin' | 'viewer'  (extend as needed)
-- physician_id: optional FK for per-physician login in future

CREATE TABLE IF NOT EXISTS profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role          TEXT        NOT NULL DEFAULT 'viewer'
                            CHECK (role IN ('admin', 'viewer')),
  physician_id  INT         NULL,  -- future: FK to physicians.id
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create a viewer profile on new signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'viewer')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Physicians ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS physicians (
  id            INT         PRIMARY KEY,
  name          TEXT        NOT NULL,
  color         TEXT        NOT NULL DEFAULT '#2A9D87',
  type          TEXT        NOT NULL DEFAULT 'physician',
  in_call_pool  BOOLEAN     NOT NULL DEFAULT true,
  in_clinic     BOOLEAN     NOT NULL DEFAULT true,
  custom_hours  JSONB       NULL,     -- {Mon:{enabled,open,close}, ...} or null
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Cross-coverage entities ───────────────────────────────────
CREATE TABLE IF NOT EXISTS cross_coverage (
  id            INT         PRIMARY KEY,
  name          TEXT        NOT NULL,
  color         TEXT        NOT NULL DEFAULT '#065F46',
  type          TEXT        NOT NULL DEFAULT 'cross-coverage',
  active        BOOLEAN     NOT NULL DEFAULT true,
  cover_days    INT[]       NOT NULL DEFAULT '{}',  -- [0,5,6] = Sun,Fri,Sat
  shift_start   TEXT        NOT NULL DEFAULT '19:00',
  shift_end     TEXT        NOT NULL DEFAULT '07:00',
  shift_hours   INT         NOT NULL DEFAULT 12,
  has_split     BOOLEAN     NOT NULL DEFAULT false,
  split_start   TEXT        NOT NULL DEFAULT '07:00',
  split_end     TEXT        NOT NULL DEFAULT '19:00',
  split_hours   INT         NOT NULL DEFAULT 12,
  split_post_call BOOLEAN   NOT NULL DEFAULT false,
  notes         TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── PTO list ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pto_list (
  id            SERIAL      PRIMARY KEY,
  doc_id        INT         NOT NULL,
  start         DATE        NOT NULL,  -- inclusive
  "end"         DATE        NOT NULL,  -- inclusive
  type          TEXT        NOT NULL DEFAULT 'pto',  -- 'pto' | 'no-call'
  note          TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── No-call date-range overrides ─────────────────────────────
CREATE TABLE IF NOT EXISTS no_call_list (
  id            SERIAL      PRIMARY KEY,
  doc_id        INT         NOT NULL,
  start         DATE        NOT NULL,
  "end"         DATE        NOT NULL,
  type          TEXT        NOT NULL DEFAULT 'no-call',
  note          TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Permanent no-call dates (annual recurring) ────────────────
CREATE TABLE IF NOT EXISTS perm_no_call (
  id            SERIAL      PRIMARY KEY,
  doc_id        INT         NOT NULL,
  month         INT         NOT NULL CHECK (month BETWEEN 1 AND 12),
  day           INT         NOT NULL CHECK (day BETWEEN 1 AND 31),
  reason        TEXT        NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Audit log ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id            SERIAL      PRIMARY KEY,
  ts            TIMESTAMPTZ NOT NULL DEFAULT now(),
  action        TEXT        NOT NULL,  -- 'regenerate' | 'manual_edit' | 'undo' | etc.
  user_id       UUID        NULL REFERENCES auth.users(id),
  payload       JSONB       NULL       -- diff summary or details
);

-- ── Settings (key/value store for JSON blobs) ─────────────────
-- Used for: clinic_hours, holidays, ad_hoc_closures, frozen_sched,
--           overrides, last_frozen, shift_override_hours,
--           freeze_months, sched_horizon
CREATE TABLE IF NOT EXISTS settings (
  key           TEXT        PRIMARY KEY,
  value         JSONB       NOT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pto_list_doc    ON pto_list(doc_id);
CREATE INDEX IF NOT EXISTS idx_no_call_doc     ON no_call_list(doc_id);
CREATE INDEX IF NOT EXISTS idx_perm_no_call_doc ON perm_no_call(doc_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_ts    ON audit_log(ts DESC);

-- ── Updated-at trigger function ───────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_physicians_updated_at
  BEFORE UPDATE ON physicians
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cross_coverage_updated_at
  BEFORE UPDATE ON cross_coverage
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE physicians  ENABLE ROW LEVEL SECURITY;
ALTER TABLE cross_coverage ENABLE ROW LEVEL SECURITY;
ALTER TABLE pto_list    ENABLE ROW LEVEL SECURITY;
ALTER TABLE no_call_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE perm_no_call ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log   ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings    ENABLE ROW LEVEL SECURITY;

-- Helper: is the current user an admin?
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ── profiles ─────────────────────────────────────────────────
-- Users can read their own profile; admins can read all
CREATE POLICY "profiles: own read"
  ON profiles FOR SELECT
  USING (id = auth.uid() OR is_admin());

-- Only admins can update roles
CREATE POLICY "profiles: admin write"
  ON profiles FOR UPDATE
  USING (is_admin());

-- ── physicians: admins write, everyone reads ──────────────────
CREATE POLICY "physicians: read"
  ON physicians FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "physicians: admin write"
  ON physicians FOR ALL
  USING (is_admin());

-- ── cross_coverage ────────────────────────────────────────────
CREATE POLICY "cross_coverage: read"
  ON cross_coverage FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "cross_coverage: admin write"
  ON cross_coverage FOR ALL
  USING (is_admin());

-- ── pto_list ──────────────────────────────────────────────────
CREATE POLICY "pto_list: read"
  ON pto_list FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "pto_list: admin write"
  ON pto_list FOR ALL
  USING (is_admin());

-- ── no_call_list ──────────────────────────────────────────────
CREATE POLICY "no_call_list: read"
  ON no_call_list FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "no_call_list: admin write"
  ON no_call_list FOR ALL
  USING (is_admin());

-- ── perm_no_call ──────────────────────────────────────────────
CREATE POLICY "perm_no_call: read"
  ON perm_no_call FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "perm_no_call: admin write"
  ON perm_no_call FOR ALL
  USING (is_admin());

-- ── audit_log: admins only ────────────────────────────────────
CREATE POLICY "audit_log: admin read"
  ON audit_log FOR SELECT
  USING (is_admin());

CREATE POLICY "audit_log: admin insert"
  ON audit_log FOR INSERT
  WITH CHECK (is_admin());

-- ── settings: admins write, authenticated users read ─────────
CREATE POLICY "settings: read"
  ON settings FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "settings: admin write"
  ON settings FOR ALL
  USING (is_admin());

-- ============================================================
-- Seed: promote the first user to admin
-- Run this AFTER creating your first user via Supabase Auth UI:
--
--   UPDATE profiles SET role = 'admin'
--   WHERE id = (SELECT id FROM auth.users ORDER BY created_at LIMIT 1);
--
-- ============================================================
