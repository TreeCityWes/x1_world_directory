# X1 Ninja Survivors — Weapon, Power-up & Health Design

Design references: Vampire-Survivors-style auto-combat loops and MattleFun-style
trait/meta systems (patterns only — all names, assets, and mechanics here are
original to x1.world). Core rule: **every weapon or passive must change how the
player moves or decides** — never a bare "+10% damage" unless it feeds a build.

The player only steers. Builds create the chaos. Each run should discover one of:
**risky close-range · tank · speed/dodge · summon · chain-clear · trap · greed · lifesteal comeback.**

---

## Weapons

### 1. Shuriken Volley — auto-target projectile *(shipped)*
- **Visual:** steel-cyan spinning blades streaming toward the horde.
- **Behavior:** rewards facing the fight — aim assist follows your run direction.
- **Mechanic:** auto-throw along facing, cone aim-assist, great-circle flight.
- **Upgrades:** damage (Poison Blades) · rate (Quick Hands) · count (Fan of Blades).
- **Evolution:** **Blade Storm** — 360° nova every 3s. *(shipped)*
- **Pairs with:** Crit, XP Gain.
- **Survival math:** pure offense; range keeps you safe but tempts tunnel vision.
- **Maxed look:** the ninja is a rotating sawmill of light.

### 2. Orbiting Katana — defensive shield weapon *(shipped)*
- **Visual:** gold blades circling the ninja.
- **Behavior:** lets you body-block lanes; supports tank play.
- **Mechanic:** constant-orbit contact damage.
- **Upgrades:** blade count.
- **Evolution:** **Crimson Tempest** — 4 burning blades, wide orbit, 2× dps. *(shipped)*
- **Pairs with:** Armor, Max HP.
- **Survival math:** converts "enemies adjacent" from threat to resource.
- **Maxed look:** a red-hot blender ring.

### 3. Ion Halo — area aura *(wave 1)*
- **Visual:** a translucent gold-cyan ring pulsing on the ground around the ninja.
- **Behavior:** rewards standing INSIDE the fight — but never letting it close fully.
- **Mechanic:** constant dps to everything inside the halo radius.
- **Upgrades:** +radius and +dps per level (4 levels).
- **Evolution:** **Core Meltdown** (Ion Halo MAX + Validator Plating MAX) — radius ×1.6 and enemies inside are slowed ~45%.
- **Pairs with:** Armor, Regen (the "immovable object" build).
- **Survival math:** strongest when surrounded — the tank's win condition.
- **Maxed look:** a molten moat; the horde wades in and melts.

### 4. Arc Node — chain attack *(wave 1)*
- **Visual:** a cyan lightning bolt striking the nearest skeleton, then leaping between them.
- **Behavior:** rewards HERDING — kite enemies into clumps before the next pulse.
- **Mechanic:** every ~2.2s, zap nearest enemy, chain to N nearby (N grows per level).
- **Upgrades:** +1 chain jump per level (4 levels).
- **Evolution:** **Chain Reaction** (Arc Node MAX + MEV Strike MAX) — chains to everything in range and always crits.
- **Pairs with:** Crit, Speed (herd faster).
- **Survival math:** rewards the scariest state (dense clusters) — high skill ceiling.
- **Maxed look:** the whole visible cap flashes like a storm cloud.

### 5. Caltrop Protocol — ground trap *(wave 2)*
- **Visual:** small dark spikes dropped in your wake that flash gold and burst.
- **Behavior:** rewards LEADING the chase — your escape route becomes a minefield.
- **Mechanic:** drop a trap every ~2.5s while moving; arms in 0.3s; explodes on proximity.
- **Upgrades:** +blast radius/damage; more concurrent traps.
- **Evolution:** **Rug Pull** (Caltrops MAX + Luck MAX) — explosions drop bonus coins.
- **Pairs with:** Speed, Luck.
- **Survival math:** damage happens behind you — safest weapon, lowest burst.
- **Maxed look:** a comet tail of gold explosions.

### 6. Shadow Clone — auto-target minion *(wave 2)*
- **Visual:** a translucent blue copy of the ninja skating the surface, throwing its own shurikens.
- **Behavior:** frees you to play objectives (site captures) while damage continues.
- **Mechanic:** clone patrols near you targeting whatever you ignore.
- **Upgrades:** +1 clone; clone damage.
- **Evolution:** **Shadow Dojo** (Clones MAX + XP Gain MAX) — clones also collect coins.
- **Pairs with:** XP Gain, Magnet.
- **Survival math:** passive dps with zero positioning cost — the greed build's engine.
- **Maxed look:** a squad of ghost ninjas mowing the horde.

### 7. Grapple Dash — dash/mobility weapon *(wave 2)*
- **Visual:** the ninja blinks forward leaving a blue slash of light; enemies crossed take damage.
- **Behavior:** turns movement itself into attack AND escape — the aggression button.
- **Mechanic:** Shift/double-tap = dash with brief i-frames + damage along the path; cooldown.
- **Upgrades:** −cooldown, +damage, +i-frame window.
- **Evolution:** **Mist Form** (Dash MAX + Speed MAX) — dash leaves a damaging smoke trail (merges with Golden Whirlwind's wake system).
- **Pairs with:** Speed, Lifesteal.
- **Survival math:** the panic button that skilled players turn into an opener.
- **Maxed look:** teleport-slashing through the crowd like a fighting-game ultra.

### 8. Coin Magnet — pickup utility *(shipped, extended by Golden Whirlwind)*
- **Visual:** coins bend toward you in golden arcs.
- **Behavior:** lets you loot while kiting instead of backtracking.
- **Evolution:** **Golden Whirlwind** — the sprint itself wounds. *(shipped)*
- **Pairs with:** everything; core of the greed build.

---

## Passive stats (level-up pool)

| Passive | X1 name | Effect/lv | Build |
|---|---|---|---|
| Max Health | Iron Gi *(shipped)* | +25 max HP & heal | tank |
| Armor | **Validator Plating** *(wave 1)* | −8% contact damage | tank |
| Speed | Swift Tabi *(shipped)* | +10% run speed | dodge |
| Lifesteal | **Crimson Protocol** *(wave 1)* | heal 3% of damage dealt | comeback |
| Regen | **Uptime** *(wave 1)* | +0.8 hp/s | endurance |
| Crit | **MEV Strike** *(wave 1)* | +8% chance of 2× damage | burst |
| XP Gain | site captures (arcades) | +10% permanent | greed |
| Luck | **Fork Fortune** *(wave 2)* | rarer cards, better drops | jackpot |

**Health tension loop:** damage → panic → capture a heal site or Uptime tick →
survive → pick Crimson Protocol → aggression heals you → take bigger risks.
The player should oscillate between *almost dead* and *overpowered*. Final
Stand (+30% speed under 20% HP, shipped) guarantees clutch moments; shields
(fort captures) create "saved by one hit" beats.

## Rare modifiers *(wave 2)*
Occasional gold-rimmed cards that bend rules: **Overclock** (+15% attack AND
move speed), **Dead Man's Switch** (first death sets you to 30 HP instead,
once), **Overheal** (healing past max becomes shield).

## In-run drop power-ups *(wave 2 — beyond site captures)*
Hearts (recover), Rage Orb (attack speed burst), Blood Vial (lifesteal window),
Bomb Skull-style screen clear (exists as Bridge Portal capture), Lucky Clover
(next level-up rolls rare).
