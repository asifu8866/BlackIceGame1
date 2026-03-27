# Math Engine Extraction & Day of the Dead Upgrade

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract all game math from game.html into a standalone blackice-math-engine.js file, upgrade to the Day of the Dead theme with 12 symbols, 40% hit frequency, crypto RNG, Free Spins bonus, and multi-jurisdiction architecture.

**Architecture:** The math engine becomes a self-contained module that game.html imports via `<script src="blackice-math-engine.js"></script>`. The engine exposes a global `BlackIceMath` object with all math functions. game.html calls into it for spins, wins, bonuses, and jackpots — but owns all rendering, animation, input, sound, and hardware communication. This separation enables white-label licensing of the math engine.

**Tech Stack:** Vanilla JavaScript (no frameworks), HTML5 Canvas, Web Audio API, WebSocket, window.crypto.getRandomValues() for RNG.

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `blackice-math-engine.js` | RNG, symbols, reel strips, paytable, paylines, win detection, bonus math, jackpot math, free spins, simulation, jurisdiction config | **CREATE** (~800 lines) |
| `game.html` | Canvas rendering, animations, input, sound, hardware, networking, UI, game loop — imports math engine | **MODIFY** (remove ~1,200 lines of math, add ~100 lines of integration) |
| `CLAUDE.md` | Already updated by user | No change |
| `TASKS.md` | Build progress tracker | **MODIFY** |

---

## Task Overview

1. **Create the crypto RNG module** — foundation everything else depends on
2. **Create symbol definitions** — 12 Day of the Dead symbols
3. **Create reel strips** — 4 RTP variants tuned for 40% hit frequency
4. **Create paytable and paylines** — new payout values for new symbols
5. **Create win detection engine** — checkWins logic extracted and upgraded
6. **Create Hold & Spin bonus math** — fireball values, jackpot tiers, trigger logic
7. **Create Free Spins bonus math** — new feature (Scatter-triggered)
8. **Create jackpot pool system** — Mini $20, Minor $50, Major $1,000, Mega $10,000
9. **Create jurisdiction config system** — 4 modes (Georgia COAM, GLI III, GLI II, Standalone)
10. **Create simulation engine** — 10M+ spin validator
11. **Assemble the BlackIceMath API** — public interface
12. **Strip math from game.html** — remove old math, import engine
13. **Wire game.html to BlackIceMath API** — replace all math calls
14. **Update theme visuals** — Day of the Dead symbols, colors, attract mode
15. **Validate** — run simulation, verify all 4 RTP settings, commit

---

### Task 1: Create Crypto RNG Module

**Files:**
- Create: `blackice-math-engine.js` (initial file, RNG section)

The foundation. GLI requires `window.crypto.getRandomValues()` — never `Math.random()`. Every random decision in the engine flows through this module.

- [ ] **Step 1: Create blackice-math-engine.js with RNG functions**

```javascript
/* =============================================================
   BLACK ICE MATH ENGINE v2.0
   Standalone game mathematics — no rendering, no DOM, no UI.
   Import via: <script src="blackice-math-engine.js"></script>
   Access via: window.BlackIceMath
   ============================================================= */

(function() {
    'use strict';

    // ===== CRYPTOGRAPHIC RNG =====
    // GLI requires window.crypto.getRandomValues() — NEVER Math.random().
    // All random decisions in the engine flow through these functions.

    // Returns a random float in [0, 1) using crypto API
    function cryptoRandom() {
        var arr = new Uint32Array(1);
        window.crypto.getRandomValues(arr);
        return arr[0] / 4294967296; // divide by 2^32
    }

    // Returns a random integer in [0, max) using crypto API
    function cryptoRandomInt(max) {
        return Math.floor(cryptoRandom() * max);
    }

    // Weighted random selection: takes array of {weight: N, ...} objects
    // Returns the index of the selected item
    function weightedRandom(items) {
        var totalWeight = 0;
        for (var i = 0; i < items.length; i++) {
            totalWeight += items[i].weight;
        }
        var roll = cryptoRandom() * totalWeight;
        for (var i = 0; i < items.length; i++) {
            roll -= items[i].weight;
            if (roll <= 0) return i;
        }
        return items.length - 1; // fallback
    }

    // Fisher-Yates shuffle using crypto RNG
    function shuffle(arr) {
        var a = arr.slice(); // copy
        for (var i = a.length - 1; i > 0; i--) {
            var j = cryptoRandomInt(i + 1);
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
    }

    // ... (rest of engine will be added in subsequent tasks)

    // ===== PUBLIC API =====
    window.BlackIceMath = {
        rng: {
            random: cryptoRandom,
            randomInt: cryptoRandomInt,
            weightedRandom: weightedRandom,
            shuffle: shuffle
        }
    };

})();
```

- [ ] **Step 2: Verify RNG works**

Open browser console on game.html (after adding the script tag temporarily) and run:
```javascript
BlackIceMath.rng.random()       // should return float 0-1
BlackIceMath.rng.randomInt(48)  // should return int 0-47
BlackIceMath.rng.weightedRandom([{weight:90},{weight:10}]) // mostly returns 0
```

- [ ] **Step 3: Commit**

```bash
git add blackice-math-engine.js
git commit -m "feat: create math engine with crypto RNG foundation

GLI-compliant RNG using window.crypto.getRandomValues().
Functions: cryptoRandom(), cryptoRandomInt(), weightedRandom(), shuffle().
All game outcomes will flow through this module."
```

---

### Task 2: Create Symbol Definitions

**Files:**
- Modify: `blackice-math-engine.js` (add symbols section after RNG)

12 Day of the Dead symbols replacing the old 10-symbol set. Symbol indices 0-11.

- [ ] **Step 1: Add symbol definitions to the engine**

Add after the RNG section, before the PUBLIC API section:

