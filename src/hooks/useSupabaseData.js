// src/hooks/useSupabaseData.js
//
// Single hook that owns ALL persistent state I/O.
// Dual-storage pattern:
//   - SUPABASE_ENABLED=true  → read/write Supabase tables
//   - SUPABASE_ENABLED=false → fall back to window.storage (artifact/offline)
//
// The SchedulerApp reads data from this hook and calls the save* functions.
// It never touches Supabase or window.storage directly.
//
// ─── Supabase table mapping ───────────────────────────────────────────────────
//   physicians        → physicians
//   crossCoverage     → cross_coverage
//   ptoList           → pto_list
//   noCallList        → no_call_list
//   permNoCallList    → perm_no_call
//   clinicHours       → settings  (key='clinic_hours', value=jsonb)
//   holidays          → settings  (key='holidays')
//   adHocClosures     → settings  (key='ad_hoc_closures')
//   frozenSched       → settings  (key='frozen_sched')
//   overrides         → settings  (key='overrides')
//   lastFrozen        → settings  (key='last_frozen')
//   auditLog          → audit_log (append-only rows)
//   shiftOverrideHours→ settings  (key='shift_override_hours')
//   freezeMonths      → settings  (key='freeze_months')
//   schedHorizon      → settings  (key='sched_horizon')
// ──────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react';
import { supabase, SUPABASE_ENABLED } from '../config/supabase.js';
import {
  DEFAULT_PHYSICIANS,
  DEFAULT_CROSS,
  DEFAULT_CLINIC_HOURS,
  DEFAULT_PERM_NO_CALL,
  US_HOLIDAYS_2025_2026,
} from '../lib/defaults.js';

const STORAGE_KEY = 'moga-scheduler-v2'; // legacy key — offline fallback only

// ─── helpers ──────────────────────────────────────────────────────────────────

async function storageFallbackLoad() {
  try {
    const r = await window.storage.get(STORAGE_KEY);
    return r ? JSON.parse(r.value) : null;
  } catch {
    return null;
  }
}

async function storageFallbackSave(payload) {
  try {
    await window.storage.set(STORAGE_KEY, JSON.stringify(payload));
  } catch {}
}

// Upsert a key/value row in the settings table
async function upsertSetting(key, value) {
  const { error } = await supabase
    .from('settings')
    .upsert({ key, value }, { onConflict: 'key' });
  if (error) console.error(`upsertSetting(${key}):`, error.message);
}

