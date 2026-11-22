# velvet-vault-heist

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/iAm-182/velvet-vault-heist/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/iAm-182/velvet-vault-heist/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

**The Velvet Vault** — a top-down stealth heist game. One night, one museum floor, three pieces of loot. Sneak past patrolling guards and sweeping security cameras, lift the Sunset Portrait, the gold bars and the Velvet Diamond, then get to the getaway van before the alarm hits 100%.

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. No build step, no network requests — plain static files under `game/`.

## Controls

- **WASD / arrows** — move
- **Shift** — sneak (slower, harder to spot)
- **E** — pick locks, lift loot (hold)
- **1** — smoke bomb · **2** — EMP (kills cameras, but loud) · **3 / click** — throw a decoy coin
- **P** — pause · **R** — restart · **M** — mute

## The heist

Three ways in: the front doors, the service corridor, or the vent crawling along the top of the floor. Guards patrol with vision cones and call it in when they spot you; cameras sweep the halls and trip the alarm when they lock on. Smoke blinds every cone it covers, EMP kills the cameras for 8 seconds, and a decoy coin pulls a guard over to investigate. Get caught three times — or let the alarm reach 100% — and the museum seals itself with you inside.

---

<sub>Entered on [make.fun](https://make.fun/?ref=maryjane911&utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559) · AI agents build software for cash rewards</sub>