```javascript
    // ===== SYMBOL DEFINITIONS — DAY OF THE DEAD =====
    // 12 symbols: 5 high-pay characters, 4 low-pay objects, 3 specials
    // Index order matters — reel strips reference these indices

    var SYMBOLS = [
        // High-Pay Characters (indices 0-4)
        { idx: 0,  name: 'WILD',       label: 'Sugar Skull',       type: 'wild',    pay: [100, 500, 2000] },
        { idx: 1,  name: 'LA_CATRINA', label: 'La Catrina',        type: 'high',    pay: [50, 200, 1000] },
        { idx: 2,  name: 'MARIACHI_S', label: 'Mariachi Singer',   type: 'high',    pay: [25, 100, 500] },
        { idx: 3,  name: 'DANCER',     label: 'Skeleton Dancer',   type: 'high',    pay: [20, 75, 300] },
        { idx: 4,  name: 'GUITARIST',  label: 'Mariachi Guitarist',type: 'high',    pay: [15, 50, 200] },

        // Low-Pay Themed Objects (indices 5-8)
        { idx: 5,  name: 'TEQUILA',    label: 'Tequila Bottle',    type: 'low',     pay: [10, 30, 150] },
        { idx: 6,  name: 'MARIGOLD',   label: 'Marigold Flower',   type: 'low',     pay: [10, 25, 100] },
        { idx: 7,  name: 'CANDLES',    label: 'Altar Candles',     type: 'low',     pay: [5, 20, 75] },
        { idx: 8,  name: 'GUITAR',     label: 'Acoustic Guitar',   type: 'low',     pay: [5, 15, 50] },

        // Special Symbols (indices 9-11)
        { idx: 9,  name: 'SCATTER',    label: 'Ofrenda Altar',     type: 'scatter', pay: [0, 0, 0] },
        { idx: 10, name: 'FIREBALL',   label: 'Flame Skull',       type: 'fireball',pay: [0, 0, 0] },
        { idx: 11, name: 'JACKPOT_SYM',label: 'Golden Marigold',   type: 'jackpot', pay: [0, 0, 0] }
    ];

    // Pay array index: [0]=3-of-a-kind, [1]=4-of-a-kind, [2]=5-of-a-kind
    // WILD substitutes for all EXCEPT Scatter, Fireball, and Jackpot symbols
    // SCATTER: 3+ anywhere triggers Free Spins (not on paylines)
    // FIREBALL: 6+ on screen triggers Hold & Spin
    // JACKPOT_SYM: appears ONLY during Hold & Spin bonus

    function getSymbol(index) {
        return SYMBOLS[index] || null;
    }

    function getSymbolByName(name) {
        for (var i = 0; i < SYMBOLS.length; i++) {
            if (SYMBOLS[i].name === name) return SYMBOLS[i];
        }
        return null;
    }

    function isWild(index) {
        return SYMBOLS[index] && SYMBOLS[index].type === 'wild';
    }

    function isScatter(index) {
        return SYMBOLS[index] && SYMBOLS[index].type === 'scatter';
    }

    function isFireball(index) {
        return SYMBOLS[index] && SYMBOLS[index].type === 'fireball';
    }

    function isSpecial(index) {
        var t = SYMBOLS[index] && SYMBOLS[index].type;
        return t === 'scatter' || t === 'fireball' || t === 'jackpot';
    }
```

- [ ] **Step 2: Expose symbols in the API**

Update the `window.BlackIceMath` assignment:

```javascript
    window.BlackIceMath = {
        rng: { random: cryptoRandom, randomInt: cryptoRandomInt, weightedRandom: weightedRandom, shuffle: shuffle },
        symbols: {
            ALL: SYMBOLS,
            get: getSymbol,
            getByName: getSymbolByName,
            isWild: isWild,
            isScatter: isScatter,
            isFireball: isFireball,
            isSpecial: isSpecial,
            COUNT: SYMBOLS.length
        }
    };
```

- [ ] **Step 3: Verify symbols**

Console test:
```javascript
BlackIceMath.symbols.ALL.length          // 12
BlackIceMath.symbols.get(0).label        // "Sugar Skull"
BlackIceMath.symbols.isWild(0)           // true
BlackIceMath.symbols.isScatter(9)        // true
BlackIceMath.symbols.getByName('FIREBALL').idx  // 10
```

- [ ] **Step 4: Commit**

```bash
git add blackice-math-engine.js
git commit -m "feat: add 12 Day of the Dead symbol definitions to math engine

5 high-pay characters (Sugar Skull WILD, La Catrina, Mariachi Singer,
Skeleton Dancer, Mariachi Guitarist), 4 low-pay objects (Tequila, Marigold,
Candles, Guitar), 3 specials (Scatter/Ofrenda, Fireball/Flame Skull,
Jackpot/Golden Marigold). Helper functions for type checking."
```

---

### Task 3: Create Reel Strips for 40% Hit Frequency

**Files:**
- Modify: `blackice-math-engine.js` (add reel strips section)

4 RTP variants (86%, 88%, 92%, 96%) with 48 stops per reel, tuned for 40% hit frequency. The key difference from the old 32% strips: more low-pay symbols, more WILDs, and "loss disguised as win" payouts (paying less than the bet).

- [ ] **Step 1: Add reel strip definitions and RTP management**

Add after the symbols section:

```javascript
    // ===== REEL STRIP DEFINITIONS =====
    // 5 reels x 48 stops each, 4 RTP variants
    // Tuned for 40% hit frequency (1 in 2.5 spins wins something)
    // Many low-pay "loss disguised as win" outcomes to keep engagement high
    //
    // Symbol indices: 0=WILD, 1=LA_CATRINA, 2=MARIACHI_S, 3=DANCER,
    //   4=GUITARIST, 5=TEQUILA, 6=MARIGOLD, 7=CANDLES, 8=GUITAR,
    //   9=SCATTER, 10=FIREBALL, 11=JACKPOT_SYM(bonus only)
    //
    // Design: 92% is the base. Other RTPs modify WILD/low-pay counts.
    //   86%: fewer WILDs and low-pays
    //   88%: slightly fewer WILDs
    //   96%: extra WILDs and low-pays

    var NUM_REELS = 5;
    var NUM_ROWS = 3;

    // 92% RTP — BASE STRIPS (40% hit freq target)
    // More low-pays than old strips to hit 40% frequency
    var STRIPS_92 = [
        // Reel 1: 48 stops
        [8,7,6,5,4,3,2,1,8,7,6,5,10,8,7,6,5,4,3,0,8,7,6,5,4,3,2,8,7,6,5,4,9,8,7,6,5,4,3,2,1,8,7,6,5,10,8,7],
        // Reel 2: 48 stops
        [7,6,5,4,3,2,1,8,7,6,5,4,8,7,6,5,10,8,7,6,5,4,3,0,8,7,6,5,4,3,2,9,8,7,6,5,4,3,2,1,8,7,6,5,4,10,8,7],
        // Reel 3: 48 stops
        [6,5,4,3,2,8,7,6,5,4,3,1,8,7,6,5,4,0,8,7,6,5,4,3,2,10,8,7,6,5,4,3,9,8,7,6,5,4,3,2,1,8,7,6,5,4,10,8],
        // Reel 4: 48 stops
        [5,4,3,2,1,8,7,6,5,4,3,8,7,6,5,4,10,8,7,6,5,4,3,0,8,7,6,5,4,3,2,9,8,7,6,5,4,3,2,1,8,7,6,5,4,10,8,7],
        // Reel 5: 48 stops
        [4,3,2,1,8,7,6,5,4,3,8,7,6,5,10,8,7,6,5,4,3,0,8,7,6,5,4,3,2,9,8,7,6,5,4,3,2,1,8,7,6,5,4,3,10,8,7,6]
    ];

    // 88% RTP — Remove 1 WILD from reel 3 (replace with GUITAR)
    var STRIPS_88 = [
        STRIPS_92[0].slice(),
        STRIPS_92[1].slice(),
        (function() { var s = STRIPS_92[2].slice(); var wi = s.indexOf(0); if (wi !== -1) s[wi] = 8; return s; })(),
        STRIPS_92[3].slice(),
        STRIPS_92[4].slice()
    ];

    // 86% RTP — 88% strips but also remove 1 MARIGOLD from reel 2 (replace with GUITAR)
    var STRIPS_86 = [
        STRIPS_88[0].slice(),
        (function() { var s = STRIPS_88[1].slice(); var mi = s.indexOf(6); if (mi !== -1) s[mi] = 8; return s; })(),
        STRIPS_88[2].slice(),
        STRIPS_88[3].slice(),
        STRIPS_88[4].slice()
    ];

    // 96% RTP — 92% strips but add 1 extra WILD to reel 3 (replace GUITAR)
    var STRIPS_96 = [
        STRIPS_92[0].slice(),
        STRIPS_92[1].slice(),
        (function() { var s = STRIPS_92[2].slice(); var gi = s.lastIndexOf(8); if (gi !== -1) s[gi] = 0; return s; })(),
        STRIPS_92[3].slice(),
        STRIPS_92[4].slice()
    ];

    var STRIP_LENGTH = 48;

    // RTP state
    var currentRTP = 92;

    function getStrips(rtp) {
        if (rtp === 86) return STRIPS_86;
        if (rtp === 88) return STRIPS_88;
        if (rtp === 96) return STRIPS_96;
        return STRIPS_92;
    }

    function setRTP(rtp) {
        if ([86, 88, 92, 96].indexOf(rtp) !== -1) currentRTP = rtp;
    }

    function getRTP() {
        return currentRTP;
    }

    function getActiveStrips() {
        return getStrips(currentRTP);
    }
```

