'use client';

import { useEffect, useState } from 'react';
import { useToast } from './Toast';
import { apiFetch } from '../lib/api';

// Modal for editing the citizen's mutable medical fields:
// allergies, chronic condition, implanted-device flag.
// Blood group stays read-only — it's set at signup.
//
// Props:
//   initial: { allergies?, chronicCondition?, implantDevice? }
//   onClose():       dismiss without saving
//   onSaved(updated): called after a successful PATCH with the new values
export default function EditMedicalModal({ initial, onClose, onSaved }) {
  const toast = useToast();

  const seedAllergies = initial?.allergies || '';
  const seedChronic = initial?.chronicCondition || '';
  const seedImplant = Boolean(initial?.implantDevice);

  const [hasAllergies, setHasAllergies] = useState(!!seedAllergies);
  const [allergies, setAllergies] = useState(seedAllergies);
  const [hasChronic, setHasChronic] = useState(!!seedChronic);
  const [chronicCondition, setChronicCondition] = useState(seedChronic);
  const [implantDevice, setImplantDevice] = useState(seedImplant);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        allergies: hasAllergies ? allergies.trim() || null : null,
        chronicCondition: hasChronic ? chronicCondition.trim() || null : null,
        implantDevice,
      };
      const res = await apiFetch('/citizens/me/medical', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Could not update medical info', { variant: 'error' });
        return;
      }
      toast('Medical info updated');
      onSaved?.(data.citizen);
      onClose();
    } catch (err) {
      console.error('update medical failed:', err);
      toast('Network error', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-card border border-navy-100 bg-white shadow-spaers-lg">
        <div className="flex items-start justify-between border-b border-navy-100 px-6 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-red">
              Medical
            </p>
            <h3 className="mt-1 text-lg font-extrabold text-navy">
              Edit medical info
            </h3>
            <p className="mt-1 text-xs text-muted">
              Update what responders see in the event of an emergency.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted transition-colors hover:text-navy"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5 px-6 py-6">
          <ToggleField
            label="Allergies"
            hint="Drugs, foods, or substances we should never give you."
            checked={hasAllergies}
            onCheckedChange={setHasAllergies}
            value={allergies}
            onValueChange={setAllergies}
            placeholder="e.g. penicillin, peanuts"
          />

          <ToggleField
            label="Chronic condition"
            hint="Long-term diagnoses responders should know about."
            checked={hasChronic}
            onCheckedChange={setHasChronic}
            value={chronicCondition}
            onValueChange={setChronicCondition}
            placeholder="e.g. asthma, diabetes"
          />

          <label className="flex items-start gap-3 rounded-btn border border-navy-100 bg-ice px-3 py-3">
            <input
              type="checkbox"
              checked={implantDevice}
              onChange={(e) => setImplantDevice(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-navy-200 text-red focus:ring-0"
            />
            <span className="flex-1 text-sm text-navy">
              <span className="block font-semibold">
                I have an implanted medical device
              </span>
              <span className="block text-xs text-muted">
                Pacemaker, insulin pump, defibrillator, etc.
              </span>
            </span>
          </label>

          <div className="flex items-center justify-end gap-2 border-t border-navy-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-btn border border-navy-100 bg-white px-4 py-2 text-sm font-semibold text-navy-600 transition-colors hover:border-red hover:text-red disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-btn bg-navy px-4 py-2 text-sm font-bold text-white shadow-spaers-sm transition-colors hover:bg-navy-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ToggleField({
  label,
  hint,
  checked,
  onCheckedChange,
  value,
  onValueChange,
  placeholder,
}) {
  return (
    <div
      className={[
        'rounded-btn border bg-white p-3 transition-colors',
        checked ? 'border-red/40' : 'border-navy-100',
      ].join(' ')}
    >
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-navy-200 text-red focus:ring-0"
        />
        <span className="flex-1">
          <span className="block text-[12px] font-semibold uppercase tracking-[0.1em] text-navy-600">
            {label}
          </span>
          <span className="mt-0.5 block text-[11px] text-muted">{hint}</span>
        </span>
      </label>
      {checked && (
        <textarea
          rows={2}
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className="mt-3 w-full resize-none rounded-btn border border-navy-100 bg-white px-3 py-2 text-sm text-navy outline-none transition-colors placeholder:text-navy-300 focus:border-red"
        />
      )}
    </div>
  );
}
