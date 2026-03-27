#!/usr/bin/env node
/* =============================================================
   BLACK ICE GAMING - PROGRESSIVE JACKPOT RELAY SERVER

   This tiny Node.js server links jackpot pools across multiple
   cabinets on the same local network. One machine runs this relay,
   and all other cabinets connect to it via WebSocket on port 9200.

   HOW TO RUN:
     node jackpot-relay.js

   The relay:
   - Holds the shared jackpot pool values
   - Receives feed contributions from each cabinet after every spin
   - Broadcasts updated pool totals to all connected cabinets every second
   - Notifies all cabinets when a jackpot is won anywhere on the network
   - Saves pool state to disk so values survive a restart

   REQUIREMENTS:
     Node.js 14+ (included with Windows 10 IoT)
     No npm packages needed - uses built-in 'ws' via raw HTTP upgrade
   ============================================================= */

const http = require('http');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ===== CONFIGURATION =====
const PORT = 9200;
const SAVE_FILE = path.join(__dirname, 'jackpot-state.json');
const BROADCAST_INTERVAL = 1000; // broadcast pool totals every 1 second

// ===== JACKPOT POOL STATE =====
// These match the seed values in game.html
let pools = {
    'MINI':  { current: 50,    seed: 50 },
    'MINOR': { current: 200,   seed: 200 },
    'MAJOR': { current: 1000,  seed: 1000 },
    'MEGA':  { current: 10000, seed: 10000 }
};

// Load saved state if it exists
function loadState() {
    try {
        if (fs.existsSync(SAVE_FILE)) {
            const data = JSON.parse(fs.readFileSync(SAVE_FILE, 'utf8'));
            for (const name in data.pools) {
                if (pools[name]) {
                    pools[name].current = data.pools[name].current;
                }
            }
            console.log('[RELAY] Loaded saved pool state from disk');
        }
    } catch (e) {
        console.log('[RELAY] No saved state found, using seed values');
    }
}