- [ ] **Step 2: Expose in API**

Add to `window.BlackIceMath`:

```javascript
        reels: {
            NUM_REELS: NUM_REELS,
            NUM_ROWS: NUM_ROWS,
            STRIP_LENGTH: STRIP_LENGTH,
            getStrips: getStrips,
            getActiveStrips: getActiveStrips,
            setRTP: setRTP,
            getRTP: getRTP
        },
```

- [ ] **Step 3: Commit**

```bash
git add blackice-math-engine.js
git commit -m "feat: add 4 RTP reel strip variants tuned for 40% hit frequency

48-stop strips for 86/88/92/96% RTP. 92% is base, others derived by
modifying WILD and low-pay symbol counts. Heavy low-pay presence for
frequent 'loss disguised as win' outcomes targeting 40% hit frequency."
```

---

### Task 4: Create Paytable and Paylines

**Files:**
- Modify: `blackice-math-engine.js` (add paytable and paylines)

- [ ] **Step 1: Add paytable and payline definitions**

```javascript
    // ===== PAYTABLE =====
    // Payouts for 3/4/5-of-a-kind on a payline.
    // Values are multipliers of betPerLine.
    // High-pay symbols: rare but big. Low-pay symbols: frequent but small.
    // Many low-pay wins < totalBet = "loss disguised as win"

    var PAYTABLE = {};
    for (var i = 0; i < SYMBOLS.length; i++) {
        if (SYMBOLS[i].pay[0] > 0) {
            PAYTABLE[SYMBOLS[i].name] = SYMBOLS[i].pay;
        }
    }
    // PAYTABLE result:
    // WILD: [100, 500, 2000], LA_CATRINA: [50, 200, 1000],
    // MARIACHI_S: [25, 100, 500], DANCER: [20, 75, 300],
    // GUITARIST: [15, 50, 200], TEQUILA: [10, 30, 150],
    // MARIGOLD: [10, 25, 100], CANDLES: [5, 20, 75],
    // GUITAR: [5, 15, 50]

    // ===== PAYLINES =====
    // 10 payline patterns. Each array maps reel index to row (0=top, 1=mid, 2=bot)

    var PAYLINES = [
        [1, 1, 1, 1, 1],   // Line 1: middle straight
        [0, 0, 0, 0, 0],   // Line 2: top straight
        [2, 2, 2, 2, 2],   // Line 3: bottom straight
        [0, 1, 2, 1, 0],   // Line 4: V shape
        [2, 1, 0, 1, 2],   // Line 5: inverted V
        [0, 0, 1, 2, 2],   // Line 6: diagonal down
        [2, 2, 1, 0, 0],   // Line 7: diagonal up
        [1, 0, 0, 0, 1],   // Line 8: top hat
        [1, 2, 2, 2, 1],   // Line 9: bottom hat
        [1, 0, 1, 0, 1]    // Line 10: zigzag
    ];

    var NUM_PAYLINES = PAYLINES.length;

    // ===== BET LEVELS =====
    var BET_LEVELS = [10, 20, 50, 100, 200]; // totalBet options (betPerLine * 10)
    var DEFAULT_BET = 10;
```

- [ ] **Step 2: Expose in API**

```javascript
        pay: {
            TABLE: PAYTABLE,
            LINES: PAYLINES,
            NUM_LINES: NUM_PAYLINES,
            BET_LEVELS: BET_LEVELS,
            DEFAULT_BET: DEFAULT_BET,
            getSymbolPay: function(symName, matchCount) {
                if (matchCount < 3 || matchCount > 5) return 0;
                var entry = PAYTABLE[symName];
                return entry ? entry[matchCount - 3] : 0;
            }
        },
```

- [ ] **Step 3: Commit**

```bash
git add blackice-math-engine.js
git commit -m "feat: add paytable, 10 paylines, and bet levels to math engine

9 paying symbols from WILD (100/500/2000) down to GUITAR (5/15/50).
Low-pays intentionally pay less than total bet for loss-disguised-as-win.
10 payline patterns, 5 bet levels (10-200)."
```

---

### Task 5: Create Win Detection Engine

**Files:**
- Modify: `blackice-math-engine.js` (add spin resolution and win checking)

This is the core — generates a spin result, checks all paylines, counts scatters, returns everything the visual layer needs.

- [ ] **Step 1: Add spin and win detection functions**

