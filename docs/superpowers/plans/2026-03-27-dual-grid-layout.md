# Dual Grid Layout (5x3 / 5x4) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add configurable grid layouts — 5x3 (10 paylines) for skill game markets and 5x4 (50 paylines) for casino markets — with jurisdiction defaults and operator override.

**Architecture:** The math engine becomes grid-aware: `setGridLayout('5x3')` or `setGridLayout('5x4')` switches NUM_ROWS, PAYLINES, reel strips, and bet levels. Each jurisdiction profile specifies a default grid. The operator menu adds a GRID LAYOUT setting that can override the jurisdiction default. The visual layer reads grid dimensions from the engine and adapts layout dynamically.

**Tech Stack:** Vanilla JavaScript, HTML5 Canvas, BlackIceMath API.

---

## File Structure

| File | Responsibility | Action |
|------|---------------|--------|
| `blackice-math-engine.js` | Grid configs, paylines for both layouts, reel strips for both, dynamic NUM_ROWS, updated simulation | **MODIFY** (~200 lines added) |
| `game.html` | Dynamic visual layout, operator menu grid setting, adapted drawing functions | **MODIFY** (~80 lines changed) |

---

## Task Overview

1. **Add grid layout config system to math engine** — layout definitions, setter/getter, dynamic NUM_ROWS
2. **Add 50 paylines for 5x4 layout** — standard casino payline patterns
3. **Add reel strips for 5x4 layout** — 4 RTP variants tuned for 50-line play
4. **Update win detection for dynamic grid** — checkPaylineWins, countScatters, countFireballs, buildGrid
5. **Update bonus math for dynamic grid** — Hold & Spin on 5x4 (20 cells), Free Spins
6. **Wire jurisdiction defaults** — add gridLayout to each jurisdiction profile
7. **Update simulation for both layouts** — test all 4 RTPs × 2 grids
8. **Update game.html visual layout** — dynamic SYMBOL_H, REEL_H, drawReels, markers, win lines
9. **Add GRID LAYOUT to operator menu** — setting with jurisdiction default + override
10. **Validate** — run simulation on both grids, verify RTP targets

---

### Task 1: Add Grid Layout Config System to Math Engine

**Files:**
- Modify: `blackice-math-engine.js` (add grid layout system after jurisdiction section, before simulation)

- [ ] **Step 1: Add grid layout definitions and state management**

Add this code after the jurisdiction section (after `isSkillEnabled` function, before the simulation section):

```javascript
    // ===== GRID LAYOUT SYSTEM =====
    // 5x3 = skill game markets (Georgia COAM). Smaller grid makes Nudge/Switch more impactful.
    // 5x4 = casino markets (GLI Class III). Matches Fire Link layout, 50 paylines.

    var GRID_LAYOUTS = {
        '5x3': {
            rows: 3,
            paylineCount: 10,
            betLevels: [10, 20, 50, 100, 200],
            defaultBet: 10,
            fireballTrigger: 6,    // 6 of 15 cells
            description: '5 Reels x 3 Rows (10 Lines)'
        },
        '5x4': {
            rows: 4,
            paylineCount: 50,
            betLevels: [50, 100, 200, 500, 1000],
            defaultBet: 50,
            fireballTrigger: 8,    // 8 of 20 cells
            description: '5 Reels x 4 Rows (50 Lines)'
        }
    };

    var currentGridLayout = '5x3';

    function setGridLayout(layout) {
        if (!GRID_LAYOUTS[layout]) return;
        currentGridLayout = layout;
        NUM_ROWS = GRID_LAYOUTS[layout].rows;
        NUM_PAYLINES = GRID_LAYOUTS[layout].paylineCount;
        BONUS_INITIAL_FIREBALLS = GRID_LAYOUTS[layout].fireballTrigger;
    }

    function getGridLayout() {
        return currentGridLayout;
    }

    function getGridConfig() {
        return GRID_LAYOUTS[currentGridLayout];
    }
```

- [ ] **Step 2: Update the BET_LEVELS and DEFAULT_BET to be dynamic**

Change the existing static bet constants (around line 179) from:
```javascript
    var BET_LEVELS = [10, 20, 50, 100, 200];
    var DEFAULT_BET = 10;
```
to:
```javascript
    var BET_LEVELS = [10, 20, 50, 100, 200]; // will be overridden by grid layout
    var DEFAULT_BET = 10;
```

Then add to the `setGridLayout` function body:
```javascript
        BET_LEVELS = GRID_LAYOUTS[layout].betLevels;
        DEFAULT_BET = GRID_LAYOUTS[layout].defaultBet;
```

