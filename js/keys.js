/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: MM.TITLE, // the name lives in js/title.js
  keys: [
    ['walk · on a trampoline: hop off that way', '← → or A D'],
    ['step onto the trampoline next to you', '↓ or S'],
    ['open or close the door next to you', 'Space or ↑ or W'],
    ['2 players: Teddy walks, hops on, opens doors', 'A D · S · W'],
    ['2 players: Tommy walks, hops on, opens doors', '← → · ↓ · ↑'],
    ['call your brother: he opens every door (2 players: high five)', 'T'],
    ['pause · sound', 'P or Esc · M'],
    ['title: 1 or 2 players · easy · normal · who plays', '1 2 · E · N · C'],
  ],
  note: 'Grab every lost toy to clear the mansion: two of the same kind in a row is a PAIR bonus. Walk into a gap with a trampoline (the ↕️ arrows) to bounce on it, or press ↓ next to one. While you bounce, press ← or → to hop off onto the nearest floor that way. On NORMAL a trampoline tears if you come down on it a fifth time in a row. Open a door into a cat to bonk it; a glowing door sends a bubble wave that tumbles every cat ahead of it. Call your brother as often as you like.',
  touch: '◀ ▶ walk (on a trampoline they hop you off that way), 🚪 opens doors, and your brother\'s face calls him. 2 players: each brother has his own ◀ ▶ 🚪 in his corner.',
});