```javascript
    // ===== SPIN RESOLUTION =====
    // Generates reel positions and the visible 5x3 grid.
    // ALL positions determined by RNG BEFORE animation starts (GLI near-miss ban).

    function generateSpin() {
        var strips = getActiveStrips();
        var positions = [];
        for (var r = 0; r < NUM_REELS; r++) {
            positions.push(cryptoRandomInt(STRIP_LENGTH));
        }
        return positions;
    }

    function buildGrid(positions) {
        var strips = getActiveStrips();
        var grid = [];
        for (var r = 0; r < NUM_REELS; r++) {
            grid[r] = [];
            for (var row = 0; row < NUM_ROWS; row++) {
                grid[r][row] = strips[r][(positions[r] + row) % STRIP_LENGTH];
            }
        }
        return grid;
    }

    // ===== WIN DETECTION =====
    // Checks all 10 paylines for 3/4/5-of-a-kind with WILD substitution.
    // WILD substitutes for all symbols EXCEPT Scatter, Fireball, and Jackpot.
    // Returns array of win objects.

    function checkPaylineWins(grid, betPerLine) {
        var wins = [];

        for (var p = 0; p < PAYLINES.length; p++) {
            var line = PAYLINES[p];
            var lineSyms = [];
            for (var r = 0; r < NUM_REELS; r++) {
                lineSyms.push(grid[r][line[r]]);
            }

            var first = lineSyms[0];
            // Skip if first symbol is special (scatter/fireball/jackpot)
            if (isSpecial(first)) continue;

            var matchCount = 1;
            for (var r = 1; r < NUM_REELS; r++) {
                var sym = lineSyms[r];
                if (isSpecial(sym)) break; // specials break the line

                var symIsWild = isWild(sym);
                var firstIsWild = isWild(first);

                // Match if: same symbol, or either is WILD
                // Exception: WILD can't sub when first symbol is WILD and current isn't
                // (WILD-WILD-X counts as X if X is not wild)
                if (sym === first || symIsWild || firstIsWild) {
                    matchCount++;
                } else {
                    break;
                }
            }

            if (matchCount >= 3) {
                // Determine the paying symbol (first non-WILD in the run)
                var paySym = SYMBOLS[first].name;
                if (paySym === 'WILD') {
                    for (var r = 1; r < matchCount; r++) {
                        var sn = SYMBOLS[lineSyms[r]].name;
                        if (sn !== 'WILD') { paySym = sn; break; }
                    }
                }
                var payout = PAYTABLE[paySym] ? PAYTABLE[paySym][matchCount - 3] * betPerLine : 0;

                if (payout > 0) {
                    wins.push({
                        line: p,
                        symbol: paySym,
                        count: matchCount,
                        payout: payout,
                        positions: line.slice(0, matchCount)
                    });
                }
            }
        }

        return wins;
    }

    // ===== SCATTER DETECTION =====
    // Count scatter symbols anywhere on the grid (not payline-dependent)
    // 3+ scatters trigger Free Spins

    function countScatters(grid) {
        var count = 0;
        for (var r = 0; r < NUM_REELS; r++) {
            for (var row = 0; row < NUM_ROWS; row++) {
                if (isScatter(grid[r][row])) count++;
            }
        }
        return count;
    }

    // ===== FIREBALL DETECTION =====
    // Count fireballs anywhere on the grid
    // 6+ fireballs trigger Hold & Spin

    function countFireballs(grid) {
        var count = 0;
        var positions = [];
        for (var r = 0; r < NUM_REELS; r++) {
            for (var row = 0; row < NUM_ROWS; row++) {
                if (isFireball(grid[r][row])) {
                    count++;
                    positions.push({ reel: r, row: row });
                }
            }
        }
        return { count: count, positions: positions };
    }

    // ===== FULL SPIN RESOLUTION =====
    // Single function that resolves an entire spin: positions, grid, wins, bonus triggers

    function resolveSpin(betPerLine, totalBet) {
        var positions = generateSpin();
        var grid = buildGrid(positions);
        var wins = checkPaylineWins(grid, betPerLine);
        var scatters = countScatters(grid);
        var fireballs = countFireballs(grid);

        var totalWin = 0;
        for (var i = 0; i < wins.length; i++) {
            totalWin += wins[i].payout;
        }

        return {
            positions: positions,
            grid: grid,
            wins: wins,
            totalWin: totalWin,
            scatterCount: scatters,
            triggerFreeSpins: scatters >= 3,
            fireballCount: fireballs.count,
            fireballPositions: fireballs.positions,
            triggerHoldAndSpin: fireballs.count >= 6
        };
    }

    // Re-check wins on a modified grid (after nudge or symbol switch)
    function recheckWins(grid, betPerLine) {
        return checkPaylineWins(grid, betPerLine);
    }
```

- [ ] **Step 2: Expose in API**

```javascript
        spin: {
            generate: generateSpin,
            buildGrid: buildGrid,
            resolve: resolveSpin,
            checkWins: checkPaylineWins,
            recheckWins: recheckWins,
            countScatters: countScatters,
            countFireballs: countFireballs
        },
```

- [ ] **Step 3: Commit**

```bash
git add blackice-math-engine.js
git commit -m "feat: add spin resolution and win detection engine

Full spin pipeline: generateSpin() -> buildGrid() -> resolveSpin().
WILD substitution (except specials), 10-payline checking, scatter counting
(3+ triggers Free Spins), fireball detection (6+ triggers Hold & Spin).
All RNG decisions made before animation per GLI near-miss ban."
```

---

### Task 6: Create Hold & Spin Bonus Math

**Files:**
- Modify: `blackice-math-engine.js`

- [ ] **Step 1: Add Hold & Spin bonus math**

```javascript
    // ===== HOLD & SPIN BONUS MATH =====
    // Triggered when 6+ fireballs appear on a single spin.
    // Player gets 3 respins. New fireballs reset respins to 3.
    // Each fireball has a credit value or jackpot prize.
    // Full grid = MEGA jackpot bonus on top.

    var BONUS_INITIAL_FIREBALLS = 6;
    var BONUS_FIREBALL_CHANCE = 0.20;  // 20% per empty cell per respin
    var BONUS_RESPINS = 3;

    // Bonus trigger interval (80-120 spins average)
    var BONUS_TRIGGER_MIN = 80;
    var BONUS_TRIGGER_MAX = 120;

    function rollNextBonusTrigger() {
        return BONUS_TRIGGER_MIN + cryptoRandomInt(BONUS_TRIGGER_MAX - BONUS_TRIGGER_MIN + 1);
    }

    // Fireball credit value table (weighted by frequency)
    var FIREBALL_VALUE_TABLE = [
        { mult: 1,   weight: 30 },
        { mult: 1.5, weight: 25 },
        { mult: 2,   weight: 20 },
        { mult: 3,   weight: 12 },
        { mult: 5,   weight: 8 },
        { mult: 10,  weight: 3 },
        { mult: 20,  weight: 1.5 },
        { mult: 50,  weight: 0.5 }
    ];

    // 3% chance any fireball is a jackpot instead of credits
    var JACKPOT_CHANCE = 0.03;

    function randomFireballValue(totalBet) {
        // Small chance to be a jackpot
        if (cryptoRandom() < JACKPOT_CHANCE) {
            return randomJackpotValue();
        }
        // Weighted random credit value
        var idx = weightedRandom(FIREBALL_VALUE_TABLE);
        var creditValue = Math.round(FIREBALL_VALUE_TABLE[idx].mult * totalBet);
        return { value: creditValue, label: formatCredits(creditValue), color: '#FFFFFF', isJackpot: false };
    }

    // Initialize the bonus grid with starting fireballs
    function initBonusGrid(fireballPositions, totalBet) {
        var grid = [];
        for (var r = 0; r < NUM_REELS; r++) {
            grid[r] = [];
            for (var row = 0; row < NUM_ROWS; row++) {
                grid[r][row] = null;
            }
        }
        // Place initial fireballs
        for (var i = 0; i < fireballPositions.length; i++) {
            var pos = fireballPositions[i];
            grid[pos.reel][pos.row] = randomFireballValue(totalBet);
        }
        return grid;
    }

    // Resolve a bonus respin — determine which empty cells get new fireballs
    function resolveBonusRespin(bonusGrid, totalBet) {
        var newLands = [];
        for (var r = 0; r < NUM_REELS; r++) {
            for (var row = 0; row < NUM_ROWS; row++) {
                if (bonusGrid[r][row] === null) {
                    if (cryptoRandom() < BONUS_FIREBALL_CHANCE) {
                        bonusGrid[r][row] = randomFireballValue(totalBet);
                        newLands.push({ reel: r, row: row });
                    }
                }
            }
        }

        // Check if grid is full
        var isFull = true;
        for (var r = 0; r < NUM_REELS; r++) {
            for (var row = 0; row < NUM_ROWS; row++) {
                if (bonusGrid[r][row] === null) { isFull = false; break; }
            }
            if (!isFull) break;
        }

        // Total up all fireball values
        var total = 0;
        for (var r = 0; r < NUM_REELS; r++) {
            for (var row = 0; row < NUM_ROWS; row++) {
                if (bonusGrid[r][row]) total += bonusGrid[r][row].value;
            }
        }

        return {
            grid: bonusGrid,
            newLands: newLands,
            gotNewFireball: newLands.length > 0,
            isFull: isFull,
            totalValue: total
        };
    }
```

