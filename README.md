# TT Mouse Mansion

[![TT Mouse Mansion title screen](docs/screenshot.jpg)](https://adong.github.io/mouse-mansion-tt/)

Press **?** any time (or tap the round **?** button on the left edge) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

**中文：** 老鼠大宅：Teddy 和 Tommy 戴上老鼠耳朵，在玩具大宅里的蹦床上蹦上蹦下，把丢了的玩具（小熊、机器人、小火车、小鼓、风筝）都找回来。调皮的猫咪会来追你：把门推开撞到猫咪，咚！发光的门会放出泡泡大浪，把猫咪全都冲走。

## Play

A one-screen arcade game in a toy mansion, starring Teddy and Tommy as little mouse heroes (mouse ears, a pink nose and a tail). Lost toys are scattered over four floors. Bounce up and down the trampoline shafts between the floors, run along the floors, and grab every toy to clear the mansion. Silly cats in party hats chase you. Nobody gets hurt: a cat that catches you just gives you a big hug, and a bubble floats you back to the start; cats that get bonked go dizzy, and cats in a bubble wave float away and come back later through the roof hatches.

A 3D game for the boys, built with Claude Code from plain JavaScript and Three.js on the shared Claude Games kit. There are no image, model or audio files: every texture is painted on a canvas and every sound is synthesised. The name, the mansion, the cats, the toys, the art and the sounds are our own.

- **Single page:** open `dist/mouse-mansion-tt.html` (double-click works offline), or `index.html` with the `js/` and `kit/` folders next to it.
- **Players:** 1 player (Teddy or Tommy, and the other brother comes whenever you call him), or 2 players together (two mice) on one keyboard or one iPad.
- **Level:** 🐣 **EASY** is the default, for Tommy (5): slow cats (2 to start, 3 later) that often wander off, trampolines that never tear, 5 lives, long dizzy spells. 🔥 **NORMAL** is for Teddy (8): faster cats (3 to start, up to 5) that chase longer, trampolines that wear out, 3 lives.
- **Score:** a toy is 300, a PAIR bonus 1,000, a door bonk 100, a bubble wave 200, 400, 800... per cat, a cleared mansion 1,000. An extra life at 20,000. HI-SCORE and the TOP MICE board (with Foxy 🦊 and Froggy 🐸, who sit on the roof and cheer) are kept for each level.

## The mansion

- **Four floors,** each cut into three rooms by four **trampoline shafts** (one at each wall, two inside), marked with ↕️ arrows on every floor. Each trampoline sits in its gap level with the ground floor, so it's the next step along it. Walk into a gap from any floor, either side, and you land on its trampoline and start bouncing (BOING!). Or press **↓** next to one and you walk onto it.
- **Bouncing:** you bounce up past the top floor and back down, again and again. The key you walked in with doesn't count, so holding → walks you onto a trampoline, never across it. Once you've bounced, press **←** or **→** (a tap is enough), going up or coming down, and you hop off that way straight away, onto the nearest floor. A wall side has no floor, so you just keep bouncing. Nobody can catch you on a trampoline.
- **Trampolines wear out** (NORMAL): each bounce in a row turns the mat from green to yellow, orange and then red (LAST BOUNCE!). Come down on it a fifth time in a row and it tears: RIIIP! PLOP! onto the basement pillow (a life). Hopping off onto a floor resets it. On EASY a trampoline never tears.
- **Doors:** press the door key next to a door to open or close it. A closed door stops mice and cats. A door always swings away from you: **open it into a cat to bonk it** (dizzy, knocked back). A **glowing door** (gold, with ✨) also sends a **bubble wave** along its floor that tumbles every cat ahead of it; they float away and come back later through the roof hatches. Each glowing door works once, then it's a plain door.
- **Toys:** a teddy bear 🧸, a robot 🤖, a toy train 🚂, a drum 🥁 and a kite 🪁, two of each. Grab two of the same kind in a row for a **PAIR** bonus. The HUD shows how many are left. Grab them all: MANSION CLEAR!, the brothers do their signature moves, confetti, and on to the next mansion.
- **Cats** drop in through the three hatches on the roof and find their way to the nearest mouse along the floors and down and up the shafts. When you're bouncing in a shaft, they wait for you beside it. Silly cats sometimes forget the chase and wander off for a bit (more often on EASY).
- **Six mansions,** each with its own doors and toys; after the sixth they come round again, with one more cat and a little faster.
- **2 players:** two mice in the same mansion, each with his own score and lives; cats go for whichever is nearer.

## Controls

| | 1 player | 2 players: Teddy | 2 players: Tommy |
|---|---|---|---|
| walk · on a trampoline: hop off that way | ← → or A D | A D | ← → |
| step onto the trampoline next to you | ↓ or S | S | ↓ |
| open or close a door | Space, ↑ or W | W | ↑ |
| call your brother · high five | T | T | T |
| pause · sound | P or Esc · M | | |

On the title: 1 / 2 players, E easy, N normal, C (or ← →) picks who plays, Enter starts.

**Touch:** ◀ ▶ bottom left, 🚪 DOOR and your brother's face bottom right. In 2 players each brother has his own ◀ ▶ 🚪 in his corner, and ✋ is the high five. The mansion fits the free part of the screen, beside or above the buttons, on phones and iPads.

## Call your brother (companion mode)

- **Any time, as often as you like:** press **T** or tap his face (1 player). Calling again while he's here makes him do it one more time.
- **He pops in** beside you on a little cloud at his own size, does his signature move (Teddy's boxing or 🏀 jump shot, Tommy's ✌️ Y pose) and tosses you a treat (🍦 💧 🧃 🍪 🍉 🍌, +100).
- **Then he flies up to the middle of the mansion and opens every door at once:** "TOMMY SAYS: DOORS OPEN!" Every closed door swings open, and every cat in the mansion tumbles away in a bubble (+200 each). They come back later through the roof hatches.
- **While he's here, no cat can hug you.**
- **2 players:** T is a high five (+50 each).

## The end

When the lives run out: the brothers do their signature moves on the ground floor, confetti, GREAT BOUNCING! (or GREAT TEAMWORK!), the TOP MICE board and PLAY AGAIN.

## How it's tested

- **The rules** (`js/sim.js`) run without drawing in fixed 1/60 s steps, so the page, the autopilot (`js/bot.js`) and the checks share them.
- **The headless check:** `node tools/check.js` (or `game.check()` in the page) checks the brief's rules on the real rules: every shaft bounces past the top floor and lets you off on either side with a floor (never through a wall); walking into any shaft of any mansion from any floor and either side while holding the key (288 walks, EASY and NORMAL) always puts you on the trampoline bouncing, never across it, and a fresh press hops you off within half a second onto the nearest floor that way; ↓ beside a shaft walks you on; on NORMAL the fifth landing in a row tears the trampoline (a plop, a life) and getting off resets the count, on EASY it never tears; opening every door of all six mansions from both sides bonks the cat in front and no cat behind, 4 m past or upstairs; closed doors stop cats and mice; every glowing door's wave tumbles every cat ahead on its floor and nobody else; two of a kind in a row is a PAIR and two different kinds aren't; each mansion ends when the last toy is collected, not one sooner; and in 264 chases on all six mansions, closed doors and all, a cat from each room finds a mouse waiting in any other room along the floors and shafts. Plus hugs (only on floors), the companion (unlimited, opens every door, every cat tumbles and comes back), nothing stuck, and the autopilot clearing all six mansions on EASY and NORMAL.
- **It can fail:** `node tools/check.js --fail` turns on 16 sabotages one at a time (no wear, wear on EASY, no getting off, the key you walk in with taking you straight across (the old bug), presses waiting for the next floor, a dead ↓, no bonks, bonking the whole floor, no wave, no pairs, every two toys a pair, mansions that never end or end a toy early, lost cats, harmless cats, a lazy brother); each must be caught.
- **Real keys:** `game.playCheck()` (run by `node tools/shoot.js tools/keys.json`) presses real `keydown`/`keyup` events on `window` and taps the touch buttons with pointer events, never the autopilot: → moves right and ← left on screen in all 12 rooms of all six mansions, for Teddy, Tommy and each brother in 2 players (only his own mouse), keys and touch; in every shaft → gets off on the right of the screen and ← on the left (and never through a wall), keys and touch, on every mansion; the way Alan plays, holding → (or ←) and walking into every shaft from every floor and both sides, on every mansion, puts you on the trampoline bouncing, never across it, and the same with tapped keys, a held touch button and ↓; and ← or → mid-bounce, going up or down at any height, starts the hop off that way within 0.12 s; walking off a floor drops you onto the trampoline; the door key and 🚪 open a door into a cat and bonk it; and nothing leaves him stuck (a key held through pause, a lost window, a cancelled touch, a door closed on him, a hug, a torn trampoline, the companion, the next mansion, a keyboard kid mashing keys on every mansion). `game.playCheck('mirror')`, `game.playCheck('stuckShaft')`, `game.playCheck('holdThrough')` (the old walk-across trampolines) and `game.playCheck('waitFloor')` (the old wait-for-the-next-floor) must fail.
- **中文:** `node tools/shoot.js tools/zh.json` visits every screen in 中文 (`Kit.lang.untranslated()` is empty on each) and checks English mode shows no Chinese. `tools/layout.json` checks phone portrait and landscape and iPads with touch: no overlaps, no scrolling. `tools/dist.json` checks the single page from `file://`.
- **docs/screenshot.jpg:** `node tools/shoot.js tools/shots.json docs 1200 750`.
- Tests run muted; sound is checked in code (`game.state().sfx` counts every effect).

## Not verified

- **Sound:** every sound is synthesised and counted in code, but nobody has listened to it (tests ran muted).
- **Real devices:** touch was driven with synthetic pointer events in emulated phones and iPads, not on a real iPad or iPhone. Frame rate was only seen in headless software rendering, not on an older iPad. On a phone held upright the mansion is small (about 13 pixels a metre); sideways or on an iPad it's comfortable.
- **Real kids:** how hard Easy and Normal feel was tuned with an autopilot that can't be hugged, not with Teddy and Tommy.
- **A real Finder double-click,** the home-screen icon on a real iPad, and the offline font fallback.
