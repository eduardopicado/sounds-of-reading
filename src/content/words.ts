/*  words.ts — THE content file.
 *
 *  Every game reads this and only this. Adding a word, a sound or a whole level
 *  means editing this file, never a game.
 *
 *  ── How to write a word ────────────────────────────────────────────────────
 *  Words live in a `words:` string, one word per `|`, with an optional emoji:
 *
 *      words: 'ship 🚢 | fish 🐟 | shed 🏚 | brush 🪥'
 *
 *  The app has to know exactly which letters to underline. Normally it works
 *  that out on its own, because the sound's spelling appears once. When it
 *  appears twice, put the letters you mean in brackets:
 *
 *      'ba[th] 🛁'          underline the th in bath
 *      'thir[th]een'        the second th, not the first
 *      'c[a]k[e] 🎂'        a split digraph: two pieces, both underlined
 *
 *  If the spelling appears more than once and you have NOT bracketed it, the
 *  content test fails and tells you which word. It never guesses. (The old
 *  prototypes guessed with indexOf and underlined "in *the* bath".)
 *
 *  ── Levels ────────────────────────────────────────────────────────────────
 *  `level` is the level a child must have reached to decode the word — the
 *  latest grapheme it contains, not just the one it practises. "phone" targets
 *  ph (level 4) but its o_e is level 7, so phone is level 7.
 *
 *  ── Colour ────────────────────────────────────────────────────────────────
 *  A sound owns a `hue`, and the app derives two tones from it: a deep one for
 *  the underline and a light one for chip fills. Both are contrast-checked by
 *  the content test. Never set colour as text colour — dark ink always.
 */

export type Level = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface SoundSpec {
  /** stable id, used in saved settings — renaming one resets a parent's picks */
  id: string;
  /** what the chip shows the child */
  label: string;
  /** the example word the school sheet uses */
  asIn: string;
  /** the letters that write this sound. First one is the canonical spelling. */
  spellings: string[];
  level: Level;
  /** true if a game may use this as a target to sort, call or collect */
  practice: boolean;
  /** only needed when `practice` is true — non-practice graphemes are never drawn */
  hue?: number;
  /** sounds that share a group are two spellings of one sound (ai/ay, ee/ea) */
  group?: string;
  words?: string;
  /** pronounceable non-words that DO contain the target spelling */
  silly?: string;
}

/** The school's eight levels. Each one includes everything before it. */
export const LEVELS: { n: Level; name: string; blurb: string }[] = [
  { n: 1, name: 'Level 1', blurb: 's a t p i n' },
  { n: 2, name: 'Level 2', blurb: 'm d g o c k ck e u r' },
  { n: 3, name: 'Level 3', blurb: 'b h f l j v w x y z' },
  { n: 4, name: 'Level 4', blurb: 'sh ch th qu ng wh' },
  { n: 5, name: 'Level 5', blurb: 'ai ay ea ee ie igh oa ow' },
  { n: 6, name: 'Level 6', blurb: 'oi oy oo ou ow er ir ur ar or' },
  { n: 7, name: 'Level 7', blurb: 'a_e e_e i_e o_e u_e' },
  { n: 8, name: 'Level 8', blurb: 'aw air are ear eer ore dge tch' },
];

/*  ── The sounds ────────────────────────────────────────────────────────────
 *  Ordered by the level that introduces them. `practice: false` means the
 *  grapheme still counts towards working out a word's level, but no game
 *  offers it as a target — nobody wants to sort words by "tt".
 *
 *  A word may carry its own level with `@n` when it needs a later grapheme
 *  than the sound it practises: 'mother 👩 @6' is a th word, but its er is
 *  level 6, so a level 4 child never sees it.
 */