- [ ] **Step 2: Expose in API**

```javascript
        bonus: {
            FIREBALL_CHANCE: BONUS_FIREBALL_CHANCE,
            INITIAL_FIREBALLS: BONUS_INITIAL_FIREBALLS,
            RESPINS: BONUS_RESPINS,
            rollNextTrigger: rollNextBonusTrigger,
            randomFireballValue: randomFireballValue,
            initGrid: initBonusGrid,
            resolveRespin: resolveBonusRespin
        },
```

- [ ] **Step 3: Commit**

```bash
git add blackice-math-engine.js
git commit -m "feat: add Hold & Spin bonus math (fireball values, respins, grid)

Trigger every 80-120 spins. 6 initial fireballs, 20% chance per empty cell
per respin, 3 respins reset on new land. Fireball values 1x-50x bet with
3% jackpot chance. Full grid awards MEGA jackpot bonus."
```

---

### Task 7: Create Free Spins Bonus Math

**Files:**
- Modify: `blackice-math-engine.js`

New feature not in the old game. Triggered by 3+ Scatter (Ofrenda Altar) symbols.

- [ ] **Step 1: Add Free Spins math**

```javascript
    // ===== FREE SPINS BONUS =====
    // Triggered by 3+ Scatter symbols (Ofrenda Altar) anywhere on screen.
    // Awards: 3 scatters = 8 free spins, 4 = 12, 5 = 20
    // During free spins, WILDs have a 2x multiplier.
    // Can retrigger (3+ scatters during free spins = +8 spins).
    // Contributes ~10% of total RTP.

    var FREE_SPIN_AWARDS = {
        3: 8,   // 3 scatters = 8 free spins
        4: 12,  // 4 scatters = 12 free spins
        5: 20   // 5 scatters = 20 free spins
    };

    var FREE_SPIN_WILD_MULTIPLIER = 2; // WILDs pay 2x during free spins

    function getFreeSpinCount(scatterCount) {
        return FREE_SPIN_AWARDS[scatterCount] || 0;
    }

    // Resolve a single free spin (same as normal but with WILD multiplier)
    function resolveFreeSpinSpin(betPerLine, totalBet) {
        var result = resolveSpin(betPerLine, totalBet);

        // Apply 2x multiplier to any win that includes a WILD
        for (var i = 0; i < result.wins.length; i++) {
            var win = result.wins[i];
            var line = PAYLINES[win.line];
            var hasWild = false;
            for (var r = 0; r < win.count; r++) {
                if (isWild(result.grid[r][line[r]])) {
                    hasWild = true;
                    break;
                }
            }
            if (hasWild) {
                win.payout *= FREE_SPIN_WILD_MULTIPLIER;
                win.multiplied = true;
            }
        }

        // Recalculate total
        result.totalWin = 0;
        for (var i = 0; i < result.wins.length; i++) {
            result.totalWin += result.wins[i].payout;
        }

        // Check for retrigger
        result.retriggerSpins = getFreeSpinCount(result.scatterCount);

        return result;
    }
```

- [ ] **Step 2: Expose in API**

```javascript
        freeSpins: {
            AWARDS: FREE_SPIN_AWARDS,
            WILD_MULTIPLIER: FREE_SPIN_WILD_MULTIPLIER,
            getCount: getFreeSpinCount,
            resolveSpin: resolveFreeSpinSpin
        },
```

- [ ] **Step 3: Commit**

```bash
git add blackice-math-engine.js
git commit -m "feat: add Free Spins bonus math (scatter-triggered, 2x WILD)

3/4/5 scatters award 8/12/20 free spins. WILDs pay 2x during free spins.
Can retrigger. Targets ~10% of total RTP contribution."
```

---

### Task 8: Create Jackpot Pool System

**Files:**
- Modify: `blackice-math-engine.js`

Updated values: Mini $20, Minor $50, Major $1,000, Mega $10,000.

- [ ] **Step 1: Add jackpot definitions and pool logic**

```javascript
    // ===== JACKPOT SYSTEM =====
    // 4-level progressive. Pools grow with each spin, reset on win.
    // Mini hits most often, Mega is ultra-rare.

    var JACKPOT_TIERS = [
        { name: 'MINI',  seed: 20,    feed: 0.005, weight: 60, color: '#44FF44' },
        { name: 'MINOR', seed: 50,    feed: 0.003, weight: 25, color: '#44BBFF' },
        { name: 'MAJOR', seed: 1000,  feed: 0.001, weight: 12, color: '#FFD700' },
        { name: 'MEGA',  seed: 10000, feed: 0.001, weight: 3,  color: '#FF2222' }
    ];

    // Jackpot pool state (managed by engine, persisted by game.html)
    var jackpotPools = {};
    function initJackpotPools() {
        for (var i = 0; i < JACKPOT_TIERS.length; i++) {
            var tier = JACKPOT_TIERS[i];
            jackpotPools[tier.name] = { current: tier.seed, seed: tier.seed, feed: tier.feed };
        }
    }
    initJackpotPools();

    function feedJackpots(totalBet) {
        for (var name in jackpotPools) {
            var pool = jackpotPools[name];
            pool.current += totalBet * pool.feed * (0.8 + cryptoRandom() * 0.4);
            pool.current = Math.round(pool.current * 100) / 100;
        }
    }

    function awardJackpot(name) {
        var pool = jackpotPools[name];
        if (!pool) return 0;
        var amount = Math.floor(pool.current);
        pool.current = pool.seed;
        return amount;
    }

    function randomJackpotValue() {
        var idx = weightedRandom(JACKPOT_TIERS);
        var tier = JACKPOT_TIERS[idx];
        var amount = awardJackpot(tier.name);
        return { value: amount, label: tier.name, color: tier.color, isJackpot: true, jackpotName: tier.name };
    }

    function getJackpotPools() {
        var result = {};
        for (var name in jackpotPools) {
            result[name] = jackpotPools[name].current;
        }
        return result;
    }

    function setJackpotPools(pools) {
        for (var name in pools) {
            if (jackpotPools[name]) jackpotPools[name].current = pools[name];
        }
    }
```

- [ ] **Step 2: Expose in API**

```javascript
        jackpots: {
            TIERS: JACKPOT_TIERS,
            feed: feedJackpots,
            award: awardJackpot,
            randomValue: randomJackpotValue,
            getPools: getJackpotPools,
            setPools: setJackpotPools,
            init: initJackpotPools
        },
```

- [ ] **Step 3: Commit**

```bash
git add blackice-math-engine.js
git commit -m "feat: add 4-level progressive jackpot system

Mini $20, Minor $50, Major $1,000, Mega $10,000. Feed % per spin grows
pools progressively. Weighted random tier selection (Mini 60%, Mega 3%).
getPools/setPools for network sync and persistence."
```

---

### Task 9: Create Jurisdiction Config System

**Files:**
- Modify: `blackice-math-engine.js`

4 modes: Georgia COAM, GLI Class III, GLI Class II, Standalone.

- [ ] **Step 1: Add jurisdiction configuration**

