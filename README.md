# Nova Command

A StarCraft-style real-time strategy game in a single HTML file — no dependencies, no build step, just canvas and vanilla JavaScript.

**Play it:** open `index.html` in a browser, or visit the live deployment.

![genre](https://img.shields.io/badge/genre-RTS-blue) ![deps](https://img.shields.io/badge/dependencies-0-green)

## The game

Mine crystals, train an army, and destroy the red Command Center before the enemy AI destroys yours.

- **Economy** — workers mine crystal fields and haul them back to your Command Center
- **Base building** — build Barracks, train Marines, set rally points
- **Combat** — attack-move, drag-select, lasers, HP bars, explosions, retro synth SFX
- **Enemy AI** — runs its own economy, expands, defends its base, and sends escalating attack waves (first one around the 3-minute mark)
- 2600×1800 scrollable map with a clickable minimap

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