export const SOUNDS: SoundSpec[] = [
  /* ── Level 1 ───────────────────────────────────────────────────────────── */
  { id: 's', label: 's', asIn: 'sat', spellings: ['s'], level: 1, practice: true, hue: 14,
    words: 'sat | sit 🪑 | sip 🥤 | sap | snap 🫰 | snip ✂️ | spit 💦 | spat | pits | pins 📌 | tins 🥫 | taps 🚰',
    silly: 'sint | sinn | [s]as | [s]ast | sann' },
  { id: 'a', label: 'a', asIn: 'ant', spellings: ['a'], level: 1, practice: true, hue: 151,
    words: 'at | an | sat | pat | tap 🚰 | nap 😴 | pan 🍳 | tan | sap | snap 🫰 | spat | ants 🐜',
    silly: 'sas | sast | sann | tast | tant | tann | pann | nast | nant | nann' },
  { id: 't', label: 't', asIn: 'tap', spellings: ['t'], level: 1, practice: true, hue: 288,
    words: 'at | it | tap 🚰 | tip 💡 | tin 🥫 | tan | sat | pat | pit 🕳 | spit 💦 | spat | taps 🚰',
    silly: '[t]ant | [t]ast | tann | tinn | [t]ist' },
  { id: 'p', label: 'p', asIn: 'pin', spellings: ['p'], level: 1, practice: true, hue: 65,
    words: 'pat | pin 📌 | pit 🕳 | pan 🍳 | tap 🚰 | tip 💡 | nap 😴 | sip 🥤 | sap | spit 💦 | snap 🫰 | pants 👖',
    silly: 'pinn | pist | pann' },
  { id: 'i', label: 'i', asIn: 'pin', spellings: ['i'], level: 1, practice: true, hue: 202,
    words: 'it | in | sit 🪑 | sip 🥤 | pin 📌 | pit 🕳 | tip 💡 | tin 🥫 | spit 💦 | snip ✂️ | spin 🌀 | pins 📌',
    silly: 'sint | sinn | tist | tinn | pist | pinn | nin | nist | nint | ninn' },
  { id: 'n', label: 'n', asIn: 'nap', spellings: ['n'], level: 1, practice: true, hue: 339,
    words: 'an | in | nap 😴 | nip | pan 🍳 | pin 📌 | tan | tin 🥫 | snap 🫰 | snip ✂️ | spin 🌀 | ants 🐜',
    silly: '[n]in | [n]inn | [n]int | nist | nast | [n]ant | [n]ann' },
  { id: 'nn', label: 'nn', asIn: 'inn', spellings: ['nn'], level: 1, practice: false },

  /* ── Level 2 ───────────────────────────────────────────────────────────── */
  { id: 'm', label: 'm', asIn: 'map', spellings: ['m'], level: 2, practice: true, hue: 76,
    words: 'mat 🧘 | map 🗺 | man 👨 | mud | mug ☕ | mop 🧹 | met | mess | moss | mist 🌫 | camp ⛺ | drum 🥁',
    silly: 'menk | menn | mesk | mok | muk | mip | mit | mik | mep | mup' },
  { id: 'd', label: 'd', asIn: 'dog', spellings: ['d'], level: 2, practice: true, hue: 213,
    words: 'dog 🐕 | dot ⚫ | dig ⛏ | den 🏕 | duck 🦆 | dust | drum 🥁 | red 🟥 | mud | sad 😢 | desk 🪑 | pond',
    silly: 'dut | det | donk | donn | duss | dosk | dont | [d]ed | dat | dek' },
  { id: 'g', label: 'g (girl)', asIn: 'got', spellings: ['g'], level: 2, practice: true, hue: 350,
    words: 'got | gum | gap | gas ⛽ | grin 😁 | grass 🌿 | dog 🐕 | pig 🐷 | big | mug ☕ | rug 🧶 | e[g]g 🥚',
    silly: 'gomp | gont | gind | gock | gisk | gint | giss | gick | gend | gesk' },
  { id: 'o', label: 'o', asIn: 'dog', spellings: ['o'], level: 2, practice: true, hue: 127,
    words: 'on | got | dog 🐕 | dot ⚫ | mop 🧹 | top 🔝 | pot 🍲 | rock 🪨 | sock 🧦 | pond | cot 🛏 | moss',
    silly: 'sok | sost | sond | sonk | somp | sosk | sont | sonn | tok | tos' },
  { id: 'c', label: 'c (cat)', asIn: 'cat', spellings: ['c'], level: 2, practice: true, hue: 264,
    words: 'cat 🐈 | cup ☕ | can 🥫 | cap 🧢 | cot 🛏 | cod 🐟 | cut ✂️ | cost | camp ⛺ | cross | crust | cast',
    silly: 'cank | cass | cand | cont | cosk | [c]ick | cint | ciss | cund | cimp' },
  { id: 'k', label: 'k', asIn: 'kit', spellings: ['k'], level: 2, practice: true, hue: 41,
    words: 'kid 🧒 | kit 🧰 | kept | skip | skin | ask | task | risk | dusk 🌆 | desk 🪑 | tusk 🦣 | skid',
    silly: '[k]uk | guk | [k]ok | gik | sak | gek | sek | sok | tok | tek' },
  { id: 'ck', label: 'ck', asIn: 'duck', spellings: ['ck'], level: 2, practice: true, hue: 178,
    words: 'duck 🦆 | rock 🪨 | sock 🧦 | sick 🤒 | pick | pack 🎒 | neck | tick ⏰ | stick | truck 🚚 | sack | kick ⚽',
    silly: 'nuck | ceck | gick | gock | kock | gack | nack | cuck | kuck | teck' },
  { id: 'e', label: 'e', asIn: 'egg', spellings: ['e'], level: 2, practice: true, hue: 315,
    words: 'egg 🥚 | end | red 🟥 | den 🏕 | ten 🔟 | net 🥅 | pet 🐶 | get | met | desk 🪑 | nest 🪺 | rest 😴',
    silly: 'sek | sem | sep | ses | sest | senk | semp | sesk | seck | senn' },
  { id: 'u', label: 'u', asIn: 'cup', spellings: ['u'], level: 2, practice: true, hue: 90,
    words: 'up ⬆️ | us | cup ☕ | cut ✂️ | mud | mug ☕ | sun ☀️ | run 🏃 | rug 🧶 | duck 🦆 | dust | gum',
    silly: 'sut | sust | sund | susk | sunt | tud | tuk | tus | tust | tunk' },
  { id: 'r', label: 'r', asIn: 'run', spellings: ['r'], level: 2, practice: true, hue: 227,
    words: 'red 🟥 | run 🏃 | rug 🧶 | rock 🪨 | rat 🐀 | rip | rest 😴 | grin 😁 | grass 🌿 | drum 🥁 | crust | trip ✈️',
    silly: 'rup | rak | rik | rus | ris | ros | ruk | rop | ron | rann' },
  { id: 'ss', label: 'ss', asIn: 'mess', spellings: ['ss'], level: 2, practice: false },

  /* ── Level 3 ───────────────────────────────────────────────────────────── */
  { id: 'b', label: 'b', asIn: 'bat', spellings: ['b'], level: 3, practice: true, hue: 3,
    words: 'bat 🦇 | bed 🛏 | bus 🚌 | big | bag 🎒 | bin 🗑 | box 📦 | bell 🔔 | black | brick 🧱 | crab 🦀 | web 🕸',
    silly: 'bann | balt | bamp | bazz | bult | buft | benk | besk | benn | beft' },
  { id: 'h', label: 'h', asIn: 'hat', spellings: ['h'], level: 3, practice: true, hue: 140,
    words: 'hat 🎩 | hen 🐔 | hop | hug 🤗 | hill ⛰ | hand ✋ | help | hot 🔥 | ham 🍖 | hid | hut 🛖 | hiss 🐍',
    silly: 'hezz | helt | hesk | heff | hinn | hink | hisk | himp | hift | hoff' },
  { id: 'f', label: 'f', asIn: 'fan', spellings: ['f'], level: 3, practice: true, hue: 277,
    words: 'fan 🪭 | fox 🦊 | fun | fit | fell | flag 🚩 | frog 🐸 | fast | fist ✊ | [f]luff | gift 🎁 | left',
    silly: 'filt | fos | fimp | fint | fep | fup | fus | fut | fip | fis' },
  { id: 'l', label: 'l', asIn: 'leg', spellings: ['l'], level: 3, practice: true, hue: 54,
    words: 'leg 🦵 | log 🪵 | lip 👄 | lid | lamp 💡 | land | lost | milk 🥛 | help | black | glass 🥛 | flat',
    silly: 'loff | [l]olt | leb | lef | lif | lozz | lomp | lond | [l]el | [l]al' },
  { id: 'j', label: 'j', asIn: 'jam', spellings: ['j'], level: 3, practice: true, hue: 191,
    words: 'jam 🍓 | jet ✈️ | job | jug 🫙 | jump | just | jog 🏃 | jazz 🎷 | jab | jot | jugs 🫙 | jets ✈️',
    silly: 'jef | jif | jeg | jek | jas | jos | jel | jal | jop | jil' },
  { id: 'v', label: 'v', asIn: 'van', spellings: ['v'], level: 3, practice: true, hue: 328,
    words: 'van 🚐 | vet 🩺 | vest 🦺 | vat | visit | vel[v]et | oven 🔥 | seven 7️⃣ | eleven | given | event | invent',
    silly: 'vos | vop | vep | vup | ves | vus | vit | vut | vezz | vip' },
  { id: 'w', label: 'w', asIn: 'web', spellings: ['w'], level: 3, practice: true, hue: 104,
    words: 'web 🕸 | wet 💧 | win 🏆 | wig | wind 🌬 | will | wall | west | wag | wax | swim 🏊 | twig',
    silly: 'wint | wizz | wift | wef | weg | wiff | wek | wel | wil | wim' },
  { id: 'x', label: 'x', asIn: 'box', spellings: ['x'], level: 3, practice: true, hue: 241,
    words: 'box 📦 | fox 🦊 | six 6️⃣ | fix 🔧 | mix 🥣 | ox 🐂 | wax | tax | exit 🚪 | next | flex 💪 | sixty',
    silly: 'lix | cex | cux | cix | cax | yix | yax | pux | pex | yux' },
  { id: 'y', label: 'y', asIn: 'yes', spellings: ['y'], level: 3, practice: true, hue: 17,
    words: 'yes ✅ | yet | yak 🐃 | yell | yum 😋 | yap | yelp | yank | yes | yum 😋',
    silly: 'yop | yos | yis | yot | yef | yeg | yed | yit | yeb | yik' },
  { id: 'z', label: 'z', asIn: 'zip', spellings: ['z'], level: 3, practice: true, hue: 154,
    words: 'zip 🤐 | zap ⚡ | zig | zest | bu[z]z 🐝 | fi[z]z 🫧 | ja[z]z 🎷 | fu[z]z | [z]igzag | zips 🤐 | zaps ⚡ | zoo 🦁 @6',
    silly: 'zeff | zeck | zelt | zeft | zemp | [z]ezz | zess | zent | zinn | zesk' },
  { id: 'll', label: 'll', asIn: 'bell', spellings: ['ll'], level: 3, practice: false },
  { id: 'ff', label: 'ff', asIn: 'off', spellings: ['ff'], level: 3, practice: false },
  { id: 'zz', label: 'zz', asIn: 'buzz', spellings: ['zz'], level: 3, practice: false },

  /* ── Level 4 — the school sound sheet ──────────────────────────────────── */
  { id: 'sh', label: 'sh', asIn: 'ship', spellings: ['sh'], level: 4, practice: true, hue: 285,
    words: 'ship 🚢 | fish 🐟 | shell 🐚 | shed 🏚 | brush 🪥 | shop 🏪 | wish ⭐ | crash 💥 | shelf | shut | splash 💦 | dish 🍽 | shin | rush | shrimp 🦐 | sheep 🐑 @5 | shark 🦈 @6 | shirt 👕 @6',
    silly: 'shink | shisk | shilt | shek | shel | shem | shomp | shosk | shoft | shach' },
  { id: 'ch', label: 'ch', asIn: 'chip', spellings: ['ch'], level: 4, practice: true, hue: 24,
    words: 'chip 🍟 | chin 😀 | chick 🐤 | chop 🪓 | chest 🧰 | chat 💬 | chess ♟ | chill 🥶 | chimp 🐒 | much | such | rich 💰 | lunch 🍱 | bench 🪑 | branch 🌿 | munch | cheese 🧀 @5 | chain ⛓ @5 | [ch]urch ⛪ @6 | chair 🪑 @8',
    silly: 'chist | chift | chosk | choft | chosh | chast | chalp | chalt | chush | chusk' },
  { id: 'th-voiced', label: 'th (them)', asIn: 'them', spellings: ['th'], level: 4, practice: true, hue: 218, group: 'th',
    words: 'them 👥 | this 👉 | that 👈 | then ⏭ | than | with 🤝 | thus | mother 👩 @6 | father 👨 @6 | brother 👦 @6 | other @6 | weather ⛅ @6 | gather @6 | rather @6 | bother @6 | together @6 | feather 🪶 @6 | these @7 | those @7',
    silly: 'thach | thant | thand | thosh | tholp | thosk | thisk | thish | thift | thed' },
  { id: 'th-unvoiced', label: 'th (thin)', asIn: 'thin', spellings: ['th'], level: 4, practice: true, hue: 200, group: 'th',
    words: 'thin 📏 | thick 📚 | think 💭 | thing | thud | thump | cloth 🧵 | moth 🦋 | path 🛤 | bath 🛁 | fifth | sixth | tenth | thumb 👍 | three 3️⃣ @5 | teeth 🦷 @5 | tooth 🦷 @6 | north @6 | thirteen @6',
    silly: 'klath | dreth | speth | voth | [th]reth | gluth | gruth | vath | twoth | skuth' },
  { id: 'qu', label: 'qu', asIn: 'queen', spellings: ['qu'], level: 4, practice: true, hue: 330,
    words: 'quit | quiz ❓ | quilt 🛏 | quick ⚡ | quack 🦆 | quest | quip | quill | squid 🦑 | squish | squint | squash | queen 👑 @5 | quiet 🤫 @5 | square ⬛ @8',
    silly: 'quind | quink | quilp | quulp | quult | quump | quend | quelp | quenk | quab' },
  { id: 'ng', label: 'ng', asIn: 'ring', spellings: ['ng'], level: 4, practice: true, hue: 160,
    words: 'ring 💍 | king 🤴 | song 🎵 | wing 🪽 | swing 🛝 | string 🧵 | strong 💪 | sing 🎤 | long 📏 | bring 🎁 | thing | bang 💥 | hang | rang | lung 🫁 | stung | morning 🌅 @6',
    silly: 'drang | frong | scring | drong | glung | fring | scrung | grong | twung | trang' },
  { id: 'wh', label: 'wh', asIn: 'whale', spellings: ['wh'], level: 4, practice: true, hue: 95,
    words: 'when ⏰ | which 🤔 | whisk 🥄 | whip 🌀 | whiff | whim | whizz | whack | wheat 🌾 @5 | wheel 🎡 @5 | whisper 🤫 @6 | whiskers 🐱 @6 | white ⬜ @7 | whale 🐋 @7 | wheeze @7 | where 📍 @8',
    silly: 'whilp | whad | whof | whaf | whink | whog | whag | whilt | whod | whuk' },
  /* ph is on the school's sheet but not in the eight-level program. Kept here,
     grouped with the level 4 digraphs it is taught alongside. */
  { id: 'ph', label: 'ph', asIn: 'phone', spellings: ['ph'], level: 4, practice: true, hue: 45,
    words: 'graph 📈 | phantom 👻 | alphabet 🔤 | dolphin 🐬 | elephant 🐘 | orphan @6 | morph @6 | nephew @5 | gopher @7 | phone 📱 @7 | photo 📷 @7 | trophy 🏆 @7 | phonics @7 | phrase @7 | triumph @7 | sphere @8',
    silly: 'phelt | pheft | phelp | phich | phist | phid | phal | pham | phan | phup' },
  { id: 'soft-g', label: 'g (gent)', asIn: 'gent', spellings: ['g'], level: 4, practice: true, hue: 255,
    words: 'gem 💎 | gent | gel | magic ✨ | gentle 🕊 | village 🏘 | digit | rigid | [g]inger @6 | germ @6 | giraffe 🦒 @6 | orange 🍊 @6 | large @6 | giant 🗿 @7 | page 📄 @7 | cage 🐦 @7 | huge @7 | brid[g]e 🌉 @8',
    silly: 'fagel | fagil | tegel | tegil | fagen | mugin | mugen | regit | mugil | logit' },
  { id: 'soft-c', label: 'c (circle)', asIn: 'circle', spellings: ['c'], level: 4, practice: true, hue: 186,
    words: 'cent 🪙 | pencil ✏️ | dance 💃 | prince 👑 | since | fence 🚧 | mince | cinema 🎬 | [c]ircle ⭕ @6 | [c]ircus 🎪 @6 | city 🏙 @7 | ice 🧊 @7 | mice 🐭 @7 | race 🏁 @7 | face 😊 @7 | celery 🥬 @7',
    silly: 'fucit | fucet | zacit | zacet | tecet | kucet | pacit | docil | docel | docin' },
  { id: 'gg', label: 'gg', asIn: 'egg', spellings: ['gg'], level: 4, practice: false },
  { id: 'bb', label: 'bb', asIn: 'rabbit', spellings: ['bb'], level: 4, practice: false },
  { id: 'tt', label: 'tt', asIn: 'butter', spellings: ['tt'], level: 4, practice: false },
  { id: 'rr', label: 'rr', asIn: 'carrot', spellings: ['rr'], level: 4, practice: false },
  { id: 'pp', label: 'pp', asIn: 'apple', spellings: ['pp'], level: 4, practice: false },
  { id: 'dd', label: 'dd', asIn: 'ladder', spellings: ['dd'], level: 4, practice: false },
  { id: 'mm', label: 'mm', asIn: 'hammer', spellings: ['mm'], level: 4, practice: false },

  /* ── Level 5 — the first vowel teams ───────────────────────────────────── */
  { id: 'ai', label: 'ai', asIn: 'rain', spellings: ['ai'], level: 5, practice: true, hue: 14, group: 'ai-ay',
    words: 'rain 🌧 | train 🚂 | snail 🐌 | nail 🔩 | chain ⛓ | paint 🎨 | tail 🐕 | sail ⛵ | main | plain | trail 🥾 | brain 🧠 | drain | grain 🌾 | afraid 😨 | waiting ⏳',
    silly: 'prail | plaip | praik | vaid | vaig | plaim | smaid | vaif | plail | smaig' },
  { id: 'ay', label: 'ay', asIn: 'day', spellings: ['ay'], level: 5, practice: true, hue: 40, group: 'ai-ay',
    words: 'day ☀️ | play ⚽ | tray 🍽 | hay 🌾 | crayon 🖍 | spray 💦 | clay 🏺 | stay 🛑 | away | today | always | may | say | way | pay 💰 | lay | birthday 🎂 @6',
    silly: 'shray | vay | snay | zay | skay | thay | glay | thray | klay | smay' },
  { id: 'ee', label: 'ee', asIn: 'tree', spellings: ['ee'], level: 5, practice: true, hue: 206, group: 'ee-ea',
    words: 'bee 🐝 | tree 🌳 | sheep 🐑 | feet 🦶 | queen 👑 | cheese 🧀 | three 3️⃣ | green 🟢 | sleep 😴 | street 🛣 | teeth 🦷 | week 📅 | keep | seed 🌱 | deep | speed 🏎 | sweet 🍬 | asleep 😴',
    silly: 'zeep | shreet | kleest | freend | zeet | pleest | greep | fleend | kleend | greel' },
  { id: 'ea', label: 'ea', asIn: 'sea', spellings: ['ea'], level: 5, practice: true, hue: 158, group: 'ee-ea',
    words: 'sea 🌊 | leaf 🍃 | peas 🫛 | meat 🥩 | beach 🏖 | seal 🦭 | bean 🫘 | dream 💭 | clean 🧼 | speak 🗣 | eating 🍽 | team | heat 🔥 | cream 🍦 | east | read 📖 | teacher 👩‍🏫 @6',
    silly: 'kleab | flean | sweag | fleal | sweaf | drean | fleak | swead | dreal | sweak' },
  { id: 'ie', label: 'ie', asIn: 'pie', spellings: ['ie'], level: 5, practice: true, hue: 330, group: 'long-i',
    words: 'pie 🥧 | tie 👔 | lie | cries 😢 | cried 😢 | tried | fried 🍳 | dried | flies 🪰 | tries | spies 🕵 | skies 🌌 | replies | magpie 🐦 | necktie 👔 | denies',
    silly: 'sniet | shriest | ziep | bliest | flien | sniep | fliem | fliel | ziet | fliek' },
  { id: 'igh', label: 'igh', asIn: 'light', spellings: ['igh'], level: 5, practice: true, hue: 90, group: 'long-i',
    words: 'light 💡 | night 🌙 | right ➡️ | sight 👀 | might | fight 🥊 | tight | high ⬆️ | sigh 😮‍💨 | bright ☀️ | flight ✈️ | fright 😱 | thigh 🦵 | knight 🤺 | slight | delight',
    silly: 'vight | clight | scright | thight | shight | tright | dright | stright | pright | klight' },
  { id: 'oa', label: 'oa', asIn: 'boat', spellings: ['oa'], level: 5, practice: true, hue: 270, group: 'long-o',
    words: 'boat ⛵ | coat 🧥 | goat 🐐 | road 🛣 | toast 🍞 | soap 🧼 | float | throat | coach 🚌 | cloak | roast | soak | load | foal 🐴 | oak 🌳 | goal ⚽',
    silly: 'kloag | proast | groad | kload | throab | shroap | groaf | throad | groag | choast' },
  { id: 'ow-slow', label: 'ow (slow)', asIn: 'slow', spellings: ['ow'], level: 5, practice: true, hue: 230, group: 'long-o',
    words: 'slow 🐌 | snow ❄️ | grow 🌱 | show | blow 💨 | low | bowl 🥣 | throw | glow ✨ | window 🪟 | yellow 💛 | pillow 🛏 | elbow 💪 | shadow | rainbow 🌈 | crow 🐦',
    silly: 'skow | klow | twow | swow | spow | zow | thow | smow' },
  { id: 'ew-few', label: 'ew (few)', asIn: 'few', spellings: ['ew'], level: 5, practice: true, hue: 65,
    words: 'few | new 🆕 | dew 💧 | pew | view 👀 | hew | mew 🐱 | skew | newt 🦎 | nephew | newspaper 📰 | curfew @6',
    silly: 'glew | swew | twew | vew | prew | klew | zew | frew | snew' },
  { id: 'ue-cue', label: 'ue (cue)', asIn: 'cue', spellings: ['ue'], level: 5, practice: true, hue: 185,
    words: 'cue 🎱 | due | hue 🎨 | value | rescue 🛟 | statue 🗽 | venue | issue | tissue 🤧 | continue | avenue | argue @6',
    silly: 'shrue | swue | prue | smue | thue | strue | zue | brue | twue | klue' },

  /* ── Level 6 — diphthongs and r-controlled vowels ──────────────────────── */
  { id: 'oi', label: 'oi', asIn: 'soil', spellings: ['oi'], level: 6, practice: true, hue: 20, group: 'oi-oy',
    words: 'oil 🛢 | coin 🪙 | join | point 👉 | soil 🌱 | boil ♨️ | spoil | coil | noise 🔊 | voice 🗣 | choice | moist | joint | toilet 🚽 | poison ☠️ | avoid',
    silly: 'spoind | troip | proip | gloind | zoit | proit | twoip | zoip | shroind | twoit' },
  { id: 'oy', label: 'oy', asIn: 'boy', spellings: ['oy'], level: 6, practice: true, hue: 48, group: 'oi-oy',
    words: 'boy 👦 | toy 🧸 | joy 😊 | enjoy | royal 👑 | loyal | annoy | destroy | oyster 🦪 | employ | voyage 🚢 | cowboy 🤠',
    silly: 'groy | shoy | thoy | proy | floy | voy | smoy | shroy | zoy | kloy' },
  { id: 'ow-cow', label: 'ow (cow)', asIn: 'cow', spellings: ['ow'], level: 6, practice: true, hue: 105, group: 'ou-ow',
    words: 'cow 🐄 | now | how | down ⬇️ | town 🏘 | brown 🟤 | crown 👑 | owl 🦉 | flower 🌸 | power 💪 | shower 🚿 | clown 🤡 | growl | howl 🐺 | towel 🧻 | crowd 👥',
    silly: 'spownd | thownd | klownd | growt | vownd | browt | shrowt | shrown | shrowl | frowd' },
  { id: 'ou-loud', label: 'ou (loud)', asIn: 'loud', spellings: ['ou'], level: 6, practice: true, hue: 130, group: 'ou-ow',
    words: 'loud 🔊 | cloud ☁️ | round | sound 🔊 | found | ground | mouth 👄 | south | shout | count 🔢 | house 🏠 | mouse 🐭 | out | about | sprout 🌱 | scout',
    silly: 'gloun | smound | gloul | broust | choup | choun | choul | gloup | floust | choud' },
  { id: 'ir', label: 'ir', asIn: 'stir', spellings: ['ir'], level: 6, practice: true, hue: 195, group: 'er-ir-ur',
    words: 'bird 🐦 | girl 👧 | shirt 👕 | third | dirt | first | thirst | birthday 🎂 | stir | sir | skirt 👗 | circus 🎪 | thirteen | swirl | twirl | firm',
    silly: 'vird | strirnd | trirst | twirm | grirp | brirm | virb | twirn | brirl | twirst' },
  { id: 'er', label: 'er', asIn: 'term', spellings: ['er'], level: 6, practice: true, hue: 215, group: 'er-ir-ur',
    words: 'her | term | herd 🦌 | fern 🌿 | verb | germ | perch 🐦 | stern | person 🧑 | never | winter ❄️ | summer ☀️ | water 💧 | sister 👧 | letter ✉️ | under',
    silly: 'kler | smer | ther | sher | bler | grer | pler | twer | screr | drer' },
  { id: 'ur', label: 'ur', asIn: 'turn', spellings: ['ur'], level: 6, practice: true, hue: 240, group: 'er-ir-ur',
    words: 'turn | burn 🔥 | hurt 🤕 | curl | church ⛪ | purse 👛 | nurse 👩‍⚕️ | burst | surf 🏄 | curve | purple 💜 | turkey 🦃 | curtain | further | burger 🍔 | Thursday',
    silly: 'grurb | flurnd | churd | swurst | grurd | churb | brurt | grurf | grurg | brurp' },
  { id: 'oo-moon', label: 'oo (moon)', asIn: 'moon', spellings: ['oo'], level: 6, practice: true, hue: 275, group: 'oo',
    words: 'moon 🌙 | food 🍔 | soon | pool 🏊 | room 🚪 | zoo 🦁 | boot 👢 | tooth 🦷 | spoon 🥄 | balloon 🎈 | broom 🧹 | school 🏫 | smooth | roof 🏠 | noon | cool 😎',
    silly: 'shroop | shoob | ploot | shroot | shroond | smoost | stroot | shoof | shoog | voond' },
  { id: 'oo-book', label: 'oo (book)', asIn: 'book', spellings: ['oo'], level: 6, practice: true, hue: 300, group: 'oo',
    words: 'book 📖 | look 👀 | cook 👨‍🍳 | foot 🦶 | good 👍 | wood 🪵 | hook 🪝 | took | stood | wool 🧶 | hood | shook | brook | crook | cookie 🍪 | football ⚽',
    silly: 'proost | shroond | throond | floost | throost | bloond | choost | skoond | bloon | broot' },
  { id: 'or', label: 'or', asIn: 'for', spellings: ['or'], level: 6, practice: true, hue: 335,
    words: 'for | fork 🍴 | corn 🌽 | horse 🐴 | short | sport ⚽ | storm 🌩 | north | born | morning 🌅 | forest 🌲 | order | torch 🔦 | sort | port ⚓ | horn 📯',
    silly: 'throrp | skorl | shorst | skork | snornd | sporst | thrort | vorp | klorb | shrort' },
  { id: 'ar', label: 'ar', asIn: 'star', spellings: ['ar'], level: 6, practice: true, hue: 355,
    words: 'star ⭐ | car 🚗 | farm 🚜 | park 🏞 | arm 💪 | card 🃏 | dark 🌑 | hard | shark 🦈 | start | garden 🌷 | market | barn 🏚 | yard | sharp | smart 🧠',
    silly: 'blarm | flart | blarl | flark | blark | varst | blarg | flarn | skarb | sharnd' },

  /* ── Level 7 — split digraphs and open vowels ──────────────────────────────
     A split digraph is two pieces with a consonant between, so both pieces are
     bracketed: c[a]k[e]. The app underlines each piece on its own. */
  { id: 'a-e', label: 'a_e', asIn: 'cake', spellings: ['a_e'], level: 7, practice: true, hue: 30,
    words: 'c[a]k[e] 🎂 | n[a]m[e] | g[a]m[e] 🎮 | l[a]t[e] | g[a]t[e] 🚪 | m[a]k[e] | sn[a]k[e] 🐍 | pl[a]t[e] 🍽 | wh[a]l[e] 🐋 | gr[a]p[e] 🍇 | sh[a]p[e] | c[a]v[e] 🕳 | f[a]c[e] 😊 | r[a]c[e] 🏁 | pl[a]n[e] ✈️ | t[a]p[e] 📼',
    silly: 'sn[a]f[e] | sm[a]b[e] | gl[a]p[e] | kl[a]k[e] | pr[a]v[e] | ch[a]t[e] | sh[a]b[e] | z[a]t[e] | sw[a]m[e] | bl[a]g[e]' },
  { id: 'e-e', label: 'e_e', asIn: 'these', spellings: ['e_e'], level: 7, practice: true, hue: 200,
    words: 'th[e]s[e] | th[e]m[e] | sc[e]n[e] 🎬 | [e]v[e] | g[e]n[e] 🧬 | compl[e]t[e] | extr[e]m[e] | del[e]t[e] | athl[e]t[e] 🏃 | concr[e]t[e] | comp[e]t[e] | stamp[e]d[e] 🐃',
    silly: 'bl[e]v[e] | z[e]n[e] | scr[e]s[e] | sn[e]l[e] | tr[e]v[e] | thr[e]b[e] | dr[e]b[e] | ch[e]z[e] | sp[e]d[e] | fl[e]g[e]' },
  { id: 'i-e', label: 'i_e', asIn: 'bike', spellings: ['i_e'], level: 7, practice: true, hue: 340,
    words: 'b[i]k[e] 🚲 | t[i]m[e] ⏰ | f[i]v[e] 5️⃣ | n[i]n[e] 9️⃣ | k[i]t[e] 🪁 | r[i]d[e] | s[i]d[e] | l[i]n[e] | sm[i]l[e] 😊 | wh[i]t[e] ⬜ | sl[i]d[e] 🛝 | pr[i]z[e] 🏆 | m[i]c[e] 🐭 | [i]c[e] 🧊 | w[i]d[e] | sh[i]n[e] ✨',
    silly: 'gr[i]b[e] | tw[i]v[e] | th[i]t[e] | sw[i]z[e] | sm[i]b[e] | thr[i]s[e] | str[i]m[e] | tr[i]v[e] | cl[i]f[e] | sk[i]k[e]' },
  { id: 'o-e', label: 'o_e', asIn: 'bone', spellings: ['o_e'], level: 7, practice: true, hue: 265,
    words: 'b[o]n[e] 🦴 | h[o]m[e] 🏠 | n[o]s[e] 👃 | r[o]s[e] 🌹 | st[o]n[e] 🪨 | ph[o]n[e] 📱 | n[o]t[e] 📝 | h[o]l[e] 🕳 | r[o]p[e] 🪢 | sm[o]k[e] 💨 | gl[o]b[e] 🌍 | th[o]s[e] | st[o]v[e] 🔥 | j[o]k[e] 😂 | c[o]n[e] 🍦 | cl[o]s[e]',
    silly: 'sk[o]t[e] | fr[o]n[e] | pl[o]l[e] | kl[o]n[e] | bl[o]t[e] | sh[o]b[e] | br[o]d[e] | z[o]v[e] | tw[o]f[e] | fl[o]p[e]' },
  { id: 'u-e', label: 'u_e', asIn: 'cube', spellings: ['u_e'], level: 7, practice: true, hue: 115,
    words: 'c[u]b[e] 🧊 | t[u]b[e] 🚇 | h[u]g[e] | J[u]n[e] | r[u]l[e] 📏 | fl[u]t[e] 🪈 | m[u]l[e] 🐴 | c[u]t[e] 🥰 | [u]s[e] | t[u]n[e] 🎵 | d[u]n[e] 🏜 | pr[u]n[e] 🍑 | cost[u]m[e] 🎭 | vol[u]m[e] 🔊 | perf[u]m[e] 🌸 | incl[u]d[e]',
    silly: 'z[u]k[e] | tw[u]z[e] | cl[u]n[e] | gl[u]l[e] | v[u]f[e] | fl[u]n[e] | sn[u]m[e] | sk[u]m[e] | gr[u]g[e] | th[u]s[e]' },
  { id: 'a-baby', label: 'a (baby)', asIn: 'baby', spellings: ['a'], level: 7, practice: true, hue: 60,
    words: 'baby 👶 | table 🪑 | paper 📄 | apron | lady 👩 | acorn 🌰 | radio 📻 | bacon 🥓 | label | [a]pricot 🍑 | n[a]ture 🌿 | st[a]tion 🚉',
    silly: 'glab | swand | brap | swak | glan | swal | glal | glak | thand | shrast' },
  { id: 'e-we', label: 'e (we)', asIn: 'we', spellings: ['e'], level: 7, practice: true, hue: 170,
    words: 'we | be | he | me | she | [e]ven | evil | equal | email 📧 | emu 🦤 | zebra 🦓 | s[e]cret 🤫 | f[e]male | b[e]gin',
    silly: 'cheb | bleg | ven | cheg | vel | vem | ched | chend | veb | chek' },
  { id: 'y-funny', label: 'y (funny)', asIn: 'funny', spellings: ['y'], level: 7, practice: true, hue: 310,
    words: 'funny 😂 | happy 😊 | sunny ☀️ | baby 👶 | puppy 🐶 | city 🏙 | party 🎉 | story 📖 | family 👨‍👩‍👧 | jelly 🍮 | penny 🪙 | lucky 🍀 | windy 🌬 | silly 🤪 | candy 🍬 | pretty',
    silly: 'shey | shuy | shoy | vey | vuy | griy | groy | vay | viy | gruy' },
  { id: 'i-find', label: 'i (find)', asIn: 'find', spellings: ['i'], level: 7, practice: true, hue: 10,
    words: 'find | kind | mind | beh[i]nd | child 🧒 | wild | mild | blind | climb 🧗 | pint | island 🏝 | silent | tiger 🐯 | spider 🕷 | item | f[i]nal',
    silly: 'thrin | drin | thrind | thrit | glip | glin | klist | glil | blim | glik' },
  { id: 'y-sky', label: 'y (sky)', asIn: 'sky', spellings: ['y'], level: 7, practice: true, hue: 235,
    words: 'sky 🌌 | fly 🪰 | cry 😢 | try | why | my | by | dry | shy | sly | spy 🕵 | reply | deny | apply | multipl[y] | occup[y]',
    silly: 'thruy | threy | fluy | throy | driy | floy | druy | droy | skey | skay' },
  { id: 'o-go', label: 'o (go)', asIn: 'go', spellings: ['o'], level: 7, practice: true, hue: 145,
    words: 'go | no | so | open 🚪 | over | old | cold 🥶 | gold 🥇 | hold | told | most | post 📮 | both | only | oval | hotel 🏨',
    silly: 'drot | vop | glol | vost | shrot | glon | shrop | glod | glog | drob' },

  /* ── Level 8 ───────────────────────────────────────────────────────────── */
  { id: 'aw', label: 'aw', asIn: 'draw', spellings: ['aw'], level: 8, practice: true, hue: 50,
    words: 'draw ✏️ | saw 🪚 | paw 🐾 | law ⚖️ | jaw | claw 🦞 | straw 🥤 | lawn 🌱 | yawn 🥱 | dawn 🌅 | crawl | shawl | prawn 🦐 | hawk 🦅 | awful | seesaw',
    silly: 'swaw | smaw | glaw | shraw | praw | zaw | fraw | klaw | plaw | graw' },
  { id: 'ew-drew', label: 'ew (drew)', asIn: 'drew', spellings: ['ew'], level: 8, practice: true, hue: 135,
    words: 'drew | grew | blew 💨 | chew 😋 | threw | crew 🚢 | flew ✈️ | screw 🔩 | knew | brew ☕ | stew 🍲 | jewel 💎',
    silly: 'twew | prew | glew | snew | swew | frew | vew | klew | zew' },
  { id: 'ou-touch', label: 'ou (touch)', asIn: 'touch', spellings: ['ou'], level: 8, practice: true, hue: 290,
    words: 'touch 👆 | double | trouble | country 🌍 | young 🧒 | cousin | enough | rough | tough | couple | southern | nourish',
    silly: 'floub | twoub | gloust | twouf | twoug | twoud | brouk | pround | twouk | floup' },
  { id: 'air', label: 'air', asIn: 'chair', spellings: ['air'], level: 8, practice: true, hue: 15,
    words: 'chair 🪑 | hair 💇 | air 💨 | fair 🎡 | pair 👟 | stair 🪜 | repair 🔧 | airport ✈️ | dairy 🥛 | fairy 🧚 | staircase | hairy',
    silly: 'thair | skair | spair | scrair | twair | shair | strair | clair | frair | drair' },
  { id: 'are', label: 'are', asIn: 'dare', spellings: ['are'], level: 8, practice: true, hue: 345,
    words: 'dare | care | share | hare 🐇 | bare | square ⬛ | scare 😱 | stare 👀 | spare | prepare | aware | compare',
    silly: 'scrare | prare | strare | thare | frare | skare | trare | grare | plare | klare' },
  { id: 'ear', label: 'ear (pear)', asIn: 'pear', spellings: ['ear'], level: 8, practice: true, hue: 190,
    words: 'pear 🍐 | bear 🐻 | wear 👕 | tear | swear | underwear | footwear | forbear | bearskin | wearing | tearing | swearing',
    silly: 'brear | threar | vear | strear | prear | flear | snear | klear | grear | zear' },
  { id: 'eer', label: 'eer', asIn: 'cheer', spellings: ['eer'], level: 8, practice: true, hue: 220,
    words: 'cheer 🎉 | deer 🦌 | peer | steer | jeer | sheer | career | engineer 👷 | volunteer | pioneer | reindeer 🦌 | cheerful | steering',
    silly: 'threer | preer | theer | cleer | dreer | greer | pleer | gleer | zeer | screer' },
  { id: 'ore', label: 'ore', asIn: 'more', spellings: ['ore'], level: 8, practice: true, hue: 75,
    words: 'more | store 🏪 | score ⚽ | before | shore 🏖 | snore 😴 | chore | bore | core 🍎 | explore 🔭 | ignore | adore',
    silly: 'twore | shrore | drore | throre | plore | zore | grore | brore | thore | vore' },
  { id: 'dge', label: 'dge', asIn: 'edge', spellings: ['dge'], level: 8, practice: true, hue: 260,
    words: 'edge | bridge 🌉 | fudge 🍫 | judge 👨‍⚖️ | badge 🎖 | hedge 🌿 | ledge | dodge | budge | lodge | smudge | porridge 🥣',
    silly: 'skadge | tradge | skodge | fredge | klidge | plidge | shudge | shadge | shidge | klodge' },
  { id: 'tch', label: 'tch', asIn: 'match', spellings: ['tch'], level: 8, practice: true, hue: 110,
    words: 'match 🔥 | catch ⚾ | watch ⌚ | witch 🧙 | ditch | patch 🩹 | pitch ⚾ | switch 💡 | stitch 🧵 | scratch | kitchen 🍳 | butcher',
    silly: 'sputch | skatch | twotch | blatch | zutch | vitch | platch | strutch | tritch | snotch' },
];

