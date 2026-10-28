# E-Trash — clean project

This folder contains only the current firmware, the native Next.js website source, and this guide. The existing hosted website is unchanged. This Next.js version is prepared locally and has not been deployed.

## Files

- `firmware/E-Trash ESP32.xodball` — the single XOD project for ESP32-WROOM-32, with remote settings.
- `website/` — a genuine Next.js App Router application with dashboard, device controls, password sign-in, and a Supabase PostgreSQL database.

## Run the website locally

Install **Node.js 24 LTS**. In a terminal opened inside `website`, run:

```
npm ci
npm run setup
```

Before starting the app, configure Supabase:

1. In your Supabase project, open **SQL Editor** and run the contents of `website/supabase-schema.sql`. It creates two private tables and the atomic settings-save function. It is safe to rerun and does not delete existing cloud data.
2. Keep your `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` values in `website/.env.local`.
3. Add `SUPABASE_SECRET_KEY` using a secret key beginning with `sb_secret_` from Supabase's API Keys settings. This is a server-only key, not your publishable key. Never name it with a `NEXT_PUBLIC_` prefix, put it in the ESP32 firmware, or share it in chat/source control.
4. Restart the development server after changing environment variables.

If `.env.local` already exists, skip `npm run setup` and preserve your existing password and tokens; add the Supabase variables manually. The app uses the URL and server secret to access the database. The publishable key may remain configured but is not used by this private backend. Dashboard sign-in still uses the existing dashboard password; this change does not enable Supabase Auth.

Then run `npm run dev` and open http://localhost:3000. Open `website/.env.local` locally and use its `ADMIN_PASSWORD` to sign in. Setup generates your private password, session secret and device token; it refuses to overwrite an existing configuration.

For a production build, run `npm run build` followed by `npm start`.

Only the dashboard owner signs in with the password. The ESP32 uses `DEVICE_API_TOKEN`; browser sessions cannot be used as device credentials. Never share `.env.local` or a configured firmware file.

## Device controls

The website lets you set empty-bin distance (3–400 cm), full-bin distance (minimum 2 cm), temperature alert (0–60 °C), humidity alert (1–100%), and buzzer enable/mute. Empty distance must exceed full distance by at least 1 cm. These software ranges do not override the sensors' actual capabilities.

Full means 100% calibrated fill; the bin-full alert remains rounded fill >80%. Defaults are 30 cm empty, 2 cm full, 45 °C, 85% humidity, and buzzer enabled. Muting affects the bin-full buzzer only; LED and website alerts remain active.

Saved settings remain pending until the updated ESP32 applies them and reports confirmation. The device retains its last applied settings through Wi-Fi loss and restarts. Allow up to 90 seconds for confirmation when connected. An offline device cannot receive a mute command immediately.

## Connect the ESP32 later

1. Open the XOD file and select its **esp** patch.
2. On **ESP32 WEBSITE**, set `SSID` and `PASS` to your Wi-Fi details.
3. Set `CLOUD_URL` to `https://YOUR_DEPLOYED_DOMAIN/api/v1/telemetry`.
4. Set `TOKEN` to this Next.js app's `DEVICE_API_TOKEN` from `.env.local`.
5. Confirm a compatible ESP32 XOD toolchain, compile for the actual board, and upload over USB.

This firmware now uses `Authorization: Bearer` for the standalone Next.js app. It does not connect to the old ChatGPT Site using these credentials. Leave it pointed at a placeholder until you deploy the new website. The firmware requires HTTPS and validates certificates; HTTP localhost is for testing the website, not ESP32 cloud uploads. Update the bundled TLS roots if your chosen host uses a different certificate authority.

Your current XOD toolchain's ESP32 support issue still needs resolving. Firmware compilation, wiring and physical operation have not been verified on the board.

## Retained wiring — ESP32-WROOM-32

| Component | Signal pin |
| --- | --- |
| HC-SR04 TRIG | GPIO5 |
| HC-SR04 ECHO | GPIO18, through voltage conversion |
| DHT11 data | GPIO4 |
| Red / green / yellow LED | GPIO23 / GPIO19 / GPIO27 |
| Active buzzer | GPIO25, with a driver if needed |
| LCD I²C | Usually GPIO21 SDA / GPIO22 SCL; verify board defaults |

ESP32 GPIO is not 5 V tolerant. Level-shift a typical 5 V ultrasonic ECHO and any LCD I²C pull-ups to appropriate 3.3 V levels. Share ground, use LED resistors, and verify GPIO5's boot-strapping behavior. The buzzer logic assumes an active buzzer. Check actual empty/full distances and sensor readings on the bench.

## Supabase storage and Vercel deployment

The latest readings and settings now live in Supabase PostgreSQL. The app no longer reads or writes a local SQLite database and does not need `DATABASE_PATH`. Existing local SQLite files are left untouched; there is no automatic import into Supabase.

Both tables have Row Level Security enabled, with public and normal user access revoked. Only your Next.js backend's server secret can access them. Next.js checks the dashboard session or ESP32 token before accessing data. The ESP32 continues to use its own `DEVICE_API_TOKEN`, never a Supabase key.

For Vercel, select root directory `website`, the Next.js preset, build command `npm run build`, install command `npm ci`, the default output directory, and Node.js 24. Add these environment variables:

| Variable | Value |
| --- | --- |
| `APP_ORIGIN` | Exact public HTTPS origin, without a path; use your final domain for Production |
| `ADMIN_PASSWORD` | Your existing private dashboard password, at least 12 characters |
| `SESSION_SECRET` | Your existing random session secret, at least 32 characters |
| `DEVICE_API_TOKEN` | Your existing random device token, at least 32 characters |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project HTTPS URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Your existing publishable key; reserved for future browser features |
| `SUPABASE_SECRET_KEY` | Server-only `sb_secret_...` key |

Set these for the Vercel environments you use, then redeploy. `APP_ORIGIN` must match the address opened in the browser or sign-in/settings changes will be rejected. If you use Preview deployments, configure their matching origin separately. For testing, a separate Supabase project avoids mixing test readings with production data.

If the API returns 503 with a Supabase setup message, check the secret key, project URL, project availability, and whether the SQL was applied to that same project. No secrets are included in API error responses. The SQL file has not been applied automatically by this code update.

The ESP32 uploads telemetry and checks remote settings every 5 seconds, plus the time taken by network requests. Both the Next.js dashboard and the local ESP32 dashboard refresh every 5 seconds. The website marks the device offline after 120 seconds without an upload. Local sensors and alarms continue operating at their existing faster intervals. Upload the updated XOD project to apply the firmware timing change. No fake readings, history, duplicate XOD exports, build output, dependencies, or real credentials are included in this source folder.

References: [Next.js deployment](https://nextjs.org/docs/app/getting-started/deploying), [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys), [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
