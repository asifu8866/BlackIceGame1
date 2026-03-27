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

    function cryptoRandom() {
        var arr = new Uint32Array(1);
        window.crypto.getRandomValues(arr);
        return arr[0] / 4294967296;
    }

    function cryptoRandomInt(max) {
        return Math.floor(cryptoRandom() * max);
    }

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
        return items.length - 1;
    }

    function shuffle(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = cryptoRandomInt(i + 1);
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
    }

    // ===== SYMBOL DEFINITIONS — DAY OF THE DEAD =====
    // 12 symbols: 5 high-pay characters, 4 low-pay objects, 3 specials

    var SYMBOLS = [
        { idx: 0,  name: 'WILD',       label: 'Sugar Skull',       type: 'wild',    pay: [100, 500, 2000] },
        { idx: 1,  name: 'LA_CATRINA', label: 'La Catrina',        type: 'high',    pay: [50, 200, 1000] },
        { idx: 2,  name: 'MARIACHI_S', label: 'Mariachi Singer',   type: 'high',    pay: [25, 100, 500] },
        { idx: 3,  name: 'DANCER',     label: 'Skeleton Dancer',   type: 'high',    pay: [20, 75, 300] },
        { idx: 4,  name: 'GUITARIST',  label: 'Mariachi Guitarist',type: 'high',    pay: [15, 50, 200] },
        { idx: 5,  name: 'TEQUILA',    label: 'Tequila Bottle',    type: 'low',     pay: [10, 30, 150] },
        { idx: 6,  name: 'MARIGOLD',   label: 'Marigold Flower',   type: 'low',     pay: [10, 25, 100] },
        { idx: 7,  name: 'CANDLES',    label: 'Altar Candles',     type: 'low',     pay: [5, 20, 75] },
        { idx: 8,  name: 'GUITAR',     label: 'Acoustic Guitar',   type: 'low',     pay: [5, 15, 50] },
        { idx: 9,  name: 'SCATTER',    label: 'Ofrenda Altar',     type: 'scatter', pay: [0, 0, 0] },
        { idx: 10, name: 'FIREBALL',   label: 'Flame Skull',       type: 'fireball',pay: [0, 0, 0] },
        { idx: 11, name: 'JACKPOT_SYM',label: 'Golden Marigold',   type: 'jackpot', pay: [0, 0, 0] }
    ];

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

    // ===== REEL STRIP DEFINITIONS =====
    // 5 reels x 48 stops each, 4 RTP variants
    // Tuned for 40% hit frequency
    // 92% is the base. Other RTPs modify WILD/low-pay counts.

    var NUM_REELS = 5;
    var NUM_ROWS = 3;

    var STRIPS_92 = [
        [8,7,6,5,4,3,2,1,8,7,6,5,10,8,7,6,5,4,3,0,8,7,6,5,4,3,2,8,7,6,5,4,9,8,7,6,5,4,3,2,1,8,7,6,5,10,8,7],
        [7,6,5,4,3,2,1,8,7,6,5,4,8,7,6,5,10,8,7,6,5,4,3,0,8,7,6,5,4,3,2,9,8,7,6,5,4,3,2,1,8,7,6,5,4,10,8,7],
        [6,5,4,3,2,8,7,6,5,4,3,1,8,7,6,5,4,0,8,7,6,5,4,3,2,10,8,7,6,5,4,3,9,8,7,6,5,4,3,2,1,8,7,6,5,4,10,8],
        [5,4,3,2,1,8,7,6,5,4,3,8,7,6,5,4,10,8,7,6,5,4,3,0,8,7,6,5,4,3,2,9,8,7,6,5,4,3,2,1,8,7,6,5,4,10,8,7],
        [4,3,2,1,8,7,6,5,4,3,8,7,6,5,10,8,7,6,5,4,3,0,8,7,6,5,4,3,2,9,8,7,6,5,4,3,2,1,8,7,6,5,4,3,10,8,7,6]
    ];

    var STRIPS_88 = [
        STRIPS_92[0].slice(),
        STRIPS_92[1].slice(),
        (function() { var s = STRIPS_92[2].slice(); var wi = s.indexOf(0); if (wi !== -1) s[wi] = 8; return s; })(),
        STRIPS_92[3].slice(),
        STRIPS_92[4].slice()
    ];

    var STRIPS_86 = [
        STRIPS_88[0].slice(),
        (function() { var s = STRIPS_88[1].slice(); var mi = s.indexOf(6); if (mi !== -1) s[mi] = 8; return s; })(),
        STRIPS_88[2].slice(),
        STRIPS_88[3].slice(),
        STRIPS_88[4].slice()
    ];

    var STRIPS_96 = [
        STRIPS_92[0].slice(),
        STRIPS_92[1].slice(),
        (function() { var s = STRIPS_92[2].slice(); var gi = s.lastIndexOf(8); if (gi !== -1) s[gi] = 0; return s; })(),
        STRIPS_92[3].slice(),
        STRIPS_92[4].slice()
    ];

    var STRIP_LENGTH = 48;
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

    // ===== PAYTABLE =====
    var PAYTABLE = {};
    for (var i = 0; i < SYMBOLS.length; i++) {
        if (SYMBOLS[i].pay[0] > 0) {
            PAYTABLE[SYMBOLS[i].name] = SYMBOLS[i].pay;
        }
    }

    // ===== PAYLINES =====
    var PAYLINES = [
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

    var NUM_PAYLINES = PAYLINES.length;

    // ===== BET LEVELS =====
    var BET_LEVELS = [10, 20, 50, 100, 200];
    var DEFAULT_BET = 10;

    // ===== SPIN RESOLUTION =====
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
    function checkPaylineWins(grid, betPerLine) {
        var wins = [];

        for (var p = 0; p < PAYLINES.length; p++) {
            var line = PAYLINES[p];
            var lineSyms = [];
            for (var r = 0; r < NUM_REELS; r++) {
                lineSyms.push(grid[r][line[r]]);
            }

            var first = lineSyms[0];
            if (isSpecial(first)) continue;

            var matchCount = 1;
            var resolvedSym = first; // What the line is "paying as" — updates when first WILD resolves
            for (var m = 1; m < NUM_REELS; m++) {
                var sym = lineSyms[m];
                if (isSpecial(sym)) break;

                if (isWild(sym)) {
                    // WILD extends the chain, adopts whatever resolvedSym is
                    matchCount++;
                } else if (isWild(resolvedSym)) {
                    // First non-WILD seen: lock in what WILDs substitute for
                    resolvedSym = sym;
                    matchCount++;
                } else if (sym === resolvedSym) {
                    matchCount++;
                } else {
                    break;
                }
            }

            if (matchCount >= 3) {
                var paySym = SYMBOLS[resolvedSym].name;
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

    function countScatters(grid) {
        var count = 0;
        for (var r = 0; r < NUM_REELS; r++) {
            for (var row = 0; row < NUM_ROWS; row++) {
                if (isScatter(grid[r][row])) count++;
            }
        }
        return count;
    }

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

    function recheckWins(grid, betPerLine) {
        return checkPaylineWins(grid, betPerLine);
    }

    // ===== HOLD & SPIN BONUS MATH =====
    var BONUS_INITIAL_FIREBALLS = 6;
    var BONUS_FIREBALL_CHANCE = 0.20;
    var BONUS_RESPINS = 3;
    var BONUS_TRIGGER_MIN = 80;
    var BONUS_TRIGGER_MAX = 120;

    function rollNextBonusTrigger() {
        return BONUS_TRIGGER_MIN + cryptoRandomInt(BONUS_TRIGGER_MAX - BONUS_TRIGGER_MIN + 1);
    }

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

    var JACKPOT_CHANCE = 0.03;

    function randomFireballValue(totalBet) {
        if (cryptoRandom() < JACKPOT_CHANCE) {
            return randomJackpotValue();
        }
        var idx = weightedRandom(FIREBALL_VALUE_TABLE);
        var creditValue = Math.round(FIREBALL_VALUE_TABLE[idx].mult * totalBet);
        return { value: creditValue, label: formatCredits(creditValue), color: '#FFFFFF', isJackpot: false };
    }

    function initBonusGrid(fireballPositions, totalBet) {
        var grid = [];
        for (var r = 0; r < NUM_REELS; r++) {
            grid[r] = [];
            for (var row = 0; row < NUM_ROWS; row++) {
                grid[r][row] = null;
            }
        }
        for (var i = 0; i < fireballPositions.length; i++) {
            var pos = fireballPositions[i];
            grid[pos.reel][pos.row] = randomFireballValue(totalBet);
        }
        return grid;
    }

    function resolveBonusRespin(bonusGrid, totalBet) {
        // Deep copy so caller retains the 'before' state for animation
        var grid = bonusGrid.map(function(col) { return col.slice(); });
        var newLands = [];
        for (var r = 0; r < NUM_REELS; r++) {
            for (var row = 0; row < NUM_ROWS; row++) {
                if (grid[r][row] === null) {
                    if (cryptoRandom() < BONUS_FIREBALL_CHANCE) {
                        grid[r][row] = randomFireballValue(totalBet);
                        newLands.push({ reel: r, row: row });
                    }
                }
            }
        }

        var isFull = true;
        for (var r = 0; r < NUM_REELS; r++) {
            for (var row = 0; row < NUM_ROWS; row++) {
                if (grid[r][row] === null) { isFull = false; break; }
            }
            if (!isFull) break;
        }

        var total = 0;
        for (var r = 0; r < NUM_REELS; r++) {
            for (var row = 0; row < NUM_ROWS; row++) {
                if (grid[r][row]) total += grid[r][row].value;
            }
        }

        return {
            grid: grid,
            newLands: newLands,
            gotNewFireball: newLands.length > 0,
            isFull: isFull,
            totalValue: total
        };
    }

    // ===== FREE SPINS BONUS =====
    var FREE_SPIN_AWARDS = { 3: 8, 4: 12, 5: 20 };
    var FREE_SPIN_WILD_MULTIPLIER = 2;

    function getFreeSpinCount(scatterCount) {
        return FREE_SPIN_AWARDS[scatterCount] || 0;
    }

    function resolveFreeSpinSpin(betPerLine, totalBet) {
        var result = resolveSpin(betPerLine, totalBet);

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

        result.totalWin = 0;
        for (var i = 0; i < result.wins.length; i++) {
            result.totalWin += result.wins[i].payout;
        }

        result.retriggerSpins = getFreeSpinCount(result.scatterCount);

        return result;
    }

    // ===== JACKPOT SYSTEM =====
    var JACKPOT_TIERS = [
        { name: 'MINI',  seed: 20,    feed: 0.005, weight: 60, color: '#44FF44' },
        { name: 'MINOR', seed: 50,    feed: 0.003, weight: 25, color: '#44BBFF' },
        { name: 'MAJOR', seed: 1000,  feed: 0.001, weight: 12, color: '#FFD700' },
        { name: 'MEGA',  seed: 10000, feed: 0.001, weight: 3,  color: '#FF2222' }
    ];

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
            pool.current += totalBet * pool.feed;
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

    // ===== MULTI-JURISDICTION CONFIG =====
    var JURISDICTIONS = {
        GEORGIA_COAM: {
            name: 'Georgia COAM (Class B Skill Game)',
            skillEnabled: true,
            skillRTPRange: [85, 96],
            protocol: 'SAS_602',
            payoutMethod: 'GIFT_CARD',
            responsibleGaming: true,
            creditCarryOver: true
        },
        GLI_CLASS_III: {
            name: 'GLI Class III (Casino/Game Room)',
            skillEnabled: false,
            skillRTPRange: null,
            protocol: 'SAS_G2S',
            payoutMethod: 'CASH',
            responsibleGaming: false,
            creditCarryOver: false
        },
        GLI_CLASS_II: {
            name: 'GLI Class II (Tribal Casino)',
            skillEnabled: false,
            skillRTPRange: null,
            protocol: 'GLI_33',
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

    // ===== SIMULATION ENGINE =====
    function runSimulation(numSpins) {
        numSpins = numSpins || 100000;
        var results = {};

        [86, 88, 92, 96].forEach(function(rtp) {
            var savedRTP = currentRTP;
            currentRTP = rtp;

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
                baseGameRTP: (totalPaid / totalWagered * 100).toFixed(2) + '% (base game only, excludes bonus/FS/JP)',
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

})();