/*  ── Word families (Word Builder) ──────────────────────────────────────────
 *  Two shapes:
 *    kind: 'rime'  — the ending is fixed, the child swaps the front.
 *                    fixed 'ain' + onset 'r' = rain.
 *    kind: 'onset' — the front is fixed, the child swaps the ending. English
 *                    only ever puts qu at the front, so a qu family has to be
 *                    this way round. fixed 'qu' + ending 'ick' = quick.
 *
 *  Every `real` entry has to be a real word and every `silly` one has to not
 *  be. The content test checks both against an English dictionary, which is
 *  how the prototype's "vain is a silly word" class of bug stays fixed.
 */
export interface FamilySpec {
  id: string;
  kind: 'rime' | 'onset';
  /** the part that stays put */
  fixed: string;
  /** the sound this family practises */
  sound: string;
  level: Level;
  real: string[];
  silly: string[];
}

export const FAMILIES: FamilySpec[] = [
  /* Levels 1-3 — simple CVC families */
  { id: 'at', kind: 'rime', fixed: 'at', sound: 'a', level: 3,
    real: ['c','b','h','m','p','r','s','f','fl','sp'], silly: ['z', 'gl', 'dw', 'sn', 'thr', 'shr'] },
  { id: 'ig', kind: 'rime', fixed: 'ig', sound: 'i', level: 3,
    real: ['b','d','f','j','p','w','tw','sw'], silly: ['gl', 'thr', 'shr', 'pl', 'dr', 'sm'] },
  { id: 'un', kind: 'rime', fixed: 'un', sound: 'u', level: 3,
    real: ['b','f','r','s','sp','st','sh'], silly: ['v', 'z', 'gl', 'thr', 'pl', 'dr'] },
  { id: 'og', kind: 'rime', fixed: 'og', sound: 'o', level: 3,
    real: ['d','f','h','j','l','b','fr','cl','sm'], silly: ['v', 'z', 'gl', 'thr', 'pl', 'shr'] },
  { id: 'ed', kind: 'rime', fixed: 'ed', sound: 'e', level: 3,
    real: ['b','f','l','r','w','sh','sl','br'], silly: ['v', 'thr', 'pr', 'sm', 'dw', 'fr'] },

  /* Level 4 — the school sheet */
  { id: 'ip', kind: 'rime', fixed: 'ip', sound: 'sh', level: 4,
    real: ['sh','ch','dr','tr','sk','fl','s','l','r','t','wh','gr'], silly: ['m', 'v', 'th', 'pl', 'fr', 'gl'] },
  { id: 'ell', kind: 'rime', fixed: 'ell', sound: 'sh', level: 4,
    real: ['sh','b','f','s','t','w','sm','sp','y','dw','sw'], silly: ['z', 'thr', 'pr', 'gl', 'fr', 'shr'] },
  { id: 'ash', kind: 'rime', fixed: 'ash', sound: 'sh', level: 4,
    real: ['c','d','m','r','b','cr','fl','sm','tr','spl','cl','st'], silly: ['z', 'v', 'th', 'gl', 'shr', 'fr'] },
  { id: 'atch', kind: 'rime', fixed: 'atch', sound: 'ch', level: 4,
    real: ['c','m','p','b','h','l','sn','scr','th'], silly: ['z', 'v', 'g', 'pl', 'shr', 'gl'] },
  { id: 'inch', kind: 'rime', fixed: 'inch', sound: 'ch', level: 4,
    real: ['p','w','f','fl','cl'], silly: ['z', 'v', 'm', 'th', 'gl', 'shr'] },
  { id: 'ing', kind: 'rime', fixed: 'ing', sound: 'ng', level: 4,
    real: ['k','r','s','w','th','br','str','sw','spr','cl','fl','st'], silly: ['v', 'gl', 'pr', 'shr', 'sm', 'fr'] },
  { id: 'ong', kind: 'rime', fixed: 'ong', sound: 'ng', level: 4,
    real: ['l','s','str','g','thr','pr'], silly: ['v', 'z', 'gl', 'shr', 'sm', 'fr'] },
  { id: 'ink', kind: 'rime', fixed: 'ink', sound: 'th-unvoiced', level: 4,
    real: ['th','p','s','w','l','dr','bl','st','m','r','k','br'], silly: ['v', 'z', 'gl', 'thr', 'fr', 'sm'] },
  { id: 'ick', kind: 'rime', fixed: 'ick', sound: 'th-unvoiced', level: 4,
    real: ['th','k','l','p','s','t','br','ch','st','tr','qu','fl'], silly: ['v', 'z', 'gl', 'shr', 'thr', 'fr'] },
  { id: 'en', kind: 'rime', fixed: 'en', sound: 'th-voiced', level: 4,
    real: ['th','h','t','p','d','m','wh','wr'], silly: ['z', 'shr', 'thr', 'sn', 'fr', 'v'] },
  { id: 'that-at', kind: 'rime', fixed: 'at', sound: 'th-voiced', level: 4,
    real: ['th','c','b','h','m','p','r','s','fl','ch','sp','v'], silly: ['z', 'gl', 'shr', 'thr', 'sn', 'sm'] },
  /* qu only ever sits at the front, so this family is the other way round. */
  { id: 'qu-front', kind: 'onset', fixed: 'qu', sound: 'qu', level: 4,
    real: ['ick','ack','ilt','iz','it','est','ill','ip','ash','ench'], silly: ['og', 'ib', 'em', 'an', 'az', 'ud'] },
  { id: 'wh-front', kind: 'onset', fixed: 'wh', sound: 'wh', level: 4,
    real: ['en','ich','isk','ip','iff','im','ack','izz'], silly: ['og', 'ib', 'ad', 'em', 'ud', 'an'] },
  { id: 'ent', kind: 'rime', fixed: 'ent', sound: 'soft-g', level: 4,
    real: ['g','s','t','w','b','d','l','r','sp','sc'], silly: ['z', 'th', 'shr', 'fr', 'pl', 'thr'] },

  /* Level 5 */
  { id: 'ain', kind: 'rime', fixed: 'ain', sound: 'ai', level: 5,
    real: ['r','m','p','g','br','ch','tr','st','dr','pl'], silly: ['z', 'sh', 'th', 'fl', 'sn', 'gl'] },
  { id: 'ail', kind: 'rime', fixed: 'ail', sound: 'ai', level: 5,
    real: ['m','s','t','n','p','r','sn','tr','fr','qu'], silly: ['z', 'sh', 'd', 'th', 'gl', 'pl'] },
  { id: 'ay', kind: 'rime', fixed: 'ay', sound: 'ay', level: 5,
    real: ['d','w','s','m','h','p','cl','pl','st','tr','gr','spr'], silly: ['z', 'v', 'th', 'gl', 'sn', 'shr'] },
  { id: 'ee', kind: 'rime', fixed: 'ee', sound: 'ee', level: 5,
    real: ['b','s','f','tr','thr','fr','gl','kn'], silly: ['pl', 'shr', 'zw', 'dw', 'spl', 'st'] },
  { id: 'eep', kind: 'rime', fixed: 'eep', sound: 'ee', level: 5,
    real: ['k','d','sh','sl','w','st','cr','b','sw','j'], silly: ['m', 'z', 'f', 'gl', 'pl', 'shr'] },
  { id: 'eat', kind: 'rime', fixed: 'eat', sound: 'ea', level: 5,
    real: ['b','h','m','n','s','tr','wh','ch','p','f'], silly: ['z', 'v', 'k', 'gl', 'shr', 'pr'] },
  { id: 'each', kind: 'rime', fixed: 'each', sound: 'ea', level: 5,
    real: ['b','r','t','p','pr','bl'], silly: ['z', 'm', 'd', 'v', 'gl', 'shr'] },
  { id: 'eel', kind: 'rime', fixed: 'eel', sound: 'wh', level: 5,
    real: ['wh','f','h','p','st','kn','r','k'], silly: ['z', 'thr', 'gl', 'sn', 'pr', 'v'] },
  { id: 'ight', kind: 'rime', fixed: 'ight', sound: 'igh', level: 5,
    real: ['l','n','r','s','m','f','t','br','fl','fr','sl'], silly: ['z', 'v', 'gl', 'pr', 'sn', 'thr'] },
  { id: 'oat', kind: 'rime', fixed: 'oat', sound: 'oa', level: 5,
    real: ['b','c','g','fl','thr','m','st','bl'], silly: ['z', 'v', 'pr', 'shr', 'sn', 'sm'] },
  { id: 'ow-slow', kind: 'rime', fixed: 'ow', sound: 'ow-slow', level: 5,
    real: ['l','r','s','t','b','m','sl','sn','gl','gr','bl','thr','sh','cr','fl','kn'],
    silly: ['z', 'dw', 'sw', 'sm', 'zw', 'tw'] },
  { id: 'ie', kind: 'rime', fixed: 'ie', sound: 'ie', level: 5,
    real: ['p','t','l','v'], silly: ['z', 'bl', 'th', 'ch', 'sn', 'gr'] },

  /* Level 6 */
  { id: 'oil', kind: 'rime', fixed: 'oil', sound: 'oi', level: 6,
    real: ['b','c','s','t','sp','br','f'], silly: ['z', 'v', 'gl', 'thr', 'shr', 'pl'] },
  { id: 'own', kind: 'rime', fixed: 'own', sound: 'ow-cow', level: 6,
    real: ['d','t','g','cl','br','cr','fr','dr'], silly: ['z', 'v', 'gl', 'shr', 'pl', 'sn'] },
  { id: 'out', kind: 'rime', fixed: 'out', sound: 'ou-loud', level: 6,
    real: ['sh','sp','tr','sc','p','cl','st','gr'], silly: ['z', 'v', 'thr', 'fr', 'pl', 'shr'] },
  { id: 'ark', kind: 'rime', fixed: 'ark', sound: 'ar', level: 6,
    real: ['b','d','h','l','m','p','sh','sp','st'], silly: ['z', 'v', 'gl', 'thr', 'pl', 'shr'] },
  { id: 'orn', kind: 'rime', fixed: 'orn', sound: 'or', level: 6,
    real: ['b','c','h','t','w','th','sc','sh'], silly: ['z', 'v', 'gl', 'pr', 'sn', 'fl'] },
  { id: 'irt', kind: 'rime', fixed: 'irt', sound: 'ir', level: 6,
    real: ['d','sh','sk','fl','squ'], silly: ['z', 'v', 'gl', 'thr', 'pr', 'shr'] },
  { id: 'ook', kind: 'rime', fixed: 'ook', sound: 'oo-book', level: 6,
    real: ['b','c','h','l','t','sh','br','cr'], silly: ['z', 'v', 'gl', 'thr', 'fr', 'shr'] },
  { id: 'oon', kind: 'rime', fixed: 'oon', sound: 'oo-moon', level: 6,
    real: ['m','n','s','sp','b','sw','l','g'], silly: ['v', 'gl', 'thr', 'fr', 'pl', 'shr'] },

  /* Level 7 */
  { id: 'one', kind: 'rime', fixed: 'one', sound: 'ph', level: 7,
    real: ['ph','b','c','t','st','dr','al','z','g','cl','sh','thr'], silly: ['v', 'm', 'fl', 'sn', 'gl', 'shr'] },
  { id: 'age', kind: 'rime', fixed: 'age', sound: 'soft-g', level: 7,
    real: ['p','c','r','s','st','w','m'], silly: ['v', 'z', 'th', 'fl', 'gl', 'shr'] },
  { id: 'ice', kind: 'rime', fixed: 'ice', sound: 'soft-c', level: 7,
    real: ['m','n','r','d','tw','sl','pr','sp','v'], silly: ['z', 'th', 'gl', 'shr', 'fr', 'pl'] },
  { id: 'ace', kind: 'rime', fixed: 'ace', sound: 'soft-c', level: 7,
    real: ['f','r','l','p','sp','tr','gr','br','m'], silly: ['v', 'z', 'th', 'shr', 'fr', 'thr'] },
  { id: 'ale', kind: 'rime', fixed: 'ale', sound: 'wh', level: 7,
    real: ['wh','t','p','s','m','sc','st','g','v','sh','k'], silly: ['z', 'thr', 'fr', 'gl', 'pr', 'sn'] },

  /* Level 8 */
  { id: 'aw', kind: 'rime', fixed: 'aw', sound: 'aw', level: 8,
    real: ['s','p','l','j','r','cl','str','dr','th','fl','sl'], silly: ['z', 'gl', 'shr', 'pr', 'sm', 'dw'] },
  { id: 'itch', kind: 'rime', fixed: 'itch', sound: 'tch', level: 8,
    real: ['d','p','w','h','st','sw','tw','gl'], silly: ['z', 'v', 'thr', 'pr', 'fr', 'sm'] },
  { id: 'udge', kind: 'rime', fixed: 'udge', sound: 'dge', level: 8,
    real: ['f','j','b','n','gr','sm','dr','tr'], silly: ['z', 'v', 'gl', 'thr', 'pl', 'shr'] },
  { id: 'air', kind: 'rime', fixed: 'air', sound: 'air', level: 8,
    real: ['ch','h','f','p','st','l','fl'], silly: ['z', 'thr', 'sn', 'pr', 'shr', 'sm'] },
  { id: 'ore', kind: 'rime', fixed: 'ore', sound: 'ore', level: 8,
    real: ['m','b','c','s','st','sh','sn','ch','t','w','p'], silly: ['z', 'v', 'gl', 'thr', 'pl', 'dw'] },
  { id: 'eer', kind: 'rime', fixed: 'eer', sound: 'eer', level: 8,
    real: ['d','p','ch','st','sh','j','l','sn','v'], silly: ['z', 'gl', 'thr', 'pr', 'sm', 'dw'] },
];