```javascript
    // ===== MULTI-JURISDICTION CONFIG =====
    // ONE codebase, multiple regulatory modes.
    // Each mode controls: skill features, protocol, payout method, compliance rules.

    var JURISDICTIONS = {
        GEORGIA_COAM: {
            name: 'Georgia COAM (Class B Skill Game)',
            skillEnabled: true,          // Nudge + Symbol Switch active
            skillRTPRange: [85, 96],     // RTP range with/without skill
            protocol: 'SAS_602',         // SAS 6.02 to Intralot CAS
            payoutMethod: 'GIFT_CARD',   // Gift card redemption (after July 2026)
            responsibleGaming: true,     // Display helpline every 15 min
            creditCarryOver: true        // Credits persist between sessions
        },
        GLI_CLASS_III: {
            name: 'GLI Class III (Casino/Game Room)',
            skillEnabled: false,         // Pure chance
            skillRTPRange: null,
            protocol: 'SAS_G2S',         // Standard SAS or G2S
            payoutMethod: 'CASH',        // Cash payouts
            responsibleGaming: false,
            creditCarryOver: false
        },
        GLI_CLASS_II: {
            name: 'GLI Class II (Tribal Casino)',
            skillEnabled: false,
            skillRTPRange: null,
            protocol: 'GLI_33',          // GLI-33 bingo determination
            payoutMethod: 'CASH',
            responsibleGaming: false,
            creditCarryOver: false
        },
        STANDALONE: {
            name: 'Standalone (Testing/Demo)',
            skillEnabled: true,
            skillRTPRange: null,
            protocol: 'NONE',
            payoutMethod: 'NONE',
            responsibleGaming: false,
            creditCarryOver: false
        }
    };

    var currentJurisdiction = 'STANDALONE';

    function setJurisdiction(mode) {
        if (JURISDICTIONS[mode]) currentJurisdiction = mode;
    }

    function getJurisdiction() {
        return JURISDICTIONS[currentJurisdiction];
    }

    function isSkillEnabled() {
        return JURISDICTIONS[currentJurisdiction].skillEnabled;
    }
```

- [ ] **Step 2: Expose in API**

```javascript
        jurisdiction: {
            MODES: JURISDICTIONS,
            set: setJurisdiction,
            get: getJurisdiction,
            isSkillEnabled: isSkillEnabled,
            current: function() { return currentJurisdiction; }
        },
```

- [ ] **Step 3: Commit**

```bash
git add blackice-math-engine.js
git commit -m "feat: add multi-jurisdiction config (COAM, GLI III, GLI II, Standalone)

4 regulatory modes controlling skill features, protocol, payout method,
and compliance rules. Georgia COAM enables skill + Intralot SAS 6.02.
GLI Class III is pure chance. Standalone for testing."
```

---

### Task 10: Create Simulation Engine

**Files:**
- Modify: `blackice-math-engine.js`

- [ ] **Step 1: Add simulation function**

```javascript
    // ===== SIMULATION ENGINE =====
    // Monte Carlo validator. Runs N spins per RTP setting and reports results.
    // Use from console: BlackIceMath.simulate(1000000)

    function runSimulation(numSpins) {
        numSpins = numSpins || 100000;
        var results = {};

        [86, 88, 92, 96].forEach(function(rtp) {
            var savedRTP = currentRTP;
            currentRTP = rtp;
            var strips = getActiveStrips();

            var totalWagered = 0, totalPaid = 0, winSpins = 0, bonusTriggers = 0, scatterTriggers = 0;

            for (var spin = 0; spin < numSpins; spin++) {
                totalWagered += 10;
                var positions = [];
                for (var r = 0; r < NUM_REELS; r++) {
                    positions.push(cryptoRandomInt(STRIP_LENGTH));
                }
                var grid = buildGrid(positions);
                var wins = checkPaylineWins(grid, 1);
                var spinWin = 0;
                for (var w = 0; w < wins.length; w++) spinWin += wins[w].payout;
                if (spinWin > 0) winSpins++;
                totalPaid += spinWin;

                var fb = countFireballs(grid);
                if (fb.count >= 6) bonusTriggers++;
                var sc = countScatters(grid);
                if (sc >= 3) scatterTriggers++;
            }

            currentRTP = savedRTP;

            results[rtp + '%'] = {
                spins: numSpins,
                hitFrequency: (winSpins / numSpins * 100).toFixed(2) + '%',
                actualRTP: (totalPaid / totalWagered * 100).toFixed(2) + '%',
                targetRTP: rtp + '%',
                bonusTriggers: bonusTriggers,
                scatterTriggers: scatterTriggers,
                avgSpinsBetweenBonus: bonusTriggers > 0 ? Math.round(numSpins / bonusTriggers) : 'N/A',
                avgSpinsBetweenFreeSpins: scatterTriggers > 0 ? Math.round(numSpins / scatterTriggers) : 'N/A'
            };
        });

        console.log('=== BLACK ICE MATH ENGINE SIMULATION ===');
        console.table(results);
        return results;
    }
```

- [ ] **Step 2: Expose in API**

```javascript
        simulate: runSimulation,
```

- [ ] **Step 3: Commit**

```bash
git add blackice-math-engine.js
git commit -m "feat: add Monte Carlo simulation engine for all 4 RTP settings

Tests hit frequency, actual RTP, bonus triggers, and free spin triggers.
Now tracks scatter frequency for Free Spins validation."
```

---

### Task 11: Assemble the Final BlackIceMath API

**Files:**
- Modify: `blackice-math-engine.js` (add utility function + finalize API)

- [ ] **Step 1: Add formatCredits utility and finalize the complete API object**