async function loadSetting(key, fallback = null) {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) { console.error(`loadSetting(${key}):`, error.message); return fallback; }
  return data?.value ?? fallback;
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useSupabaseData() {
  // ── core state ──────────────────────────────────────────────────────────────
  const [loaded,            setLoaded]           = useState(false);
  const [physicians,        setPhysicians]        = useState(DEFAULT_PHYSICIANS);
  const [crossCoverage,     setCrossCoverage]     = useState(DEFAULT_CROSS);
  const [ptoList,           setPtoList]           = useState([]);
  const [noCallList,        setNoCallList]        = useState([]);
  const [permNoCallList,    setPermNoCallList]    = useState(DEFAULT_PERM_NO_CALL);
  const [clinicHours,       setClinicHours]       = useState(DEFAULT_CLINIC_HOURS);
  const [holidays,          setHolidays]          = useState(US_HOLIDAYS_2025_2026);
  const [adHocClosures,     setAdHocClosures]     = useState([]);
  const [frozenSched,       setFrozenSched]       = useState({});
  const [overrides,         setOverrides]         = useState({});
  const [lastFrozen,        setLastFrozen]        = useState(null);
  const [auditLog,          setAuditLog]          = useState([]);
  const [shiftOverrideHours,setShiftOverrideHours]= useState({});
  const [freezeMonths,      setFreezeMonths]      = useState(2);
  const [schedHorizon,      setSchedHorizon]      = useState(6);

  // ── load on mount ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      if (SUPABASE_ENABLED) {
        await loadFromSupabase();
      } else {
        await loadFromStorage();
      }
      setLoaded(true);
    })();
  }, []);

  async function loadFromSupabase() {
    try {
      const [
        { data: phys },
        { data: cc },
        { data: pto },
        { data: noCall },
        { data: pnc },
        chVal,
        holVal,
        ahVal,
        fsVal,
        ovVal,
        lfVal,
        { data: auditRows },
        sohVal,
        fmVal,
        shVal,
      ] = await Promise.all([
        supabase.from('physicians').select('*').order('id'),
        supabase.from('cross_coverage').select('*').order('id'),
        supabase.from('pto_list').select('*').order('id'),
        supabase.from('no_call_list').select('*').order('id'),
        supabase.from('perm_no_call').select('*').order('id'),
        loadSetting('clinic_hours', DEFAULT_CLINIC_HOURS),
        loadSetting('holidays', US_HOLIDAYS_2025_2026),
        loadSetting('ad_hoc_closures', []),
        loadSetting('frozen_sched', {}),
        loadSetting('overrides', {}),
        loadSetting('last_frozen', null),
        supabase.from('audit_log').select('*').order('ts', { ascending: false }).limit(500),
        loadSetting('shift_override_hours', {}),
        loadSetting('freeze_months', 2),
        loadSetting('sched_horizon', 6),
      ]);

      if (phys?.length)   setPhysicians(phys);
      if (cc?.length)     setCrossCoverage(cc);
      if (pto?.length)    setPtoList(pto);
      if (noCall?.length) setNoCallList(noCall);
      if (pnc?.length)    setPermNoCallList(pnc);
      setClinicHours(chVal);
      setHolidays(holVal);
      setAdHocClosures(ahVal);
      setFrozenSched(fsVal);
      setOverrides(ovVal);
      setLastFrozen(lfVal);
      if (auditRows?.length) setAuditLog(auditRows);
      setShiftOverrideHours(sohVal);
      setFreezeMonths(fmVal);
      setSchedHorizon(shVal);
    } catch (err) {
      console.error('loadFromSupabase error:', err);
    }
  }

  async function loadFromStorage() {
    const d = await storageFallbackLoad();
    if (!d) return;
    if (d.physicians)       setPhysicians(d.physicians);
    if (d.crossCoverage)    setCrossCoverage(d.crossCoverage);
    if (d.ptoList)          setPtoList(d.ptoList);
    if (d.noCallList)       setNoCallList(d.noCallList);
    if (d.permNoCallList)   setPermNoCallList(d.permNoCallList);
    if (d.overrides)        setOverrides(d.overrides);
    if (d.frozenSched)      setFrozenSched(d.frozenSched);
    if (d.lastFrozen)       setLastFrozen(d.lastFrozen);
    if (d.clinicHours) {
      const ch = d.clinicHours;
      if (!ch.weekdays) {
        const allFifteen = ['Mon','Tue','Wed','Thu','Fri'].every(day => ch[day]?.close === '15:00');
        setClinicHours(allFifteen ? DEFAULT_CLINIC_HOURS : ch);
      }
    }
    if (d.holidays)         setHolidays(d.holidays);
    if (d.adHocClosures)    setAdHocClosures(d.adHocClosures);
    if (d.auditLog)         setAuditLog(d.auditLog);
    if (d.shiftOverrideHours) setShiftOverrideHours(d.shiftOverrideHours);
    if (d.freezeMonths != null) setFreezeMonths(d.freezeMonths);
    if (d.schedHorizon != null) setSchedHorizon(d.schedHorizon);
  }

  // ── auto-save for offline mode ───────────────────────────────────────────────
  // Supabase saves happen via explicit save* functions below (called on user action).
  // Offline mode mirrors the original behavior: save everything on any state change.
  useEffect(() => {
    if (!loaded || SUPABASE_ENABLED) return;
    storageFallbackSave({
      physicians, crossCoverage, ptoList, noCallList, permNoCallList,
      overrides, frozenSched, lastFrozen, clinicHours, holidays,
      adHocClosures, auditLog, shiftOverrideHours, freezeMonths, schedHorizon,
    });
  }, [
    loaded, physicians, crossCoverage, ptoList, noCallList, permNoCallList,
    overrides, frozenSched, lastFrozen, clinicHours, holidays,
    adHocClosures, auditLog, shiftOverrideHours, freezeMonths, schedHorizon,
  ]);

  // ── save functions (Supabase) ────────────────────────────────────────────────
  // Each save function is an async upsert.
  // In offline mode they update local state only — the useEffect above persists.

  const savePhysicians = useCallback(async (next) => {
    setPhysicians(next);
    if (!SUPABASE_ENABLED) return;
    // Upsert all — simple approach; optimize with diff if performance matters
    for (const p of next) {
      const { error } = await supabase.from('physicians').upsert(p, { onConflict: 'id' });
      if (error) console.error('savePhysicians:', error.message);
    }
    // Delete removed physicians
    const nextIds = next.map(p => p.id);
    const { data: existing } = await supabase.from('physicians').select('id');
    const toDelete = (existing || []).map(r => r.id).filter(id => !nextIds.includes(id));
    if (toDelete.length) await supabase.from('physicians').delete().in('id', toDelete);
  }, []);

  const saveCrossCoverage = useCallback(async (next) => {
    setCrossCoverage(next);
    if (!SUPABASE_ENABLED) return;
    for (const c of next) {
      const { error } = await supabase.from('cross_coverage').upsert(c, { onConflict: 'id' });
      if (error) console.error('saveCrossCoverage:', error.message);
    }
    const nextIds = next.map(c => c.id);
    const { data: existing } = await supabase.from('cross_coverage').select('id');
    const toDelete = (existing || []).map(r => r.id).filter(id => !nextIds.includes(id));
    if (toDelete.length) await supabase.from('cross_coverage').delete().in('id', toDelete);
  }, []);

  const savePtoList = useCallback(async (next) => {
    setPtoList(next);
    if (!SUPABASE_ENABLED) return;
    // Replace strategy: delete all then insert (PTO lists are small)
    await supabase.from('pto_list').delete().neq('id', 0);
    if (next.length) {
      const { error } = await supabase.from('pto_list').insert(next);
      if (error) console.error('savePtoList:', error.message);
    }
  }, []);

  const saveNoCallList = useCallback(async (next) => {
    setNoCallList(next);
    if (!SUPABASE_ENABLED) return;
    await supabase.from('no_call_list').delete().neq('id', 0);
    if (next.length) {
      const { error } = await supabase.from('no_call_list').insert(next);
      if (error) console.error('saveNoCallList:', error.message);
    }
  }, []);

  const savePermNoCallList = useCallback(async (next) => {
    setPermNoCallList(next);
    if (!SUPABASE_ENABLED) return;
    await supabase.from('perm_no_call').delete().neq('id', 0);
    if (next.length) {
      const { error } = await supabase.from('perm_no_call').insert(next);
      if (error) console.error('savePermNoCallList:', error.message);
    }
  }, []);

  const saveClinicHours    = useCallback(async (next) => { setClinicHours(next);    if (SUPABASE_ENABLED) await upsertSetting('clinic_hours', next); }, []);
  const saveHolidays       = useCallback(async (next) => { setHolidays(next);       if (SUPABASE_ENABLED) await upsertSetting('holidays', next); }, []);
  const saveAdHocClosures  = useCallback(async (next) => { setAdHocClosures(next);  if (SUPABASE_ENABLED) await upsertSetting('ad_hoc_closures', next); }, []);
  const saveFrozenSched    = useCallback(async (next) => { setFrozenSched(next);    if (SUPABASE_ENABLED) await upsertSetting('frozen_sched', next); }, []);
  const saveOverrides      = useCallback(async (next) => { setOverrides(next);      if (SUPABASE_ENABLED) await upsertSetting('overrides', next); }, []);
  const saveLastFrozen     = useCallback(async (next) => { setLastFrozen(next);     if (SUPABASE_ENABLED) await upsertSetting('last_frozen', next); }, []);
  const saveShiftOverrideHours = useCallback(async (next) => { setShiftOverrideHours(next); if (SUPABASE_ENABLED) await upsertSetting('shift_override_hours', next); }, []);
  const saveFreezeMonths   = useCallback(async (next) => { setFreezeMonths(next);   if (SUPABASE_ENABLED) await upsertSetting('freeze_months', next); }, []);
  const saveSchedHorizon   = useCallback(async (next) => { setSchedHorizon(next);   if (SUPABASE_ENABLED) await upsertSetting('sched_horizon', next); }, []);

  const appendAuditLog = useCallback(async (entry) => {
    const next = [entry, ...auditLog].slice(0, 500);
    setAuditLog(next);
    if (!SUPABASE_ENABLED) return;
    const { error } = await supabase.from('audit_log').insert(entry);
    if (error) console.error('appendAuditLog:', error.message);
  }, [auditLog]);

  return {
    // state
    loaded, physicians, crossCoverage, ptoList, noCallList, permNoCallList,
    clinicHours, holidays, adHocClosures, frozenSched, overrides,
    lastFrozen, auditLog, shiftOverrideHours, freezeMonths, schedHorizon,
    // setters (pass-through for UI-only ephemeral state that doesn't need saving)
    setPhysicians, setCrossCoverage, setPtoList, setNoCallList,
    setPermNoCallList, setClinicHours, setHolidays, setAdHocClosures,
    setFrozenSched, setOverrides, setLastFrozen, setAuditLog,
    setShiftOverrideHours, setFreezeMonths, setSchedHorizon,
    // save functions (write-through to Supabase or storage)
    savePhysicians, saveCrossCoverage, savePtoList, saveNoCallList,
    savePermNoCallList, saveClinicHours, saveHolidays, saveAdHocClosures,
    saveFrozenSched, saveOverrides, saveLastFrozen, appendAuditLog,
    saveShiftOverrideHours, saveFreezeMonths, saveSchedHorizon,
  };
}