/*  ── Sentence Smash phrases ────────────────────────────────────────────────
 *  `text ~sound @level`. Brackets pick the letters to underline when the
 *  spelling turns up more than once — this is where the prototype went wrong,
 *  underlining "in *the* bath" (voiced the, not the unvoiced th it meant) and
 *  "the *whole* wheelbarrow" (whole is /h/, not /wh/).
 *
 *  Phrases the prototype mis-tagged are gone: "tickled" (no th in it), "ate"
 *  (no ee or ea), "juggled" (both g's are hard), "the chef" (chef is /sh/).
 */
export type Slot = 'who' | 'did' | 'what' | 'where';

export const PHRASES: Record<Slot, string> = {
  who: [
    'the shark ~sh @6', 'a sheep ~sh @5', 'a fish ~sh @4', 'a shrimp ~sh @4',
    'the chicken ~ch @4', 'a chimp ~ch @4', 'the [ch]ess champion ~ch @7',
    '[th]eir mother ~th-voiced @6', '[th]at brother ~th-voiced @6', 'this teacher ~th-voiced @6',
    'three [th]in moths ~th-unvoiced @5', 'a thumb ~th-unvoiced @4',
    'the queen ~qu @5', 'a [qu]iet squid ~qu @5', 'the quiz master ~qu @4',
    'the king ~ng @4', 'a si[ng]ing frog ~ng @4', 'a stro[ng] king ~ng @4',
    'the whale ~wh @7', 'a [wh]ite wheel ~wh @7', 'a whiskery cat ~wh @6',
    'an elephant ~ph @4', 'a dolphin ~ph @4', 'my phone ~ph @7',
    'a giant ~soft-g @7', 'a giraffe ~soft-g @6', 'the [g]entle gerbil ~soft-g @6',
    'a mouse in the city ~soft-c @7', 'a [c]ircle of mice ~soft-c @7', 'my pencil ~soft-c @4',
    'the train ~ai @5', 'a snail ~ai @5', 'the sheepdog ~ee @5', 'a seal ~ea @5', 'the teacher ~ea @6',
    'a cook ~oo-book @6', 'a baboon ~oo-moon @6', 'a noisy boy ~oi @6',
    'a clown ~ow-cow @6', 'a br[ow]n owl ~ow-cow @6', 'the farmer ~ar @6',
    'a hawk ~aw @8', 'a fairy ~air @8', 'a big dog ~o @3', 'a f[a]t cat ~a @3',
  ].join(' | '),
  did: [
    'washed ~sh @4', 'squashed ~sh @4', 'splashed ~sh @4', 'pushed ~sh @6',
    'chased ~ch @7', 'munched ~ch @4', 'chopped ~ch @4',
    'bothered ~th-voiced @6', 'gathered ~th-voiced @6',
    'thumped ~th-unvoiced @4', 'thanked ~th-unvoiced @4',
    'quacked at ~qu @4', 'quickly grabbed ~qu @4', 'squeezed ~qu @7',
    'sang to ~ng @4', 'flung ~ng @4', 'stung ~ng @4',
    'whispered to ~wh @6', 'whacked ~wh @4', 'whizzed past ~wh @4',
    '[ph]otographed ~ph @7', 'phoned ~ph @7',
    '[g]ently hugged ~soft-g @7', 'charged at ~soft-g @6',
    'danced with ~soft-c @4', 'raced ~soft-c @7', 'traced ~soft-c @7',
    'painted ~ai @5', 'sailed past ~ai @5', 'cleaned ~ea @5', 'dreamed about ~ea @5',
    'greeted ~ee @5', 'peeked at ~ee @5', 'parked on ~ar @6', 'marched past ~ar @6',
    'zoomed past ~oo-moon @6', 'looked at ~oo-book @6', 'joined ~oi @6', 'pointed at ~oi @6',
    'growled at ~ow-cow @6', 'bowed to ~ow-cow @6', 'shouted at ~ou-loud @6',
    'yawned at ~aw @8', 'crawled to ~aw @8', 'drew ~ew-drew @8', 'frightened ~igh @5',
    'sat on ~a @3', 'ran to ~a @3',
  ].join(' | '),
  what: [
    'a [sh]iny shell ~sh @7', 'some fish ~sh @4', 'a shoe ~sh @5',
    'a [ch]eese chip ~ch @5', 'a bun[ch] of chips ~ch @4',
    'the o[th]er feather ~th-voiced @6', 'a [th]ick thorn ~th-unvoiced @6', '[th]ree teeth ~th-unvoiced @5',
    'a s[qu]eaky quilt ~qu @7', 'the quiz ~qu @4',
    'a lo[ng] string ~ng @4', 'a swi[ng]ing ring ~ng @4',
    'a whisker ~wh @6', 'the whole [wh]eelbarrow ~wh @5',
    'a photo ~ph @7', 'the alphabet ~ph @4',
    'a hu[g]e orange ~soft-g @7', 'a ma[g]ic gem ~soft-g @4',
    'a sli[c]e of ice ~soft-c @7', 'a pen[c]il case ~soft-c @7',
    'a rusty chain ~ai @7', 'a paint tray ~ai @5',
    'some green peas ~ee @5', 'three sh[ee]p ~ee @5', 'a leaf ~ea @5',
    'a d[ar]k barn ~ar @6', 'a w[oo]den spoon ~oo-book @6', 'a big balloon ~oo-moon @6',
    'a coin ~oi @6', 'some n[oi]sy toys ~oi @6', 'a br[ow]n cow ~ow-cow @6', 'a flower ~ow-cow @6',
    'a straw ~aw @8', 'a giant claw ~aw @8', 'a chair ~air @8', 'some hair ~air @8',
    'a bridge ~dge @8', 'some fudge ~dge @8', 'a watch ~tch @8', 'a patch ~tch @8',
    'a red hat ~e @3', 'a big bug ~u @3',
  ].join(' | '),
  where: [
    'in the shed ~sh @4', 'on a ship ~sh @4', 'in the [ch]urch ~ch @6', 'on a chair ~ch @8',
    'with [th]em ~th-voiced @4', 'near [th]eir mother ~th-voiced @6',
    'in the ba[th] ~th-unvoiced @4', 'on a [th]in path ~th-unvoiced @4',
    'in the square ~qu @8', 'at the quiz ~qu @4',
    'while si[ng]ing ~ng @4', 'in the morning ~ng @6',
    'in a whirlwind ~wh @6', 'when nobody looked ~wh @7',
    'in the phone box ~ph @7', 'in a cage ~soft-g @7', 'on the brid[g]e ~soft-g @8',
    'in the city ~soft-c @7', 'in a [c]ircle ~soft-c @6',
    'on the train ~ai @5', 'every day ~ay @5', 'at the beach ~ea @5', 'by the tree ~ee @5',
    'in the park ~ar @6', 'on a farm ~ar @6', 'in the storm ~or @6', 'by the shore ~ore @8',
    'in the moonlight ~oo-moon @6', 'in a book ~oo-book @6', 'in the soil ~oi @6',
    'in the town ~ow-cow @6', 'on a cloud ~ou-loud @6', 'at dawn ~aw @8', 'at night ~igh @5',
    'in the sun ~u @3', 'on a l[o]g ~o @3',
  ].join(' | '),
};

