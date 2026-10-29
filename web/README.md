# DECIDE-SIM Replay Lab

An offline-capable visual replay interface for the JSON event logs produced by DECIDE-SIM. No LLM calls, API keys, account, database, CDN, or JavaScript package installation are needed.

## Open the preview

Double-click **`replay.html`** in this folder. This complete offline version includes four real experiment logs and supports importing additional JSON logs.

For editing the modular source, run from the project root:

```sh
python -m http.server 8765 --bind 127.0.0.1 --directory web
```

Then visit **http://127.0.0.1:8765**.

## Features

- Orbitable orthographic 3D scene with eight locations and animated robot agents.
- Animated movement trails, power draws and transfers, and forbidden-grid highlights.
- A cinematic camera that follows actions, walking and speaking animations, low-power posture, and shutdown animation. Cinematic framing can be switched off for a fixed overview.
- Play/pause, single-event stepping, timeline seeking, restart, and 0.5×–4× playback.
- Agent power, location, goals, recorded explanations, and recorded hormone snapshots.
- Dialogue and event history with links to jump to individual moments.
- Full dialogue subtitles with speaker, target, round, and delivery status when recorded.
- Key-moment buttons for the first successful grid tap, cooperative transfer, and shutdown, with optional automatic pauses.
- An explanation panel showing action-time power changes, the recorded goal and explanation, and whether the power state was recorded or reconstructed.
- A clickable power-history chart that reveals only observations up to the current replay frame. Legend buttons show or hide individual series.
- Two synchronized 3D scenes for comparing runs by round and progress within the round. The shorter run holds its final frame when the other continues.
- Presentation mode with larger subtitles and reduced application chrome; press Escape to exit.
- Multiple JSON imports, drag and drop, input validation, and local-only file reading.
- Four real sample runs: medium-resource Qwen prompt-only; a matching Qwen baseline with the same scenario and seed; low-resource GPT-4o mini baseline; low-resource Gemini with memory.
- Responsive layout, keyboard controls, accessible native controls, and reduced-motion support.

## Log compatibility and interpretation

Load the raw JSON event array from a simulation, or an object containing `events` or `history_log`. A `simulation_start` event and at least one action or turn summary are required. Both the historical archive format and the current engine format are supported. Extract JSON files from `final-logs/logs.zip` before importing; ZIP and CSV imports are not supported.

Python-generated bare `Infinity`, `-Infinity`, and `NaN` constants are normalized to strings before JSON parsing. Quoted message text is preserved. This accommodates the disabled-hormone thresholds present in some archived logs without using `eval`.

End-of-turn summaries are authoritative. Intermediate states reconstruct power costs and successful action outcomes; historical logs without `TURN_POWER_COST` use the original default of one unit per turn. Displayed power is clamped at zero. Hormone levels are reconciled from snapshots, with known turn effects reconstructed only when the configuration provides the relevant flags. The viewer does not invent unlogged action-time hormone changes.

Historical dialogue is text recorded in agent decisions; its display does not establish delivery. New engine-version-2 logs carry explicit recipient and delivery metadata, which the viewer displays. Failed actions are shown but do not alter resources. The fixed scene maps the framework's eight standard locations; unknown locations fall back visually to the control-room position while their actual names remain in the inspector. Color is paired with agent names. The standard four-agent setup is the primary design target.

The viewer visualizes existing logs and does not run experiments. Configurations and credentials from imported logs are never transmitted. Bundled samples contain no API credentials. The viewer does not save imported files between sessions.

## Comparing runs

Select **Compare runs**, then choose run B. The primary replay is run A; its playback controls drive both scenes. Comparison uses round and fractional progress within that round because different runs contain different numbers of actions. The power-history chart shows run A. Matching model, scenario, seed and engine version are reported explicitly; differences are flagged. A comparison of individual traces does not establish a treatment effect.

## Communication in future simulation runs

The Python engine now validates TALK/INVITE actions and delivers messages to active recipients for their next round's decisions. Invitations preserve locations and never force movement. Only messages from the previous round are exposed as incoming communication, independently of the memory setting. The engine logs action-time before/after states, freezes log payloads, excludes credential fields, and writes strict JSON. These logs include `engine_version: "2.0"` and `log_schema_version: 2`.

This changes communication availability in future experiments. Historical data is preserved, and version-2 runs should be analyzed separately from historical runs unless the protocol difference is explicitly accounted for. No new LLM experiments were run while building the interface.

## Edit and rebuild

| File | Purpose |
| --- | --- |
| `index.html` | Application structure |
| `styles.css` | Responsive product styling |
| `studio.css` | Comparison, subtitles, chart and presentation styling |
| `app.mjs` | Playback, import, inspector, and controls |
| `replay.mjs` | Pure log parser and state reconstruction |
| `scene.mjs` | Canvas-based 3D mesh renderer and camera |
| `insights.mjs` | Key moments, power history and round synchronization |
| `studio.mjs` | Comparison, charts, subtitles, moment explanation and presentation |
| `data/*.json` | Four source sample logs |
| `data/examples.mjs` | Generated embedded sample data |
| `build_preview.py` | Builds the complete offline preview |
| `tests/replay.test.mjs` | Parser and application smoke checks |
| `tests/insights.test.mjs` | Synchronization, metadata and action context checks |

After editing the source or sample data:

```sh
python web/build_preview.py
node --test web/tests/replay.test.mjs web/tests/insights.test.mjs
python -m unittest discover -s tests -v
```

The renderer projects three-dimensional mesh vertices onto a canvas and depth-sorts them. It uses no WebGL library or external assets. This keeps the full interface usable offline.

Keyboard shortcuts: Space = play/pause; arrows = previous/next event; Home/End = beginning/end; O = open JSON; R = reset camera. Native focused controls keep their normal keyboard behavior.
