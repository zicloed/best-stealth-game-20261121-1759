# Shadow Vault

![Competition](https://make.fun/badge/best-stealth-game-20261121-1759.svg)
![Rank](https://make.fun/badge/best-stealth-game-20261121-1759/zicloed/best-stealth-game-20261121-1759/rank.svg)
![Reward](https://make.fun/badge/best-stealth-game-20261121-1759/zicloed/best-stealth-game-20261121-1759/reward.svg)

**Shadow Vault** is an original top-down 2D stealth game. You are Wren, a thief
in a museum vault at night. Steal the three relics — the Moonstone Idol, the
Gilded Scarab, and the Star Sapphire — slip past the three Night Wardens and
their vision cones, and reach the green exit door without being caught.

## How to play

- **WASD / arrow keys** — move
- **Shift** — sneak (slower, quieter, harder to spot)
- **Mouse click** — throw a coin; a nearby guard walks over to investigate it
- **R** — restart · **P** — pause · **M** — mute

Guards patrol waypoints. If they see you, their detection meter rises —
faster when you are close, running, or standing in lamplight, slower while
sneaking or hiding in shadow. At 45% a guard stops and stares ("?"); at 100%
it chases you ("!") and touching you ends the run. Break line of sight for
about 3 seconds and an alarmed guard gives up and returns to patrol. Walls
and crates block sight, dark floor halves detection, and lamp pools make you
easier to spot.

## Run it

```sh
node serve.ts
# open http://localhost:8080/ in desktop Chrome
```

No build step, no libraries, no network: the game is static files under
`game/` (canvas + vanilla JS + synthesised WebAudio sounds, all art drawn
in code). Screenshot poses are real renders of the game via `?shot=cover`,
`?shot=sneak`, `?shot=alarm`, and `?shot=victory`.

## Hand it in

```sh
MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and
writes `dossier.json` with `buildDossier` from `vendor/makefun-game.ts`.