/*  Tricky words — the ones you cannot sound out.
 *
 *  Every other list in this file is decodable: work through the letters and
 *  the word comes out. These do not play fair. "said" should rhyme with paid,
 *  "was" should rhyme with gas, "one" should start like only. A child who
 *  tries to sound them out gets them wrong, so they have to be known on sight.
 *
 *  Brackets mark the part that misbehaves, not a sound being practised:
 *  s[ai]d, w[a]s, c[oul]d. That is what the game lights up once he has found
 *  the word, so he learns which bit to distrust rather than just that the
 *  whole word is odd.
 *
 *  Only genuinely irregular words are here. "went" and "from" look like
 *  sight words on a classroom list and are perfectly decodable by level 3 —
 *  telling a child to memorise those is teaching him to stop reading. The
 *  content test checks every entry has a bracketed part for that reason.
 *
 *  These are the highest-frequency irregular words in English, in rough order
 *  of how often a child meets them. A school running its own list — Magic 100
 *  Words, the Oxford Wordlist — should replace these sets with that one; the
 *  games read whatever is here.  */
export const SIGHT_WORDS: Record<string, string> = {
  'Set 1': 'th[e] | w[a]s | s[ai]d | y[ou] | [a]re | th[ey] | h[a]ve | [o]ne | c[o]me | s[o]me | wh[a]t | w[e]re',
  'Set 2': 'th[ere] | th[ei]r | wh[ere] | [wh]o | d[oe]s | d[o]ne | [a]ny | m[a]ny | ag[ai]n | fr[ie]nd | p[eo]ple | [o]nce',
  'Set 3': 'c[oul]d | sh[oul]d | w[oul]d | w[a]ter | w[or]k | w[or]d | l[o]ve | m[o]ve | g[i]ve | l[i]ve | h[ere] | [o]ther',
  'Set 4': 'm[o]ther | f[a]ther | bec[au]se | b[ee]n | [k]now | [w]rite | s[ch]ool | [s]ure | p[u]t | p[u]sh | t[w]o | [eye]',
};

/*  Words never to show a six-year-old, whatever a word list says about them.
 *  Checked against every real word, silly word, family build and phrase. */
export const BLOCKLIST: string[] = [
  'ass', 'arse', 'bum', 'butt', 'crap', 'damn', 'dick', 'fart', 'gut', 'hell',
  'poo', 'pee', 'wee', 'piss', 'shag', 'slut', 'tit', 'turd', 'willy',
  'coon', 'fag', 'gyp', 'jap', 'paki', 'spic', 'wog', 'yid',
  'kill', 'die', 'dead', 'death', 'gun', 'shot', 'stab', 'blood',
  'drug', 'beer', 'wine', 'gin', 'rum', 'sex', 'nude', 'rape',
];
