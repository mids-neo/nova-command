# Nova Command

A StarCraft-style real-time strategy game in a single HTML file — no build step, just canvas and vanilla JavaScript (PeerJS for multiplayer is the sole dependency).

**Play now: https://novacommand.vercel.app**

**Play it:** open `index.html` in a browser, or visit the live deployment.

![genre](https://img.shields.io/badge/genre-RTS-blue) ![deps](https://img.shields.io/badge/dependencies-0-green)

## The game

Mine crystals, train an army, and destroy the enemy Command Center before they destroy yours — against the AI, or head-to-head against a friend.

## 2-4 player online (free-for-all)

No accounts, no server setup:

1. One player clicks **HOST MATCH** and gets a 4-digit room code.
2. Up to three friends click **JOIN MATCH** on their own devices and enter the code.
3. The host presses **START MATCH** — last Command Center standing wins. Eliminated players stay to spectate with full map vision.

After a match, everyone can hit **REMATCH** to instantly restart on a fresh random map over the same connections.

Under the hood it's a peer-to-peer WebRTC data channel (PeerJS handles the handshake). The host runs the authoritative simulation; the guest sends commands and renders interpolated snapshots at ~12 Hz. Works across networks, desktop and iPad alike.

- **Economy** — worker drones mine crystal fields; contested neutral expansions mid-map; build extra Command Centers to expand
- **Base building** — Barracks (marines), Factory (siege mechs), Supply Depots (raise the supply cap), defensive Turrets
- **Units** — Marines (fast, cheap) and Siege Mechs (slow, long-range, splash damage) with attack/armor upgrades researched at the Command Center
- **Combat** — attack-move, drag-select, glowing lasers, muzzle flashes, HP bars, explosions with screen shake and smoke, retro synth SFX
- **Fog of war** — the map starts dark; your units reveal it as they move, and enemies are only visible inside your vision (explored ground stays dimly remembered)
- **Enemy AI** — three difficulties; runs its own economy and supply chain, defends, and sends escalating attack waves (hard mode adds factories, turrets, and upgrades)
- **Random maps** — seeded generation: jittered bases and mirrored neutral expansions, fair by symmetry, different every match
- **Match stats** — end screen shows minerals mined, units built, kills, and losses per player plus an army-value-over-time graph
- **Replays** — every solo/hosted game records automatically at 2 Hz; save it from the end screen, watch it later via WATCH REPLAY with full map vision
- **Minimap attack pings** — flashing blips show where you're taking damage
- **Ambient music** — procedural synth drone and arpeggio (M to mute, remembered)
- **Graphics** — procedurally pre-rendered sprite units, parallax nebula starfield, animated buildings, additive-blend effects, retina-sharp canvas — still zero asset files
- 2600×1800 scrollable map with a clickable (fog-aware) minimap

## Controls

| Input | Action |
|---|---|
| Left click / drag | Select unit(s) |
| Right click | Move · attack · mine · set rally |
| **Q** | Train unit (building selected) |
| **B / V / F / T / C** | Build Barracks / Depot / Factory / Turret / Command Center (worker selected) |
| **A** + click | Attack-move |
| **E** | Select army |
| **I** | Cycle idle workers |
| **1–5** | Control groups (**Shift**+digit assigns) |
| **M** | Mute |
| **Space** | Center camera on base |
| Arrow keys / minimap | Pan camera |
| **H** | Toggle help |

### Touch (iPad / phone)

| Gesture | Action |
|---|---|
| Drag | Scroll the map |
| Tap unit/building | Select it |
| Double-tap a unit | Select all of that type on screen |
| Tap ground / enemy / crystals (with units selected) | Move · attack · mine |
| Tap minimap | Jump camera |
| Bottom-bar buttons | Train, build, attack-move, deselect |
| ARMY / BASE buttons | Select all marines / center on base |

To place a building, tap **Build Barracks**, then touch and drag on the map to position the ghost — lift your finger to place it.

## Tips

- Start by training workers (select Command Center, press **Q**) — more workers means faster minerals.
- Watch your supply (shown bottom-left) — build Depots before you get supply-blocked.
- Siege Mechs outrange everything, including Turrets — escort them with marines.
- Get a Barracks up by ~1:30. The first enemy wave hits around 3:00.
- Defend your base first, then counter-attack. Attacking while a wave is inbound is how you get base-raced.
- Marines cost 60, workers 50, Barracks 150.

## Difficulty

Three AI levels from the menu: **Easy** (relaxed, small waves), **Normal**, and **Hard** (fast waves, siege mechs, turrets, and upgrades).

## Install as an app

It's a PWA — "Add to Home Screen" on iPad/Android or "Install" in desktop Chrome gives you a fullscreen app with an icon. Solo play works offline.

## Development

It's one file. Edit `index.html`, refresh the browser. That's the whole workflow.