// Save state to disk
function saveState() {
    try {
        const data = { pools: pools, savedAt: new Date().toISOString() };
        fs.writeFileSync(SAVE_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[RELAY] Failed to save state:', e.message);
    }
}

// ===== CONNECTED CLIENTS =====
const clients = new Map(); // socket → { machineId, alive }

// ===== WEBSOCKET SERVER (no dependencies) =====
// Implements the WebSocket handshake and framing protocol directly.
// This avoids needing to install any npm packages on the cabinet.

const server = http.createServer(function(req, res) {
    // Simple status page for debugging
    res.writeHead(200, { 'Content-Type': 'application/json' });
    const status = {
        service: 'Black Ice Progressive Jackpot Relay',
        port: PORT,
        connectedCabinets: clients.size,
        machines: Array.from(clients.values()).map(c => c.machineId),
        pools: {}
    };
    for (const name in pools) {
        status.pools[name] = '$' + pools[name].current.toFixed(2);
    }
    res.end(JSON.stringify(status, null, 2));
});

// Handle WebSocket upgrade
server.on('upgrade', function(req, socket, head) {
    // Verify it's a WebSocket request
    if (req.headers['upgrade'] !== 'websocket') {
        socket.destroy();
        return;
    }

    // Complete the WebSocket handshake
    const key = req.headers['sec-websocket-key'];
    const acceptKey = crypto
        .createHash('sha1')
        .update(key + '258EAFA5-E914-47DA-95CA-5AB5DC085B63')
        .digest('base64');

    socket.write(
        'HTTP/1.1 101 Switching Protocols\r\n' +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        'Sec-WebSocket-Accept: ' + acceptKey + '\r\n' +
        '\r\n'
    );

    // Track this client
    const clientInfo = { machineId: 'unknown', alive: true };
    clients.set(socket, clientInfo);
    console.log('[RELAY] Cabinet connected (' + clients.size + ' total)');

    // Handle incoming data
    let buffer = Buffer.alloc(0);

    socket.on('data', function(data) {
        buffer = Buffer.concat([buffer, data]);

        // Parse WebSocket frames
        while (buffer.length >= 2) {
            const firstByte = buffer[0];
            const secondByte = buffer[1];
            const opcode = firstByte & 0x0F;
            const masked = (secondByte & 0x80) !== 0;
            let payloadLength = secondByte & 0x7F;
            let offset = 2;

            if (payloadLength === 126) {
                if (buffer.length < 4) return;
                payloadLength = buffer.readUInt16BE(2);
                offset = 4;
            } else if (payloadLength === 127) {
                if (buffer.length < 10) return;
                payloadLength = Number(buffer.readBigUInt64BE(2));
                offset = 10;
            }

            if (masked) offset += 4;
            if (buffer.length < offset + payloadLength) return;

            // Unmask the payload
            let payload = buffer.slice(offset, offset + payloadLength);
            if (masked) {
                const maskKey = buffer.slice(offset - 4, offset);
                for (let i = 0; i < payload.length; i++) {
                    payload[i] ^= maskKey[i % 4];
                }
            }

            buffer = buffer.slice(offset + payloadLength);

            // Handle the frame
            if (opcode === 0x08) {
                // Close frame
                socket.end();
                return;
            } else if (opcode === 0x09) {
                // Ping - send pong
                sendFrame(socket, payload, 0x0A);
            } else if (opcode === 0x01) {
                // Text frame - parse JSON message
                try {
                    const msg = JSON.parse(payload.toString());
                    handleMessage(socket, clientInfo, msg);
                } catch (e) {
                    // Ignore malformed messages
                }
            }
        }
    });

    socket.on('close', function() {
        console.log('[RELAY] Cabinet disconnected: ' + clientInfo.machineId + ' (' + (clients.size - 1) + ' remaining)');
        clients.delete(socket);
    });

    socket.on('error', function() {
        clients.delete(socket);
    });
});

// Send a WebSocket frame
function sendFrame(socket, data, opcode) {
    if (!opcode) opcode = 0x01; // text frame
    const payload = typeof data === 'string' ? Buffer.from(data) : data;
    const length = payload.length;

    let header;
    if (length < 126) {
        header = Buffer.alloc(2);
        header[0] = 0x80 | opcode; // FIN + opcode
        header[1] = length;
    } else if (length < 65536) {
        header = Buffer.alloc(4);
        header[0] = 0x80 | opcode;
        header[1] = 126;
        header.writeUInt16BE(length, 2);
    } else {
        header = Buffer.alloc(10);
        header[0] = 0x80 | opcode;
        header[1] = 127;
        header.writeBigUInt64BE(BigInt(length), 2);
    }

    try {
        socket.write(Buffer.concat([header, payload]));
    } catch (e) {
        // Socket may have closed
    }
}

// Send JSON message to a client
function sendJSON(socket, obj) {
    sendFrame(socket, JSON.stringify(obj));
}

// Broadcast JSON to all connected clients
function broadcast(obj) {
    const data = JSON.stringify(obj);
    for (const [socket] of clients) {
        sendFrame(socket, data);
    }
}

// ===== MESSAGE HANDLING =====
function handleMessage(socket, clientInfo, msg) {
    // Cabinet registering itself
    if (msg.type === 'register') {
        clientInfo.machineId = msg.machineId || 'unknown';
        console.log('[RELAY] Registered: ' + clientInfo.machineId);

        // Send current pool state immediately
        const poolValues = {};
        for (const name in pools) poolValues[name] = pools[name].current;
        sendJSON(socket, { type: 'pools', pools: poolValues });
    }

    // Cabinet sending its jackpot feed contribution after a spin
    if (msg.type === 'feed' && msg.pools) {
        for (const name in msg.pools) {
            if (pools[name]) {
                pools[name].current += msg.pools[name];
                pools[name].current = Math.round(pools[name].current * 100) / 100;
            }
        }
    }

    // Cabinet won a jackpot - reset pool and notify everyone
    if (msg.type === 'award' && msg.jackpot) {
        const name = msg.jackpot;
        if (pools[name]) {
            const amount = Math.floor(pools[name].current);
            pools[name].current = pools[name].seed;
            console.log('[RELAY] ' + clientInfo.machineId + ' won ' + name + ' jackpot: $' + amount);

            // Notify all cabinets about the win
            broadcast({
                type: 'jackpot_won',
                jackpot: name,
                machine: clientInfo.machineId,
                amount: amount
            });

            // Save state after jackpot win
            saveState();
        }
    }
}

// ===== PERIODIC BROADCAST =====
// Send current pool totals to all clients every second
// This keeps all cabinet displays in sync
setInterval(function() {
    if (clients.size === 0) return;

    const poolValues = {};
    for (const name in pools) poolValues[name] = pools[name].current;

    broadcast({ type: 'pools', pools: poolValues });

    // Save state every 30 seconds
    if (Date.now() % 30000 < BROADCAST_INTERVAL) {
        saveState();
    }
}, BROADCAST_INTERVAL);

// ===== START SERVER =====
loadState();

server.listen(PORT, '0.0.0.0', function() {
    console.log('');
    console.log('  ========================================');
    console.log('  BLACK ICE - PROGRESSIVE JACKPOT RELAY');
    console.log('  ========================================');
    console.log('  Port: ' + PORT);
    console.log('  Status: http://localhost:' + PORT);
    console.log('  Pools:');
    for (const name in pools) {
        console.log('    ' + name + ': $' + pools[name].current.toFixed(2));
    }
    console.log('  ========================================');
    console.log('  Waiting for cabinets to connect...');
    console.log('');
});

// Save state on shutdown
process.on('SIGINT', function() {
    console.log('\n[RELAY] Saving state and shutting down...');
    saveState();
    process.exit(0);
});

process.on('SIGTERM', function() {
    saveState();
    process.exit(0);
});
