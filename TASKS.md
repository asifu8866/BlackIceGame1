# Black Ice Gaming - Task List

## Phase 1: Visual Demo
> Spinning reels, symbols, basic animations

- [x] Set up HTML5 Canvas game area (1920x1080 for cabinet display)
- [x] Create symbol artwork (Cherry, Bar, Double Bar, Triple Bar, Seven, Bell, Diamond, Wild, Fireball, Blank)
- [x] Build 5-reel layout with 3 visible rows each
- [x] Animate reel spinning with smooth start and stop
- [x] Add spin button and credit display UI
- [x] Add win line highlight animations
- [ ] Add symbol landing effects and sound triggers

## Phase 2: Game Logic
> Math engine, win calculations, bonus mechanics

- [ ] Build reel strip weight tables for 88%, 92%, and 96% RTP
- [ ] Implement 10-payline win detection
- [ ] Create paytable with correct symbol values
- [ ] Build Hold and Spin bonus trigger (every 80-120 spins)
- [ ] Implement Fireball lock mechanic during Hold and Spin
- [ ] Add 4-level jackpot system (Mini, Minor, Major, Mega)
- [ ] Add Nudge skill feature (shift reel one position)
- [ ] Add Symbol Switch skill feature
- [ ] Implement credit system (bet sizes, win payouts)
- [ ] Hit frequency validation - confirm 32% target

## Phase 3: Hardware Prep
> JAMMA buttons, fullscreen kiosk, bill acceptor

- [ ] Map JAMMA 36-pin button inputs to keyboard events
- [ ] Set up fullscreen kiosk mode (no browser toolbar)
- [ ] Integrate bill acceptor communication
- [ ] Integrate TITO ticket printer
- [ ] Build operator settings menu (RTP select, volume, diagnostics)
- [ ] Test on Intel i5 / Windows 10 IoT target hardware

## Phase 4: Multi-Theme
> Game 2, Game 3, theme selection menu

- [ ] Build theme selection menu screen
- [ ] Create Game 2 theme with new symbol set
- [ ] Create Game 3 theme with new symbol set
- [ ] Shared math engine across all themes
- [ ] Theme-specific animations and color palettes

## Phase 5: Network
> Progressive jackpot linking across machines

- [ ] Design progressive jackpot protocol
- [ ] Build local network discovery between cabinets
- [ ] Implement shared jackpot pool across linked machines
- [ ] Add SAS (Slot Accounting System) reporting
- [ ] Build back-office dashboard for operators

## Phase 6: Polish
> Performance optimization, testing, demo mode

- [ ] Performance optimization for smooth 60fps on target hardware
- [ ] Build demo/attract mode for idle cabinets
- [ ] Final math verification (10M+ spin simulation)
- [ ] GLI certification prep and documentation
- [ ] Create operator manual and setup guide
- [ ] Package final build for cabinet deployment