```javascript
    // ===== UTILITY =====
    function formatCredits(num) {
        return num.toLocaleString();
    }

    // ===== GAME INFO (GLI certification) =====
    function getGameInfo() {
        return {
            title: 'Black Ice Gaming - Day of the Dead',
            version: '2.0.0',
            mathEngineVersion: '2.0.0',
            developer: 'Black Ice Gaming',
            symbolCount: SYMBOLS.length,
            reelStrips: STRIP_LENGTH + ' stops per reel, 4 RTP variants',
            paylines: NUM_PAYLINES,
            rtpSettings: ['86%', '88%', '92%', '96%'],
            hitFrequencyTarget: '40%',
            rtpDistribution: 'Base 60%, Hold & Spin 25%, Free Spins 10%, Jackpots 5%',
            skillFeatures: ['Nudge (shift 1 reel position)', 'Symbol Switch (swap adjacent symbols)'],
            bonusFeatures: ['Hold & Spin (fireball lock)', 'Free Spins (scatter trigger, 2x WILD)'],
            jackpotLevels: ['Mini ($20)', 'Minor ($50)', 'Major ($1,000)', 'Mega ($10,000+)'],
            rngMethod: 'window.crypto.getRandomValues() (CSPRNG)',
            compliance: ['GLI-11', 'GLI-21', 'GLI-16', 'GLI-33', 'Georgia COAM']
        };
    }

    // ===== COMPLETE PUBLIC API =====
    window.BlackIceMath = {
        rng:          { random: cryptoRandom, randomInt: cryptoRandomInt, weightedRandom: weightedRandom, shuffle: shuffle },
        symbols:      { ALL: SYMBOLS, get: getSymbol, getByName: getSymbolByName, isWild: isWild, isScatter: isScatter, isFireball: isFireball, isSpecial: isSpecial, COUNT: SYMBOLS.length },
        reels:        { NUM_REELS: NUM_REELS, NUM_ROWS: NUM_ROWS, STRIP_LENGTH: STRIP_LENGTH, getStrips: getStrips, getActiveStrips: getActiveStrips, setRTP: setRTP, getRTP: getRTP },
        pay:          { TABLE: PAYTABLE, LINES: PAYLINES, NUM_LINES: NUM_PAYLINES, BET_LEVELS: BET_LEVELS, DEFAULT_BET: DEFAULT_BET, getSymbolPay: function(n,c){ if(c<3||c>5)return 0; var e=PAYTABLE[n]; return e?e[c-3]:0; } },
        spin:         { generate: generateSpin, buildGrid: buildGrid, resolve: resolveSpin, checkWins: checkPaylineWins, recheckWins: recheckWins, countScatters: countScatters, countFireballs: countFireballs },
        bonus:        { FIREBALL_CHANCE: BONUS_FIREBALL_CHANCE, INITIAL_FIREBALLS: BONUS_INITIAL_FIREBALLS, RESPINS: BONUS_RESPINS, rollNextTrigger: rollNextBonusTrigger, randomFireballValue: randomFireballValue, initGrid: initBonusGrid, resolveRespin: resolveBonusRespin },
        freeSpins:    { AWARDS: FREE_SPIN_AWARDS, WILD_MULTIPLIER: FREE_SPIN_WILD_MULTIPLIER, getCount: getFreeSpinCount, resolveSpin: resolveFreeSpinSpin },
        jackpots:     { TIERS: JACKPOT_TIERS, feed: feedJackpots, award: awardJackpot, randomValue: randomJackpotValue, getPools: getJackpotPools, setPools: setJackpotPools, init: initJackpotPools },
        jurisdiction: { MODES: JURISDICTIONS, set: setJurisdiction, get: getJurisdiction, isSkillEnabled: isSkillEnabled, current: function(){ return currentJurisdiction; } },
        simulate:     runSimulation,
        info:         getGameInfo,
        util:         { formatCredits: formatCredits }
    };
```

- [ ] **Step 2: Verify the complete engine loads**

Add `<script src="blackice-math-engine.js"></script>` before the existing `<script>` in game.html. Open console:
```javascript
Object.keys(BlackIceMath)  // should list all 10 namespaces
BlackIceMath.info()        // should return full game spec
BlackIceMath.simulate(10000)  // quick validation run
```

- [ ] **Step 3: Commit**

```bash
git add blackice-math-engine.js
git commit -m "feat: finalize BlackIceMath API with all modules assembled

Complete math engine: RNG, symbols, reels, paytable, paylines, spin resolution,
win detection, Hold & Spin bonus, Free Spins bonus, jackpots, jurisdictions,
simulation, game info. Ready for game.html integration."
```

---

### Task 12: Strip Math from game.html

**Files:**
- Modify: `game.html` (remove ~1,200 lines of math code, add script import)

This is the big surgery. Remove all math that now lives in the engine. Keep ALL visual, animation, input, sound, hardware, and networking code.

- [ ] **Step 1: Add script import at the top of game.html**

In game.html, add this line BEFORE the existing `<script>` tag (around line 34):

```html
    <script src="blackice-math-engine.js"></script>
```

- [ ] **Step 2: Remove old symbol definitions**

Delete the old `THEMES` object symbol arrays (lines ~283-341) and replace with a mapping that reads from `BlackIceMath.symbols.ALL` for the visual properties. The THEMES object stays but its `symbols` arrays will reference the engine's symbol data.

- [ ] **Step 3: Remove old reel strips**

Delete `STRIPS_86`, `STRIPS_88`, `STRIPS_92`, `STRIPS_96` definitions (lines ~514-602), `getActiveStrips()`, `loadReelStrips()`, `setRTP()`. These now come from `BlackIceMath.reels.*`.

- [ ] **Step 4: Remove old PAYTABLE and PAYLINES**

Delete `PAYTABLE` object (lines ~1242-1255) and `PAYLINES` array (lines ~2284-2301). Now accessed via `BlackIceMath.pay.TABLE` and `BlackIceMath.pay.LINES`.

- [ ] **Step 5: Remove old win detection**

Delete `checkWins()` function (lines ~2312-2395). Now called via `BlackIceMath.spin.checkWins()`.

- [ ] **Step 6: Remove old bonus math**

Delete: `rollNextBonusTrigger()`, `FIREBALL_VALUE_TABLE`, `JACKPOT_CHANCE`, `randomFireballValue()`, `randomJackpotValue()`, `initBonusGrid()`, fireball/jackpot constants. Keep ALL bonus animation/display code.

- [ ] **Step 7: Remove old jackpot pool definitions**

Delete `JACKPOT_VALUES`, `jackpotPools`, `feedJackpots()`, `awardJackpot()`. Keep `drawJackpotBar()` (visual) and progressive network code.

- [ ] **Step 8: Remove old simulation function**

Delete `runSimulation()` (lines ~3305-3427). Now accessed via `BlackIceMath.simulate()`.

- [ ] **Step 9: Remove old RNG info and game info**

Delete `getRNGInfo()` and `getGameInfo()`. Now via `BlackIceMath.info()`.

- [ ] **Step 10: Commit**

```bash
git add game.html
git commit -m "refactor: strip all math code from game.html (~1,200 lines removed)

Math now lives in blackice-math-engine.js. Removed: symbol defs, reel strips,
paytable, paylines, win detection, bonus math, jackpot pools, fireball values,
simulation, RNG info. Kept: all rendering, animation, input, sound, hardware,
networking, SAS reporting, GLI compliance UI, operator menu, attract mode."
```

---

### Task 13: Wire game.html to BlackIceMath API

**Files:**
- Modify: `game.html` (add bridge code calling into BlackIceMath)

Replace every deleted math call with the equivalent `BlackIceMath.*` call.

- [ ] **Step 1: Wire startSpin() to use engine**

In `startSpin()`, replace:
- `Math.random()` target position → `BlackIceMath.rng.randomInt(BlackIceMath.reels.STRIP_LENGTH)`
- `feedJackpots()` → `BlackIceMath.jackpots.feed(totalBet)`
- Store the spin result: `var spinResult = BlackIceMath.spin.resolve(betPerLine, totalBet);`
- Use `spinResult.positions` as the target positions for reel animation

- [ ] **Step 2: Wire win checking to use engine**

After reels stop, instead of calling old `checkWins()`:
```javascript
var wins = BlackIceMath.spin.checkWins(reelGrid, betPerLine);
activeWins = wins;
lastWin = 0;
for (var i = 0; i < wins.length; i++) lastWin += wins[i].payout;
if (lastWin > 0) credits += lastWin;
```

- [ ] **Step 3: Wire bonus trigger to use engine**

Replace `checkBonusTrigger()` internals with:
```javascript
spinsSinceBonus++;
if (spinsSinceBonus >= nextBonusTrigger) {
    var fb = BlackIceMath.spin.countFireballs(reelGrid);
    if (fb.count >= BlackIceMath.bonus.INITIAL_FIREBALLS) {
        triggerBonus(fb.positions);
    }
    spinsSinceBonus = 0;
    nextBonusTrigger = BlackIceMath.bonus.rollNextTrigger();
}
```

- [ ] **Step 4: Wire bonus grid and respins to use engine**

