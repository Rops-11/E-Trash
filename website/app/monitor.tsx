"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import DeviceControls from "./device-controls";
import type { Settings } from "../lib/settings-schema";
type Status = {
  connected: boolean;
  reason?: string;
  device_id?: string;
  received_at?: number;
  distance_valid?: boolean;
  environment_valid?: boolean;
  fill_percent?: number | null;
  distance_m?: number | null;
  temperature_c?: number | null;
  humidity_percent?: number | null;
  bin_full?: boolean;
  environment_alert?: boolean;
  applied_settings?: Settings;
};
export default function Monitor() {
  const [data, setData] = useState<Status | null>(null),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const load = useCallback(async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      const r = await fetch("/api/v1/status", {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) throw Error("Unavailable");
      setData(await r.json());
      setError(false);
    } catch {
      setData(null);
      setError(true);
    } finally {
      setBusy(false);
      pending.current = false;
    }
  }, []);
  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);
  const bin = data?.connected && data.distance_valid,
    env = data?.connected && data.environment_valid;
  const alert = !!(
    data?.connected &&
    (data.bin_full || data.environment_alert)
  );
  const fill = bin ? data?.fill_percent : null,
    temp = env ? data?.temperature_c : null,
    humidity = env ? data?.humidity_percent : null;
  const state = error
    ? "Connection unavailable"
    : !data
      ? "Connecting…"
      : data.reason === "not_paired"
        ? "Ready to pair your ESP32"
        : !data.connected
          ? "Device offline"
          : alert
            ? "Attention needed"
            : !bin || !env
              ? "Check your sensors"
              : "Everything is in range";
  return (
    <main>
      <header>
        <div className="brand">
          <span className="brand-icon">↻</span> E-Trash{" "}
          <span className="brand-sub">MONITOR</span>
        </div>
        <div className={"badge " + (data?.connected ? "online" : "")}>
          <span />
          {data?.connected
            ? "Device online"
            : data?.reason === "not_paired"
              ? "Awaiting device"
              : error
                ? "Connection lost"
                : "Not connected"}
        </div>
      </header>
      <div className="intro">
        <div className="eyebrow">YOUR SMART BIN, FROM ANYWHERE</div>
        <h1>
          A clearer view
          <br />
          of your bin.
        </h1>
        <p>
          Keep an eye on fill level, temperature and humidity.
          <br className="desktop" /> One connected bin. Everything in view.
        </p>
        <span className="hardware">ESP32-WROOM-32 · Wi-Fi telemetry</span>
      </div>
      <section className="grid" aria-label="Live sensor readings">
        <article className="card fill-card">
          <div className="label">
            BIN FILL LEVEL <span>01</span>
          </div>
          <div className="reading">
            {fill != null ? Math.round(fill) : "—"}
            <small>{fill != null ? "%" : ""}</small>
          </div>
          <div
            className="meter"
            role="meter"
            aria-label="Bin fill level"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={fill ?? undefined}
          >
            <div
              style={{
                width: `${fill ?? 0}%`,
                background: alert ? "#cc8144" : undefined,
              }}
            />
          </div>
          <div className="range">
            <span>Empty</span>
            <span>Full</span>
          </div>
          <p>
            {bin && data?.distance_m != null
              ? `${(data.distance_m * 100).toFixed(1)} cm to contents`
              : "Waiting for a valid distance reading"}
          </p>
        </article>
        <article className="card">
          <div className="label">
            TEMPERATURE <span>02</span>
          </div>
          <div className="reading compact">
            {temp != null ? temp.toFixed(1) : "—"}
            <small>{temp != null ? "°C" : ""}</small>
          </div>
          <div className="sensor-line" />
          <p>
            Alert above {data?.applied_settings?.temperature_threshold_c ?? 45}{" "}
            °C
          </p>
        </article>
        <article className="card">
          <div className="label">
            HUMIDITY <span>03</span>
          </div>
          <div className="reading compact">
            {humidity != null ? Math.round(humidity) : "—"}
            <small>{humidity != null ? "%" : ""}</small>
          </div>
          <div className="sensor-line" />
          <p>
            Alert above{" "}
            {data?.applied_settings?.humidity_threshold_percent ?? 85}%
          </p>
        </article>
      </section>
      <section
        className={"status " + (alert ? "warning" : "")}
        aria-live="polite"
      >
        <div className="status-icon">
          {alert ? "!" : data?.connected ? "✓" : "○"}
        </div>
        <div>
          <h2>{state}</h2>
          <p>
            {error
              ? "Refresh to reconnect to your dashboard."
              : data?.reason === "not_paired"
                ? "Your private dashboard is ready. Connect your ESP32 to start receiving real readings."
                : !data?.connected
                  ? "Readings appear after your ESP32 sends an update. Old values are cleared when the device goes offline."
                  : alert
                    ? [
                        data?.bin_full ? "Bin is full. Please empty it." : "",
                        data?.environment_alert
                          ? "Temperature or humidity is above its threshold."
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" ")
                    : !bin || !env
                      ? "One or more sensor readings are missing or stale. Check the sensor wiring."
                      : "Fill level and environmental readings are within the configured limits."}
          </p>
        </div>
      </section>
      <footer>
        <span>
          {data?.received_at
            ? `Last device update ${new Date(data.received_at).toLocaleString()}`
            : "No device readings received yet"}
        </span>
        <button onClick={load} disabled={busy}>
          {busy ? "Checking…" : "Refresh readings ↗"}
        </button>
      </footer>
      <DeviceControls
        applied={data?.applied_settings}
        connected={!!data?.connected}
      />
      <details>
        <summary>Connect your device</summary>
        <div className="setup">
          <p>
            Use the accompanying ESP32 XOD project. Set your Wi-Fi details, your
            deployed website’s HTTPS origin, and its device API token in the
            cloud node. Upload only after confirming the ESP32 toolchain and
            wiring.
          </p>
          <p>
            Telemetry endpoint: <code>/api/v1/telemetry</code> · Every 30
            seconds · Private access · No router port forwarding
          </p>
          <p>
            The website is ready before the hardware is paired. No sample
            readings are presented as live data. Your latest reading is
            retained; history is not recorded.
          </p>
        </div>
      </details>
      <form action="/api/auth/logout" method="post">
        <button type="submit">Sign out</button>
      </form>
      <div className="bottom">
        <span>E-TRASH / CONNECTED MONITORING</span>
        <span>Remote controls · Private access</span>
      </div>
    </main>
  );
}
