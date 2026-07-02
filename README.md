# Nova Command

A StarCraft-style real-time strategy game in a single HTML file — no dependencies, no build step, just canvas and vanilla JavaScript.

**Play it:** open `index.html` in a browser, or visit the live deployment.

![genre](https://img.shields.io/badge/genre-RTS-blue) ![deps](https://img.shields.io/badge/dependencies-0-green)

## The game

Mine crystals, train an army, and destroy the enemy Command Center before they destroy yours — against the AI, or head-to-head against a friend.

## 2-player online

No accounts, no server setup:

1. Player one clicks **HOST 2-PLAYER** and gets a 4-digit room code.
2. Player two clicks **JOIN 2-PLAYER** on their own device and enters the code.
3. That's it — host plays blue (left base), guest plays red (right base).

Under the hood it's a peer-to-peer WebRTC data channel (PeerJS handles the handshake). The host runs the authoritative simulation; the guest sends commands and renders interpolated snapshots at ~12 Hz. Works across networks, desktop and iPad alike.

- **Economy** — worker drones mine crystal fields and haul them back to your Command Center
- **Base building** — build Barracks, train Marines, set rally points
- **Combat** — attack-move, drag-select, glowing lasers, muzzle flashes, HP bars, explosions with screen shake and smoke, retro synth SFX
- **Fog of war** — the map starts dark; your units reveal it as they move, and enemies are only visible inside your vision (explored ground stays dimly remembered)
- **Enemy AI** — runs its own economy, expands, defends its base, and sends escalating attack waves (first one around the 3-minute mark)
- **Graphics** — procedurally pre-rendered sprite units, parallax nebula starfield, animated buildings, additive-blend effects, retina-sharp canvas — still zero asset files
- 2600×1800 scrollable map with a clickable (fog-aware) minimap

## Controls

| Input | Action |
|---|---|
| Left click / drag | Select unit(s) |
| Right click | Move · attack · mine · set rally |
| **Q** | Train unit (building selected) |
| **B** | Build Barracks (worker selected) |
| **A** + click | Attack-move |
| **E** | Select all marines |
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
- Get a Barracks up by ~1:30. The first enemy wave hits around 3:00.
- Defend your base first, then counter-attack. Attacking while a wave is inbound is how you get base-raced.
- Marines cost 60, workers 50, Barracks 150.

## Development

It's one file. Edit `index.html`, refresh the browser. That's the whole workflow.