- [ ] **Step 3: Make NUM_ROWS and BONUS_INITIAL_FIREBALLS reassignable**

Change the existing declarations (line 97 and line 312) from `var` to `var` (they already are `var`, so they're reassignable). Verify these lines read:
```javascript
    var NUM_ROWS = 3;
```
and:
```javascript
    var BONUS_INITIAL_FIREBALLS = 6;
```

Both are already `var` (not `const`), so they can be reassigned by `setGridLayout()`. No code change needed — just verify.

- [ ] **Step 4: Expose grid layout in the public API**

Update the `window.BlackIceMath` object. Add a new `grid` namespace:
```javascript
        grid:         { LAYOUTS: GRID_LAYOUTS, set: setGridLayout, get: getGridLayout, config: getGridConfig },
```

Also update the existing `pay` namespace to use dynamic values:
```javascript
        pay:          { TABLE: PAYTABLE, LINES: PAYLINES, NUM_LINES: function(){ return NUM_PAYLINES; }, BET_LEVELS: function(){ return BET_LEVELS; }, DEFAULT_BET: function(){ return DEFAULT_BET; }, getSymbolPay: function(n,c){ if(c<3||c>5)return 0; var e=PAYTABLE[n]; return e?e[c-3]:0; } },
```

And update the `reels` namespace to expose dynamic NUM_ROWS:
```javascript
        reels:        { NUM_REELS: NUM_REELS, NUM_ROWS: function(){ return NUM_ROWS; }, STRIP_LENGTH: STRIP_LENGTH, getStrips: getStrips, getActiveStrips: getActiveStrips, setRTP: setRTP, getRTP: getRTP },
```

- [ ] **Step 5: Commit**

```bash
git add blackice-math-engine.js
git commit -m "feat: add grid layout config system (5x3 and 5x4)"
```

---

### Task 2: Add 50 Paylines for 5x4 Layout

**Files:**
- Modify: `blackice-math-engine.js` (add PAYLINES_50 after existing PAYLINES)

- [ ] **Step 1: Add 50 payline definitions for the 5x4 grid**

Add after the existing PAYLINES array (after `var NUM_PAYLINES = PAYLINES.length;`):

```javascript
    // ===== 50 PAYLINES FOR 5x4 GRID =====
    // Standard 50-line patterns for 4-row casino layout (rows 0-3).
    // Lines 1-10 match the 5x3 set. Lines 11-50 use row 3.
    var PAYLINES_50 = [
        // Lines 1-10: same as 5x3 (using rows 0-2 only)
        [1, 1, 1, 1, 1],   // 1: middle
        [0, 0, 0, 0, 0],   // 2: top
        [2, 2, 2, 2, 2],   // 3: third row
        [0, 1, 2, 1, 0],   // 4: V down
        [2, 1, 0, 1, 2],   // 5: V up
        [0, 0, 1, 2, 2],   // 6: diagonal down
        [2, 2, 1, 0, 0],   // 7: diagonal up
        [1, 0, 0, 0, 1],   // 8: top hat
        [1, 2, 2, 2, 1],   // 9: bottom hat
        [1, 0, 1, 0, 1],   // 10: zigzag
        // Lines 11-20: using row 3 (bottom)
        [3, 3, 3, 3, 3],   // 11: bottom row
        [0, 1, 2, 3, 3],   // 12: full diagonal down
        [3, 2, 1, 0, 0],   // 13: full diagonal up
        [3, 3, 2, 1, 0],   // 14: rise from bottom
        [0, 1, 2, 3, 2],   // 15: down-then-up
        [3, 2, 1, 2, 3],   // 16: mountain from bottom
        [0, 1, 0, 1, 0],   // 17: sawtooth top
        [3, 2, 3, 2, 3],   // 18: sawtooth bottom
        [1, 2, 3, 2, 1],   // 19: valley
        [2, 3, 2, 3, 2],   // 20: low zigzag
        // Lines 21-30: more patterns
        [0, 0, 1, 0, 0],   // 21: shallow dip
        [3, 3, 2, 3, 3],   // 22: shallow rise from bottom
        [1, 1, 0, 1, 1],   // 23: slight top dip
        [2, 2, 3, 2, 2],   // 24: slight bottom dip
        [0, 1, 1, 1, 0],   // 25: plateau top
        [3, 2, 2, 2, 3],   // 26: plateau bottom
        [0, 2, 0, 2, 0],   // 27: wide zigzag top
        [3, 1, 3, 1, 3],   // 28: wide zigzag bottom
        [1, 0, 2, 0, 1],   // 29: W shape top
        [2, 3, 1, 3, 2],   // 30: W shape bottom
        // Lines 31-40
        [0, 0, 2, 0, 0],   // 31: deep dip from top
        [3, 3, 1, 3, 3],   // 32: deep dip from bottom
        [1, 2, 1, 2, 1],   // 33: mid zigzag
        [2, 1, 2, 1, 2],   // 34: reverse mid zigzag
        [0, 1, 3, 1, 0],   // 35: deep V
        [3, 2, 0, 2, 3],   // 36: deep inverted V
        [0, 2, 1, 2, 0],   // 37: asymmetric V
        [3, 1, 2, 1, 3],   // 38: asymmetric inverted V
        [1, 3, 1, 3, 1],   // 39: big zigzag mid-bottom
        [2, 0, 2, 0, 2],   // 40: big zigzag mid-top
        // Lines 41-50
        [0, 3, 0, 3, 0],   // 41: extreme zigzag
        [3, 0, 3, 0, 3],   // 42: reverse extreme zigzag
        [0, 0, 3, 0, 0],   // 43: spike down from top
        [3, 3, 0, 3, 3],   // 44: spike up from bottom
        [1, 1, 2, 3, 3],   // 45: gradual descent
        [2, 2, 1, 0, 0],   // 46: gradual ascent
        [0, 2, 3, 2, 0],   // 47: deep scoop
        [3, 1, 0, 1, 3],   // 48: deep arch
        [1, 0, 3, 0, 1],   // 49: extreme W
        [2, 3, 0, 3, 2]    // 50: extreme M
    ];
```

- [ ] **Step 2: Make PAYLINES dynamic based on grid layout**

Change the PAYLINES variable from a fixed array to one that gets swapped. Rename the existing 10-line set:

Find the existing PAYLINES definition:
```javascript
    var PAYLINES = [
        [1, 1, 1, 1, 1],
        ...
    ];

    var NUM_PAYLINES = PAYLINES.length;
```

Rename to `PAYLINES_10` and make `PAYLINES` a reference:
```javascript
    var PAYLINES_10 = [
        [1, 1, 1, 1, 1],
        [0, 0, 0, 0, 0],
        [2, 2, 2, 2, 2],
        [0, 1, 2, 1, 0],
        [2, 1, 0, 1, 2],
        [0, 0, 1, 2, 2],
        [2, 2, 1, 0, 0],
        [1, 0, 0, 0, 1],
        [1, 2, 2, 2, 1],
        [1, 0, 1, 0, 1]
    ];

    var PAYLINES = PAYLINES_10;
    var NUM_PAYLINES = PAYLINES.length;
```

- [ ] **Step 3: Update setGridLayout to swap paylines**

Add to the `setGridLayout` function body:
```javascript
        PAYLINES = (layout === '5x4') ? PAYLINES_50 : PAYLINES_10;
        NUM_PAYLINES = PAYLINES.length;
```

- [ ] **Step 4: Add PAYLINE_COLORS for 50 lines in game.html**

In game.html, find the existing `PAYLINE_COLORS` array and extend it to cover 50 lines. Find:
```javascript
    const PAYLINE_COLORS = [...]  // 10 colors
```

Replace with:
```javascript
    // 50 payline colors — first 10 match the 5x3 set, rest cycle through a wider palette
    const PAYLINE_COLORS = [
        '#FF4444', '#FFD700', '#44FF44', '#4488FF', '#FF44FF',
        '#FF8800', '#00FFCC', '#FF6688', '#88AAFF', '#FFFF44',
        '#FF2222', '#22FF88', '#8844FF', '#FF6600', '#00CCFF',
        '#FFAA44', '#44FFAA', '#FF44AA', '#AAFF44', '#44AAFF',
        '#CC4444', '#CCAA00', '#44CC44', '#4466CC', '#CC44CC',
        '#CC6600', '#00CCAA', '#CC4466', '#6688CC', '#CCCC44',
        '#AA2222', '#22AA66', '#6644AA', '#AA4400', '#0088AA',
        '#AA8844', '#44AA88', '#AA4488', '#88AA44', '#4488AA',
        '#882222', '#228844', '#442288', '#882200', '#006688',
        '#886644', '#448866', '#884466', '#668844', '#446688'
    ];
```

- [ ] **Step 5: Commit**

```bash
git add blackice-math-engine.js game.html
git commit -m "feat: add 50 paylines for 5x4 grid, make paylines dynamic"
```

---

### Task 3: Add Reel Strips for 5x4 Layout

**Files:**
- Modify: `blackice-math-engine.js` (add 5x4 reel strips after existing strips)

The 5x4 grid with 50 paylines has many more ways to win per spin. To keep RTP in range, the base payouts per line need to be lower (since betPerLine = totalBet / 50 instead of totalBet / 10). The reel strips should produce similar symbol distributions but tuned for the different economics.

- [ ] **Step 1: Add 5x4 reel strip variants**

Add after the existing `STRIPS_96` definition and the `getStrips` function, before the PAYTABLE section:

```javascript
    // ===== 5x4 REEL STRIPS =====
    // Same 48 stops per reel, but tuned for 50-payline economics.
    // More high-pay symbols to compensate for lower betPerLine (totalBet/50 vs /10).
    // 92% base, others derived.

    var STRIPS_92_4ROW = [
        [8,7,6,5,4,3,2,1,8,7,6,5,10,8,7,6,5,4,3,0,8,7,6,5,4,3,2,1,8,7,6,5,9,8,7,6,5,4,3,2,1,0,8,7,6,10,8,7],
        [7,6,5,4,3,2,1,8,7,6,5,4,8,7,6,5,10,8,7,6,5,4,3,0,8,7,6,5,4,3,2,1,9,8,7,6,5,4,3,2,1,0,8,7,6,10,8,7],
        [6,5,4,3,2,1,8,7,6,5,4,3,8,7,6,5,4,0,8,7,6,5,4,3,2,10,8,7,6,5,4,3,9,8,7,6,5,4,3,2,1,0,8,7,6,10,8,7],
        [5,4,3,2,1,8,7,6,5,4,3,2,8,7,6,5,10,8,7,6,5,4,3,0,8,7,6,5,4,3,2,1,9,8,7,6,5,4,3,2,1,0,8,7,6,10,8,7],
        [4,3,2,1,8,7,6,5,4,3,2,1,8,7,6,5,10,8,7,6,5,4,3,0,8,7,6,5,4,3,2,9,8,7,6,5,4,3,2,1,0,8,7,6,5,10,8,7]
    ];

    var STRIPS_88_4ROW = [
        STRIPS_92_4ROW[0].slice(),
        STRIPS_92_4ROW[1].slice(),
        (function() { var s = STRIPS_92_4ROW[2].slice(); var wi = s.indexOf(0); if (wi !== -1) s[wi] = 8; return s; })(),
        STRIPS_92_4ROW[3].slice(),
        STRIPS_92_4ROW[4].slice()
    ];

    var STRIPS_86_4ROW = [
        STRIPS_88_4ROW[0].slice(),
        (function() { var s = STRIPS_88_4ROW[1].slice(); var mi = s.indexOf(6); if (mi !== -1) s[mi] = 8; return s; })(),
        STRIPS_88_4ROW[2].slice(),
        STRIPS_88_4ROW[3].slice(),
        STRIPS_88_4ROW[4].slice()
    ];

    var STRIPS_96_4ROW = [
        STRIPS_92_4ROW[0].slice(),
        STRIPS_92_4ROW[1].slice(),
        (function() { var s = STRIPS_92_4ROW[2].slice(); var gi = s.lastIndexOf(8); if (gi !== -1) s[gi] = 0; return s; })(),
        STRIPS_92_4ROW[3].slice(),
        STRIPS_92_4ROW[4].slice()
    ];
```

- [ ] **Step 2: Update getStrips() to return layout-appropriate strips**

Replace the existing `getStrips` function:

```javascript
    function getStrips(rtp) {
        if (currentGridLayout === '5x4') {
            if (rtp === 86) return STRIPS_86_4ROW;
            if (rtp === 88) return STRIPS_88_4ROW;
            if (rtp === 96) return STRIPS_96_4ROW;
            return STRIPS_92_4ROW;
        }
        if (rtp === 86) return STRIPS_86;
        if (rtp === 88) return STRIPS_88;
        if (rtp === 96) return STRIPS_96;
        return STRIPS_92;
    }
```

- [ ] **Step 3: Commit**

```bash
git add blackice-math-engine.js
git commit -m "feat: add 5x4 reel strips for 50-line casino layout"
```

---

### Task 4: Update Win Detection for Dynamic Grid

**Files:**
- Modify: `blackice-math-engine.js` (buildGrid, checkPaylineWins, countScatters, countFireballs already use NUM_ROWS variable)

- [ ] **Step 1: Verify all grid functions use the NUM_ROWS variable (not hardcoded 3)**

Read through these functions and confirm they all use `NUM_ROWS` not a literal `3`:
- `buildGrid()` (line ~192): loops `for (var row = 0; row < NUM_ROWS; row++)` — GOOD
- `checkPaylineWins()` (line ~205): iterates `PAYLINES` array — GOOD (paylines contain row indices, function doesn't care about grid size)
- `countScatters()` (line ~257): loops `for (var row = 0; row < NUM_ROWS; row++)` — GOOD
- `countFireballs()` (line ~267): loops `for (var row = 0; row < NUM_ROWS; row++)` — GOOD
- `resolveBonusRespin()` (line ~358): loops `for (var row = 0; row < NUM_ROWS; row++)` — GOOD
- `initBonusGrid()` (line ~344): loops `for (var row = 0; row < NUM_ROWS; row++)` — GOOD

All these functions already use the `NUM_ROWS` variable, so when `setGridLayout('5x4')` changes `NUM_ROWS` to 4, they will automatically iterate 4 rows instead of 3. No code changes needed for the math functions themselves.

- [ ] **Step 2: Update resolveSpin to use dynamic fireball trigger**

Check `resolveSpin()` (line ~282). The trigger threshold should use `BONUS_INITIAL_FIREBALLS` (which `setGridLayout` already updates). Find:

```javascript
            triggerHoldAndSpin: fireballs.count >= 6
```

Replace with:
```javascript
            triggerHoldAndSpin: fireballs.count >= BONUS_INITIAL_FIREBALLS
```

- [ ] **Step 3: Commit**

```bash
git add blackice-math-engine.js
git commit -m "fix: use dynamic BONUS_INITIAL_FIREBALLS in resolveSpin trigger check"
```

---

### Task 5: Update Bonus Math for Dynamic Grid

**Files:**
- Modify: `blackice-math-engine.js`

- [ ] **Step 1: Verify initBonusGrid and resolveBonusRespin handle 5x4**

Both already loop with `NUM_ROWS`, so a 5x4 grid produces 20 cells (5×4) instead of 15 (5×3). The 20% chance per empty cell per respin still applies. The `isFull` check iterates all cells. No changes needed.

- [ ] **Step 2: Update the free spins scatter trigger for larger grid**

In a 5x4 grid there are 20 cells, so scatters can appear in more positions. The trigger threshold (3+ scatters) stays the same — more cells just means scatters are slightly more likely to appear. This is fine and actually desirable (more bonus triggers on casino layout). No code change needed.

- [ ] **Step 3: Commit (skip if no changes)**

No code changes in this task — the math functions are already grid-size-agnostic.

---

### Task 6: Wire Jurisdiction Defaults

**Files:**
- Modify: `blackice-math-engine.js` (add gridLayout to JURISDICTIONS)

- [ ] **Step 1: Add gridLayout property to each jurisdiction**

Update the JURISDICTIONS object. Add `gridLayout` to each:

```javascript
    var JURISDICTIONS = {
        GEORGIA_COAM: {
            name: 'Georgia COAM (Class B Skill Game)',
            skillEnabled: true,
            skillRTPRange: [85, 96],
            protocol: 'SAS_602',
            payoutMethod: 'GIFT_CARD',
            responsibleGaming: true,
            creditCarryOver: true,
            gridLayout: '5x3'           // smaller grid for skill game
        },
        GLI_CLASS_III: {
            name: 'GLI Class III (Casino/Game Room)',
            skillEnabled: false,
            skillRTPRange: null,
            protocol: 'SAS_G2S',
            payoutMethod: 'CASH',
            responsibleGaming: false,
            creditCarryOver: false,
            gridLayout: '5x4'           // Fire Link layout for casino
        },
        GLI_CLASS_II: {
            name: 'GLI Class II (Tribal Casino)',
            skillEnabled: false,
            skillRTPRange: null,
            protocol: 'GLI_33',
            payoutMethod: 'CASH',
            responsibleGaming: false,
            creditCarryOver: false,
            gridLayout: '5x4'           // casino layout
        },
        STANDALONE: {
            name: 'Standalone (Testing/Demo)',
            skillEnabled: true,
            skillRTPRange: null,
            protocol: 'NONE',
            payoutMethod: 'NONE',
            responsibleGaming: false,
            creditCarryOver: false,
            gridLayout: '5x3'           // default to skill layout
        }
    };
```

- [ ] **Step 2: Update setJurisdiction to auto-apply grid layout**

```javascript
    function setJurisdiction(mode) {
        if (JURISDICTIONS[mode]) {
            currentJurisdiction = mode;
            setGridLayout(JURISDICTIONS[mode].gridLayout);
        }
    }
```

- [ ] **Step 3: Update getGameInfo() to include grid layout**

Add to the object returned by `getGameInfo()`:
```javascript
            gridLayout: currentGridLayout,
            gridDescription: GRID_LAYOUTS[currentGridLayout].description,
```

- [ ] **Step 4: Commit**

```bash
git add blackice-math-engine.js
git commit -m "feat: wire grid layout to jurisdiction profiles (5x3 COAM, 5x4 casino)"
```

---

### Task 7: Update Simulation for Both Layouts

**Files:**
- Modify: `blackice-math-engine.js` (update runSimulation)

- [ ] **Step 1: Update simulation to test both grid layouts**

Replace the existing `runSimulation` function:

```javascript
    function runSimulation(numSpins) {
        numSpins = numSpins || 100000;
        var results = {};
        var savedLayout = currentGridLayout;
        var savedRTP = currentRTP;

        ['5x3', '5x4'].forEach(function(layout) {
            setGridLayout(layout);
            var layoutConfig = GRID_LAYOUTS[layout];

            [86, 88, 92, 96].forEach(function(rtp) {
                currentRTP = rtp;

                var betPerLine = 1;
                var totalBet = layoutConfig.paylineCount * betPerLine;
                var totalWagered = 0, totalPaid = 0, winSpins = 0, bonusTriggers = 0, scatterTriggers = 0;

                for (var spin = 0; spin < numSpins; spin++) {
                    totalWagered += totalBet;
                    var positions = [];
                    for (var r = 0; r < NUM_REELS; r++) {
                        positions.push(cryptoRandomInt(STRIP_LENGTH));
                    }
                    var grid = buildGrid(positions);
                    var wins = checkPaylineWins(grid, betPerLine);
                    var spinWin = 0;
                    for (var w = 0; w < wins.length; w++) spinWin += wins[w].payout;
                    if (spinWin > 0) winSpins++;
                    totalPaid += spinWin;

                    var fb = countFireballs(grid);
                    if (fb.count >= BONUS_INITIAL_FIREBALLS) bonusTriggers++;
                    var sc = countScatters(grid);
                    if (sc >= 3) scatterTriggers++;
                }

                results[layout + ' ' + rtp + '%'] = {
                    layout: layout,
                    rows: layoutConfig.rows,
                    paylines: layoutConfig.paylineCount,
                    spins: numSpins,
                    hitFrequency: (winSpins / numSpins * 100).toFixed(2) + '%',
                    baseGameRTP: (totalPaid / totalWagered * 100).toFixed(2) + '% (base game only)',
                    targetRTP: rtp + '%',
                    bonusTriggers: bonusTriggers,
                    scatterTriggers: scatterTriggers,
                    avgSpinsBetweenBonus: bonusTriggers > 0 ? Math.round(numSpins / bonusTriggers) : 'N/A',
                    avgSpinsBetweenFreeSpins: scatterTriggers > 0 ? Math.round(numSpins / scatterTriggers) : 'N/A'
                };
            });
        });

        // Restore original state
        currentRTP = savedRTP;
        setGridLayout(savedLayout);

        console.log('=== BLACK ICE MATH ENGINE SIMULATION ===');
        console.table(results);
        return results;
    }
```

- [ ] **Step 2: Commit**

```bash
git add blackice-math-engine.js
git commit -m "feat: simulation tests both 5x3 and 5x4 grid layouts across all RTPs"
```

---

### Task 8: Update game.html Visual Layout

**Files:**
- Modify: `game.html` (dynamic layout constants, drawReels, drawPaylineMarkers, drawWinLines, drawBonusOverlay)

- [ ] **Step 1: Make visual constants dynamic based on grid layout**

Find the static layout constants (around line 626-642) and update the row-dependent ones to be computed:

Replace:
```javascript
    const SYMBOL_H = 150;           // height of ONE symbol cell
```
With:
```javascript
    var SYMBOL_H = 150;             // height of ONE symbol cell (recalculated on layout change)
```

Add a function that recalculates layout when grid changes:

```javascript
    function recalcVisualLayout() {
        var rows = BM.reels.NUM_ROWS();
        SYMBOL_H = Math.floor(REEL_H / rows) - 4;  // fit rows into reel window with small margin
        // Update aliases
        NUM_ROWS = rows;
        PAYLINES = BM.pay.LINES;
    }
```

- [ ] **Step 2: Update the NUM_ROWS and PAYLINES aliases to be dynamic**

Change the top-level aliases (lines 45-48) from:
```javascript
    var NUM_ROWS = BM.reels.NUM_ROWS;
    var PAYLINES = BM.pay.LINES;
```
To:
```javascript
    var NUM_ROWS = BM.reels.NUM_ROWS();
    var PAYLINES = BM.pay.LINES;
```

Note: `BM.reels.NUM_ROWS` is now a function (from Task 1), so call it with `()`.

- [ ] **Step 3: Update drawPaylineMarkers for dynamic row count**

The existing function (line ~1384) already loops `for (let row = 0; row < NUM_ROWS; row++)`. But the `rowLabels` and `rowColors` arrays are hardcoded for 3 rows. Update:

```javascript
    function drawPaylineMarkers() {
        const markerX = REEL_AREA_X - 40;
        const rowColors = ['#FF4444', '#FFD700', '#44FF44', '#4488FF'];  // 4th color for row 3

        for (let row = 0; row < NUM_ROWS; row++) {
            const symY = REEL_AREA_Y + row * SYMBOL_H + (REEL_H - NUM_ROWS * SYMBOL_H) / 2;
            const cy = symY + SYMBOL_H / 2;
            ctx.fillStyle = rowColors[row % rowColors.length];
            // ... rest stays the same (left arrow + right arrow drawing)
```

- [ ] **Step 4: Verify drawReels, drawWinLines, drawBonusOverlay use NUM_ROWS variable**

These functions already loop with `NUM_ROWS`:
- `drawReels()`: `for (let row = -1; row <= NUM_ROWS; row++)` — GOOD
- `drawWinLines()`: Uses `PAYLINES[win.paylineIndex]` which returns row indices — GOOD (works for any row count)
- `drawBonusOverlay()`: `for (let row = 0; row < NUM_ROWS; row++)` — GOOD
- Symbol Switch overlay: `for (let row = 0; row < NUM_ROWS; row++)` — GOOD
- Nudge: Operates on a single reel column, no row count dependency — GOOD

All already dynamic. The key change is `SYMBOL_H` being recalculated so symbols fit the available space.

- [ ] **Step 5: Add recalcVisualLayout call when grid changes**

Add a function that game.html calls when the grid layout changes:

```javascript
    function applyGridLayout(layout) {
        BM.grid.set(layout);
        recalcVisualLayout();
        // Reset bet to match new layout
        currentBetIndex = 0;
        var levels = BM.pay.BET_LEVELS();
        totalBet = levels[0];
        betPerLine = totalBet / BM.pay.NUM_LINES();
        // Reload reel strips for new layout
        loadReelStrips();
        updateReelGrid();
    }
```

- [ ] **Step 6: Commit**

```bash
git add game.html
git commit -m "feat: dynamic visual layout adapts to 5x3 or 5x4 grid"
```

---

### Task 9: Add GRID LAYOUT to Operator Menu

**Files:**
- Modify: `game.html` (operator menu items and handler)

- [ ] **Step 1: Add GRID LAYOUT menu item**

Find the `MENU_ITEMS` array (around line 3078) and add a grid layout option after RTP:

```javascript
    const MENU_ITEMS = [
        { label: 'RTP SETTING', type: 'rtp' },
        { label: 'GRID LAYOUT', type: 'grid' },
        { label: 'VOLUME', type: 'volume' },
        { label: 'TOTAL SPINS', type: 'info' },
        { label: 'TOTAL WAGERED', type: 'info' },
        { label: 'TOTAL PAID', type: 'info' },
        { label: 'RUN 1000 TEST SPINS', type: 'action' },
        { label: 'RESET CREDITS TO 1000', type: 'action' },
        { label: 'EXIT MENU', type: 'action' }
    ];
```

- [ ] **Step 2: Add grid layout handler in handleMenuInput**

Find the RTP handler block (around line 3114) and add the grid handler after it:

```javascript
            } else if (item.type === 'grid') {
                var gridOptions = ['5x3', '5x4'];
                var gIdx = gridOptions.indexOf(BM.grid.get());
                if (action === 'RIGHT') {
                    var newGrid = gridOptions[Math.min(gIdx + 1, gridOptions.length - 1)];
                    applyGridLayout(newGrid);
                } else if (action === 'LEFT') {
                    var newGrid = gridOptions[Math.max(gIdx - 1, 0)];
                    applyGridLayout(newGrid);
                }
```

- [ ] **Step 3: Add grid layout display in drawOperatorMenu**

Find where the menu values are displayed (inside `drawOperatorMenu`). After the RTP display block, add:

```javascript
        } else if (item.type === 'grid') {
            var gridVal = BM.grid.get();
            var config = BM.grid.config();
            var valStr = isSelected ? '\u25C0 ' + config.description + ' \u25B6' : config.description;
            ctx.fillText(valStr, MACHINE_X + MACHINE_W - 120, y + 15);
```

- [ ] **Step 4: Update betUp/betDown to use dynamic BET_LEVELS**

Find `betUp()` and `betDown()` functions and ensure they read from `BM.pay.BET_LEVELS()` (a function now) instead of a static array. Find references to `BET_LEVELS` in game.html and update:

```javascript
    function betUp() {
        if (isSpinning) return;
        var levels = BM.pay.BET_LEVELS();
        currentBetIndex = Math.min(currentBetIndex + 1, levels.length - 1);
        totalBet = levels[currentBetIndex];
        betPerLine = totalBet / BM.pay.NUM_LINES();
    }

    function betDown() {
        if (isSpinning) return;
        var levels = BM.pay.BET_LEVELS();
        currentBetIndex = Math.max(currentBetIndex - 1, 0);
        totalBet = levels[currentBetIndex];
        betPerLine = totalBet / BM.pay.NUM_LINES();
    }
```

- [ ] **Step 5: Commit**

```bash
git add game.html
git commit -m "feat: add GRID LAYOUT setting to operator menu with dynamic bet levels"
```

---

### Task 10: Validate

**Files:**
- Modify: `blackice-math-engine.js` (strip tuning if needed), `game.html` (any visual fixes)

- [ ] **Step 1: Run simulation on both grids**

Open game.html in browser. In console:
```javascript
BlackIceMath.simulate(100000)
```

Check that all 8 rows (4 RTPs × 2 grids) appear. Verify:
- 5x3 86%: base game RTP roughly in range (will be lower than 86% since bonus/FS not simulated)
- 5x3 92%: base game RTP higher than 86%
- 5x4 variants: should show higher hit frequency due to 50 paylines
- Bonus triggers: should appear every ~100 spins on 5x3, may be different on 5x4
- Scatter triggers: should be more frequent on 5x4 (20 cells vs 15)

- [ ] **Step 2: Test grid switching in operator menu**

1. Open game.html
2. Press 9 (Service key) to open operator menu
3. Navigate to GRID LAYOUT
4. Switch from 5x3 to 5x4
5. Verify: reel area shows 4 rows of smaller symbols
6. Verify: BET shows the 5x4 bet level (50 instead of 10)
7. Press 9 to close menu
8. Verify: SPIN works, wins are detected, jackpot bar ticks

- [ ] **Step 3: Test jurisdiction auto-switching**

In console:
```javascript
BlackIceMath.jurisdiction.set('GLI_CLASS_III')
// Should auto-set grid to 5x4
BlackIceMath.grid.get()  // '5x4'
BlackIceMath.reels.NUM_ROWS()  // 4
BlackIceMath.pay.NUM_LINES()  // 50
```

Then:
```javascript
BlackIceMath.jurisdiction.set('GEORGIA_COAM')
BlackIceMath.grid.get()  // '5x3'
BlackIceMath.reels.NUM_ROWS()  // 3
BlackIceMath.pay.NUM_LINES()  // 10
```

- [ ] **Step 4: Final commit**

```bash
git add blackice-math-engine.js game.html
git commit -m "feat: dual grid layout complete — 5x3 (10 lines) and 5x4 (50 lines)

5x3 for skill game markets (Georgia COAM) — smaller grid for meaningful Nudge/Switch.
5x4 for casino markets (GLI Class III) — matches Fire Link, 50 paylines.
Jurisdiction profiles set default grid, operator can override in settings.
Simulation validates both layouts across all 4 RTP settings."
```

---

## Dependency Graph

```
Task 1 (Grid config) ───┐
Task 2 (50 paylines) ───┤
Task 3 (5x4 strips) ────┼──→ Task 4 (Win detection) ──→ Task 5 (Bonus math)
                         │                                      │
Task 6 (Jurisdictions) ──┘──→ Task 7 (Simulation) ────────────→│
                                                                ▼
                              Task 8 (Visual layout) ──→ Task 9 (Operator menu)
                                                                │
                                                                ▼
                                                        Task 10 (Validate)
```

**Sequential:** Tasks 1-3 build engine foundations. Task 4 depends on 1-3. Tasks 6-7 can run after Task 4. Tasks 8-9 are visual layer. Task 10 validates everything.
