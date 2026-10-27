"use client";
import { useEffect, useState } from "react";
import {
  defaultSettings,
  settingsSchema,
  appliedSettingsSchema,
  type Settings,
} from "../lib/settings-schema";
type Props = { applied?: Settings; connected: boolean };
export default function DeviceControls({ applied, connected }: Props) {
  const [saved, setSaved] = useState<Settings | null>(null),
    [form, setForm] = useState({ ...defaultSettings }),
    [dirty, setDirty] = useState(false),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState(false);
  async function fetchSettings() {
    try {
      const r = await fetch("/api/v1/settings", { cache: "no-store" });
      if (!r.ok) throw Error();
      const s = appliedSettingsSchema.parse(await r.json());
      setSaved(s);
      setForm(s);
      setDirty(false);
      setError(false);
      setMessage("");
    } catch {
      setError(true);
      setMessage("Could not load settings. Retry before making changes.");
    }
  }
  useEffect(() => {
    fetchSettings();
  }, []);
  function change(field: keyof Settings, value: number | boolean) {
    setForm((f) => ({ ...f, [field]: value }));
    setDirty(true);
    setMessage("");
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    const { revision, ...values } = form;
    const result = settingsSchema.safeParse(values);
    if (!result.success) {
      setError(true);
      setMessage(result.error.issues[0]?.message || "Check your values.");
      return;
    }
    setSaving(true);
    setError(false);
    try {
      const r = await fetch("/api/v1/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.data),
      });
      const body = await r.json();
      if (!r.ok)
        throw Error(
          body && typeof body === "object" && "error" in body
            ? String(body.error)
            : "Save failed.",
        );
      const accepted = appliedSettingsSchema.parse(body);
      setSaved(accepted);
      setForm(accepted);
      setDirty(false);
      setMessage("Settings saved online. Waiting for the ESP32 to confirm.");
    } catch (e) {
      setError(true);
      setMessage(
        e instanceof Error
          ? e.message
          : "Could not save. Your changes have not been sent.",
      );
    } finally {
      setSaving(false);
    }
  }
  const confirmed = !!(
    saved &&
    applied &&
    applied.revision >= saved.revision &&
    (
      [
        "empty_distance_cm",
        "full_distance_cm",
        "temperature_threshold_c",
        "humidity_threshold_percent",
        "buzzer_enabled",
      ] as const
    ).every((key) => applied[key] === saved[key])
  );
  const field = (
    key: keyof Settings,
    label: string,
    help: string,
    min: number,
    max: number,
  ) => (
    <label className="control-field" key={key}>
      <span>{label}</span>
      <input
        type="number"
        step="0.1"
        required
        min={min}
        max={max}
        value={Number.isFinite(form[key]) ? String(form[key]) : ""}
        onChange={(e) =>
          change(key, e.target.value === "" ? NaN : Number(e.target.value))
        }
      />
      <small>{help}</small>
    </label>
  );
  return (
    <section className="controls" aria-labelledby="controls-heading">
      <div className="controls-heading">
        <div>
          <div className="eyebrow">MAKE IT FIT YOUR BIN</div>
          <h2 id="controls-heading">Device settings</h2>
        </div>
        <span
          className={
            "settings-state " +
            (confirmed && connected && !dirty ? "confirmed" : "")
          }
        >
          {dirty
            ? "Unsaved changes"
            : !saved
              ? error
                ? "Settings unavailable"
                : "Loading settings…"
              : confirmed && connected
                ? "Applied on device"
                : confirmed
                  ? "Last confirmed · device offline"
                  : "Waiting for device confirmation"}
        </span>
      </div>
      <p className="controls-intro">
        Measure downward from the ultrasonic sensor. Set the empty and full
        distances to match your bin.
      </p>
      {!saved ? (
        error ? (
          <button type="button" onClick={fetchSettings}>
            Retry loading settings
          </button>
        ) : (
          <p>Loading your saved settings…</p>
        )
      ) : (
        <form onSubmit={save}>
          <fieldset disabled={saving}>
            <legend className="sr-only">
              Bin calibration and alert thresholds
            </legend>
            <div className="controls-grid">
              {field(
                "empty_distance_cm",
                "Empty-bin distance (cm)",
                "Sensor to the bottom of an empty bin.",
                3,
                400,
              )}
              {field(
                "full_distance_cm",
                "Full-bin distance (cm)",
                "Sensor to contents at 100% fill. Minimum 2 cm.",
                2,
                399,
              )}
              {field(
                "temperature_threshold_c",
                "Temperature alert (°C)",
                "Alert when temperature rises above this value.",
                0,
                60,
              )}
              {field(
                "humidity_threshold_percent",
                "Humidity alert (%)",
                "Alert when humidity rises above this value.",
                1,
                100,
              )}
            </div>
            <label className="buzzer-control">
              <div>
                <strong>Buzzer sound</strong>
                <small>
                  Allow the bin-full buzzer to sound. LEDs and website alerts
                  stay active when muted.
                </small>
              </div>
              <input
                type="checkbox"
                role="switch"
                checked={form.buzzer_enabled}
                onChange={(e) => change("buzzer_enabled", e.target.checked)}
              />
              <span>{form.buzzer_enabled ? "Enabled" : "Muted"}</span>
            </label>
          </fieldset>
          <div className="save-row">
            <p role="status" className={error ? "form-error" : ""}>
              {(confirmed && !error && !dirty
                ? "The ESP32 has confirmed these settings."
                : message) ||
                (dirty
                  ? "You have unsaved changes."
                  : confirmed
                    ? "The ESP32 has confirmed these settings."
                    : "Saved settings will apply when the updated ESP32 firmware connects.")}
            </p>
            <button disabled={saving || !dirty} type="submit">
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </form>
      )}
      <p className="controls-note">
        Settings sync automatically while the ESP32 is online. Allow up to 90
        seconds for confirmation. The bin-full alert remains above 80% fill.
        Upload the updated firmware once to enable these controls.
      </p>
    </section>
  );
}
