/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: MM.TITLE, // the name lives in js/title.js
  keys: [
    ['walk · in a shaft: get off on that side', '← → or A D'],
    ['open or close the door next to you', 'Space or ↑ or W'],
    ['2 players: Teddy walks and opens doors', 'A D · W'],
    ['2 players: Tommy walks and opens doors', '← → · ↑'],
    ['call your brother: he opens every door (2 players: high five)', 'T'],
    ['pause · sound', 'P or Esc · M'],
    ['title: 1 or 2 players · easy · normal · who plays', '1 2 · E · N · C'],
  ],
  note: 'Grab every lost toy to clear the mansion: two of the same kind in a row is a PAIR bonus. Walk off a floor into a shaft to bounce on its trampoline, and press ← or → to hop off at the next floor on that side. On NORMAL a trampoline tears if you come down on it a fifth time in a row. Open a door into a cat to bonk it; a glowing door sends a bubble wave that tumbles every cat ahead of it. Call your brother as often as you like.',
  touch: '◀ ▶ walk (and pick your side in a shaft), 🚪 opens doors, and your brother\'s face calls him. 2 players: each brother has his own ◀ ▶ 🚪 in his corner.',
});