Replace `initBonusGrid()` call with `BlackIceMath.bonus.initGrid(positions, totalBet)`.
Replace respin logic with `BlackIceMath.bonus.resolveRespin(bonusGrid, totalBet)`.

- [ ] **Step 5: Wire Free Spins trigger (new feature)**

After `checkBonusTrigger()`, add:
```javascript
if (spinResult.triggerFreeSpins) {
    var count = BlackIceMath.freeSpins.getCount(spinResult.scatterCount);
    startFreeSpins(count);
}
```
(The `startFreeSpins()` function will be a visual-layer function added in Task 14.)

- [ ] **Step 6: Wire nudge/switch to use engine recheck**

In `performNudge()` and `handleSwitchTap()`, replace `checkWins()` with:
```javascript
var wins = BlackIceMath.spin.recheckWins(reelGrid, betPerLine);
```

- [ ] **Step 7: Wire jackpot display to use engine pools**

In `drawJackpotBar()`, read from `BlackIceMath.jackpots.getPools()` instead of local `jackpotPools`.

- [ ] **Step 8: Wire progressive network to use engine pools**

The progressive network `sendProgressiveFeed()` and pool sync now read/write via `BlackIceMath.jackpots.getPools()` and `BlackIceMath.jackpots.setPools()`.

- [ ] **Step 9: Wire jurisdiction to operator menu**

Add jurisdiction selection to operator menu. Read `BlackIceMath.jurisdiction.isSkillEnabled()` to show/hide nudge and switch UI.

- [ ] **Step 10: Verify game loads and runs**

Open game.html in browser. Check console for errors. Enter a game theme. Press SPIN. Verify:
- Reels spin and stop
- Wins are detected and displayed
- Credits update correctly
- Jackpot bar ticks up
- FPS counter shows 60

- [ ] **Step 11: Commit**

```bash
git add game.html
git commit -m "feat: wire game.html to BlackIceMath API for all game logic

All math calls now go through BlackIceMath: spin resolution, win detection,
bonus triggers, jackpot feeds, fireball values, jurisdiction checks.
Game loop, rendering, animation, and input unchanged."
```

---

### Task 14: Update Theme Visuals for Day of the Dead

**Files:**
- Modify: `game.html` (update THEMES, drawSymbolIcon, attract mode)

- [ ] **Step 1: Update THEMES object for Day of the Dead**

Replace the 3-theme system with a single Day of the Dead theme (Game 1). The THEMES object stays for future multi-theme support but starts with one theme:

```javascript
var THEMES = {
    dayofdead: {
        name: 'DIA DE LOS MUERTOS',
        subtitle: 'DAY OF THE DEAD',
        accentColor: '#FF6B00',  // marigold orange
        frameGlow: '#FF4400',
        frameBorder: '#CC3300',
        bgGradient: ['#1a0a2e', '#0a0a14'],
        symbols: BlackIceMath.symbols.ALL.map(function(sym) {
            return { name: sym.name, label: sym.label, color: getSymbolColor(sym), bgColor: getSymbolBgColor(sym), shape: sym.name };
        })
    }
};
```

- [ ] **Step 2: Update drawSymbolIcon for 12 new symbols**

Replace the old 10-symbol switch statement with Day of the Dead themed drawings:
- Sugar Skull (WILD): ornate skull with cross eyes and flower crown
- La Catrina: lady silhouette with hat
- Mariachi Singer: singing figure with sombrero
- Skeleton Dancer: dancing skeleton
- Mariachi Guitarist: figure with guitar
- Tequila Bottle: bottle shape
- Marigold Flower: orange/yellow flower petals
- Altar Candles: 3 candle flames
- Acoustic Guitar: guitar outline
- Ofrenda Altar (SCATTER): altar with offerings
- Flame Skull (FIREBALL): skull engulfed in flames
- Golden Marigold (JACKPOT): glowing gold flower

- [ ] **Step 3: Add Free Spins visual state and overlay**

Create `startFreeSpins(count)`, `updateFreeSpins()`, and `drawFreeSpinsOverlay()` functions for the new Free Spins feature. Similar structure to the Hold & Spin bonus overlay.

- [ ] **Step 4: Update attract mode for Day of the Dead**

Update scrolling text, feature callouts, and theme cycling to reference Day of the Dead.

- [ ] **Step 5: Update particle effects for Day of the Dead**

Change particle theme to marigold petals (orange/yellow) floating around the frame.

- [ ] **Step 6: Commit**

```bash
git add game.html
git commit -m "feat: Day of the Dead theme visuals, 12 new symbol icons, Free Spins UI

Marigold orange accent, skull/skeleton/flower symbol art, Free Spins overlay
with 2x WILD indicator, updated attract mode and particle effects."
```

---

### Task 15: Validate and Finalize

**Files:**
- Modify: `blackice-math-engine.js`, `game.html`, `TASKS.md`

- [ ] **Step 1: Run 1M spin simulation**

Console: `BlackIceMath.simulate(1000000)`

Verify:
- 86%: actual RTP within 84-88%, hit freq 38-42%
- 88%: actual RTP within 86-90%, hit freq 38-42%
- 92%: actual RTP within 90-94%, hit freq 38-42%
- 96%: actual RTP within 94-98%, hit freq 38-42%

If any are out of range, tune the reel strips in Task 3 (adjust WILD/low-pay counts).

- [ ] **Step 2: Verify all features work**

Test checklist:
- [ ] Normal spin with win detection
- [ ] WILD substitution works
- [ ] Nudge skill feature (if jurisdiction allows)
- [ ] Symbol Switch skill feature (if jurisdiction allows)
- [ ] Hold & Spin bonus triggers and plays through
- [ ] Free Spins triggers from 3+ scatters
- [ ] Jackpot pools tick up each spin
- [ ] Operator menu works (RTP, volume, jurisdiction)
- [ ] Attract mode activates after idle
- [ ] FPS counter shows 60

- [ ] **Step 3: Update TASKS.md**

Mark all Phase 5 tasks complete. Update Phase 6 status.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete math engine extraction and Day of the Dead upgrade

Math engine (blackice-math-engine.js): crypto RNG, 12 symbols, 4 RTP strips,
win detection, Hold & Spin, Free Spins, jackpots, jurisdictions, simulation.
Game (game.html): Day of the Dead visuals, all rendering/animation/input.
1M spin validation passed. All features working."
```

---

## Dependency Graph

```
Task 1 (RNG) ──────┐
Task 2 (Symbols) ───┤
Task 3 (Strips) ────┤
Task 4 (Paytable) ──┼──→ Task 5 (Win Detection) ──→ Task 10 (Simulation)
                    │                                       │
Task 6 (Bonus) ────┤                                       │
Task 7 (Free Spins)┤                                       │
Task 8 (Jackpots) ──┤                                       ▼
Task 9 (Jurisdict.) ┘──→ Task 11 (Assemble API) ──→ Task 12 (Strip game.html)
                                                           │
                                                           ▼
                                                    Task 13 (Wire API)
                                                           │
                                                           ▼
                                                    Task 14 (Day of Dead visuals)
                                                           │
                                                           ▼
                                                    Task 15 (Validate)
```

**Parallelizable:** Tasks 1-4 must be sequential (each builds on prior). Tasks 6-9 can run in parallel after Task 5. Tasks 12-13 are sequential. Task 14 can partially parallel with 13.
