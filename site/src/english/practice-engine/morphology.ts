// Morphology utilities: verb/noun/adjective inflection.
// Ported from steep/grammar/algorithm/transforms.ts, adapted to our export signatures.

const IRREGULAR_VERBS: Record<string, { base: string; s3: string; past: string; pastParticiple: string; gerund: string }> = {
  be: { base: "be", s3: "is", past: "was", pastParticiple: "been", gerund: "being" },
  have: { base: "have", s3: "has", past: "had", pastParticiple: "had", gerund: "having" },
  do: { base: "do", s3: "does", past: "did", pastParticiple: "done", gerund: "doing" },
  go: { base: "go", s3: "goes", past: "went", pastParticiple: "gone", gerund: "going" },
  say: { base: "say", s3: "says", past: "said", pastParticiple: "said", gerund: "saying" },
  make: { base: "make", s3: "makes", past: "made", pastParticiple: "made", gerund: "making" },
  get: { base: "get", s3: "gets", past: "got", pastParticiple: "gotten", gerund: "getting" },
  know: { base: "know", s3: "knows", past: "knew", pastParticiple: "known", gerund: "knowing" },
  think: { base: "think", s3: "thinks", past: "thought", pastParticiple: "thought", gerund: "thinking" },
  take: { base: "take", s3: "takes", past: "took", pastParticiple: "taken", gerund: "taking" },
  see: { base: "see", s3: "sees", past: "saw", pastParticiple: "seen", gerund: "seeing" },
  come: { base: "come", s3: "comes", past: "came", pastParticiple: "come", gerund: "coming" },
  want: { base: "want", s3: "wants", past: "wanted", pastParticiple: "wanted", gerund: "wanting" },
  look: { base: "look", s3: "looks", past: "looked", pastParticiple: "looked", gerund: "looking" },
  use: { base: "use", s3: "uses", past: "used", pastParticiple: "used", gerund: "using" },
  give: { base: "give", s3: "gives", past: "gave", pastParticiple: "given", gerund: "giving" },
  find: { base: "find", s3: "finds", past: "found", pastParticiple: "found", gerund: "finding" },
  tell: { base: "tell", s3: "tells", past: "told", pastParticiple: "told", gerund: "telling" },
  ask: { base: "ask", s3: "asks", past: "asked", pastParticiple: "asked", gerund: "asking" },
  seem: { base: "seem", s3: "seems", past: "seemed", pastParticiple: "seemed", gerund: "seeming" },
  feel: { base: "feel", s3: "feels", past: "felt", pastParticiple: "felt", gerund: "feeling" },
  try: { base: "try", s3: "tries", past: "tried", pastParticiple: "tried", gerund: "trying" },
  leave: { base: "leave", s3: "leaves", past: "left", pastParticiple: "left", gerund: "leaving" },
  call: { base: "call", s3: "calls", past: "called", pastParticiple: "called", gerund: "calling" },
  keep: { base: "keep", s3: "keeps", past: "kept", pastParticiple: "kept", gerund: "keeping" },
  let: { base: "let", s3: "lets", past: "let", pastParticiple: "let", gerund: "letting" },
  begin: { base: "begin", s3: "begins", past: "began", pastParticiple: "begun", gerund: "beginning" },
  show: { base: "show", s3: "shows", past: "showed", pastParticiple: "shown", gerund: "showing" },
  hear: { base: "hear", s3: "hears", past: "heard", pastParticiple: "heard", gerund: "hearing" },
  play: { base: "play", s3: "plays", past: "played", pastParticiple: "played", gerund: "playing" },
  run: { base: "run", s3: "runs", past: "ran", pastParticiple: "run", gerund: "running" },
  move: { base: "move", s3: "moves", past: "moved", pastParticiple: "moved", gerund: "moving" },
  live: { base: "live", s3: "lives", past: "lived", pastParticiple: "lived", gerund: "living" },
  believe: { base: "believe", s3: "believes", past: "believed", pastParticiple: "believed", gerund: "believing" },
  hold: { base: "hold", s3: "holds", past: "held", pastParticiple: "held", gerund: "holding" },
  bring: { base: "bring", s3: "brings", past: "brought", pastParticiple: "brought", gerund: "bringing" },
  happen: { base: "happen", s3: "happens", past: "happened", pastParticiple: "happened", gerund: "happening" },
  write: { base: "write", s3: "writes", past: "wrote", pastParticiple: "written", gerund: "writing" },
  provide: { base: "provide", s3: "provides", past: "provided", pastParticiple: "provided", gerund: "providing" },
  sit: { base: "sit", s3: "sits", past: "sat", pastParticiple: "sat", gerund: "sitting" },
  stand: { base: "stand", s3: "stands", past: "stood", pastParticiple: "stood", gerund: "standing" },
  lose: { base: "lose", s3: "loses", past: "lost", pastParticiple: "lost", gerund: "losing" },
  pay: { base: "pay", s3: "pays", past: "paid", pastParticiple: "paid", gerund: "paying" },
  meet: { base: "meet", s3: "meets", past: "met", pastParticiple: "met", gerund: "meeting" },
  include: { base: "include", s3: "includes", past: "included", pastParticiple: "included", gerund: "including" },
  continue: { base: "continue", s3: "continues", past: "continued", pastParticiple: "continued", gerund: "continuing" },
  set: { base: "set", s3: "sets", past: "set", pastParticiple: "set", gerund: "setting" },
  learn: { base: "learn", s3: "learns", past: "learned", pastParticiple: "learned", gerund: "learning" },
  change: { base: "change", s3: "changes", past: "changed", pastParticiple: "changed", gerund: "changing" },
  lead: { base: "lead", s3: "leads", past: "led", pastParticiple: "led", gerund: "leading" },
  understand: { base: "understand", s3: "understands", past: "understood", pastParticiple: "understood", gerund: "understanding" },
  watch: { base: "watch", s3: "watches", past: "watched", pastParticiple: "watched", gerund: "watching" },
  follow: { base: "follow", s3: "follows", past: "followed", pastParticiple: "followed", gerund: "following" },
  stop: { base: "stop", s3: "stops", past: "stopped", pastParticiple: "stopped", gerund: "stopping" },
  create: { base: "create", s3: "creates", past: "created", pastParticiple: "created", gerund: "creating" },
  speak: { base: "speak", s3: "speaks", past: "spoke", pastParticiple: "spoken", gerund: "speaking" },
  read: { base: "read", s3: "reads", past: "read", pastParticiple: "read", gerund: "reading" },
  spend: { base: "spend", s3: "spends", past: "spent", pastParticiple: "spent", gerund: "spending" },
  grow: { base: "grow", s3: "grows", past: "grew", pastParticiple: "grown", gerund: "growing" },
  open: { base: "open", s3: "opens", past: "opened", pastParticiple: "opened", gerund: "opening" },
  walk: { base: "walk", s3: "walks", past: "walked", pastParticiple: "walked", gerund: "walking" },
  win: { base: "win", s3: "wins", past: "won", pastParticiple: "won", gerund: "winning" },
  offer: { base: "offer", s3: "offers", past: "offered", pastParticiple: "offered", gerund: "offering" },
  remember: { base: "remember", s3: "remembers", past: "remembered", pastParticiple: "remembered", gerund: "remembering" },
  love: { base: "love", s3: "loves", past: "loved", pastParticiple: "loved", gerund: "loving" },
  consider: { base: "consider", s3: "considers", past: "considered", pastParticiple: "considered", gerund: "considering" },
  appear: { base: "appear", s3: "appears", past: "appeared", pastParticiple: "appeared", gerund: "appearing" },
  become: { base: "become", s3: "becomes", past: "became", pastParticiple: "become", gerund: "becoming" },
  drive: { base: "drive", s3: "drives", past: "drove", pastParticiple: "driven", gerund: "driving" },
  fly: { base: "fly", s3: "flies", past: "flew", pastParticiple: "flown", gerund: "flying" },
  eat: { base: "eat", s3: "eats", past: "ate", pastParticiple: "eaten", gerund: "eating" },
  drink: { base: "drink", s3: "drinks", past: "drank", pastParticiple: "drunk", gerund: "drinking" },
  feed: { base: "feed", s3: "feeds", past: "fed", pastParticiple: "fed", gerund: "feeding" },
  sleep: { base: "sleep", s3: "sleeps", past: "slept", pastParticiple: "slept", gerund: "sleeping" },
  swim: { base: "swim", s3: "swims", past: "swam", pastParticiple: "swum", gerund: "swimming" },
  build: { base: "build", s3: "builds", past: "built", pastParticiple: "built", gerund: "building" },
  buy: { base: "buy", s3: "buys", past: "bought", pastParticiple: "bought", gerund: "buying" },
  sell: { base: "sell", s3: "sells", past: "sold", pastParticiple: "sold", gerund: "selling" },
  send: { base: "send", s3: "sends", past: "sent", pastParticiple: "sent", gerund: "sending" },
  put: { base: "put", s3: "puts", past: "put", pastParticiple: "put", gerund: "putting" },
  cut: { base: "cut", s3: "cuts", past: "cut", pastParticiple: "cut", gerund: "cutting" },
  hit: { base: "hit", s3: "hits", past: "hit", pastParticiple: "hit", gerund: "hitting" },
  hurt: { base: "hurt", s3: "hurts", past: "hurt", pastParticiple: "hurt", gerund: "hurting" },
  fix: { base: "fix", s3: "fixes", past: "fixed", pastParticiple: "fixed", gerund: "fixing" },
  break: { base: "break", s3: "breaks", past: "broke", pastParticiple: "broken", gerund: "breaking" },
  deploy: { base: "deploy", s3: "deploys", past: "deployed", pastParticiple: "deployed", gerund: "deploying" },
  ship: { base: "ship", s3: "ships", past: "shipped", pastParticiple: "shipped", gerund: "shipping" },
  merge: { base: "merge", s3: "merges", past: "merged", pastParticiple: "merged", gerund: "merging" },
  review: { base: "review", s3: "reviews", past: "reviewed", pastParticiple: "reviewed", gerund: "reviewing" },
};

const IRREGULAR_PLURALS: Record<string, string> = {
  child: "children",
  man: "men",
  woman: "women",
  person: "people",
  tooth: "teeth",
  foot: "feet",
  mouse: "mice",
  goose: "geese",
};

function isVowel(c: string): boolean {
  return /[aeiou]/i.test(c);
}

function lastChar(s: string): string {
  return s.slice(-1);
}

function secondLastChar(s: string): string {
  return s.slice(-2, -1);
}

function endsWithSibilantOrO(s: string): boolean {
  return /(ch|sh|x|s|z|o)$/i.test(s);
}

function consonantPlusY(s: string): boolean {
  return s.length >= 2 && lastChar(s).toLowerCase() === "y" && !isVowel(secondLastChar(s));
}

function isOneSyllableCVC(base: string): boolean {
  const w = base.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length < 3) return false;
  const vowels = w.split("").filter((c) => isVowel(c)).length;
  if (vowels !== 1) return false;
  const a = w[w.length - 3] ?? "";
  const b = w[w.length - 2] ?? "";
  const c = w[w.length - 1] ?? "";
  return !isVowel(a) && isVowel(b) && !isVowel(c);
}

function regularThirdSingular(base: string): string {
  const w = base.toLowerCase();
  if (consonantPlusY(w)) return `${w.slice(0, -1)}ies`;
  if (endsWithSibilantOrO(w)) return `${w}es`;
  return `${w}s`;
}

function regularPast(base: string): string {
  const w = base.toLowerCase();
  if (w.endsWith("e")) return `${w}d`;
  if (consonantPlusY(w)) return `${w.slice(0, -1)}ied`;
  if (isOneSyllableCVC(w)) return `${w}${lastChar(w)}ed`;
  return `${w}ed`;
}

function regularGerund(base: string): string {
  const w = base.toLowerCase();
  if (w.endsWith("ie")) return `${w.slice(0, -2)}ying`;
  if (w.endsWith("e") && w !== "be" && !w.endsWith("ee")) return `${w.slice(0, -1)}ing`;
  if (isOneSyllableCVC(w)) return `${w}${lastChar(w)}ing`;
  return `${w}ing`;
}

export function verbForm(lemma: string, form: "base" | "s3" | "past" | "pastParticiple" | "gerund"): string {
  const w = lemma.trim().toLowerCase();
  const row = IRREGULAR_VERBS[w];
  if (row) return row[form];
  switch (form) {
    case "base": return w;
    case "s3": return regularThirdSingular(w);
    case "past": return regularPast(w);
    case "pastParticiple": return regularPast(w); // regular: past == pastParticiple
    case "gerund": return regularGerund(w);
  }
}

export function nounPlural(lemma: string): string {
  const w = lemma.trim();
  const key = w.toLowerCase();
  const irr = IRREGULAR_PLURALS[key];
  if (irr) return irr;
  const lw = key;
  if (lw.endsWith("s") || lw.endsWith("x") || lw.endsWith("z") || lw.endsWith("ch") || lw.endsWith("sh")) {
    return `${w}es`;
  }
  if (consonantPlusY(lw)) return `${w.slice(0, -1)}ies`;
  return `${w}s`;
}

function syllableHeuristic(adj: string): number {
  const w = adj.toLowerCase().replace(/[^a-z]/g, "");
  if (w.length === 0) return 1;
  let count = 0;
  let prevV = false;
  for (const ch of w) {
    const v = isVowel(ch);
    if (v && !prevV) count += 1;
    prevV = v;
  }
  // Silent final -e is not its own syllable — EXCEPT in "-le" endings (ta-ble, sim-ple),
  // where the -le carries a syllable. Subtracting there undercounts (e.g. reliable).
  if (w.endsWith("e") && !w.endsWith("le") && count > 1) count -= 1;
  return Math.max(1, count);
}

// A "short" adjective takes -er/-est: one syllable, or two syllables ending in
// y / le / ow / er. Everything else routes through more/most.
function isShortAdj(w: string): boolean {
  const syl = syllableHeuristic(w);
  if (syl <= 1) return true;
  if (syl === 2 && /(y|le|ow|er)$/.test(w)) return true;
  return false;
}

export function adjForm(lemma: string, form: "base" | "comparative" | "superlative"): string {
  if (form === "base") return lemma.trim().toLowerCase();
  const w = lemma.trim().toLowerCase();
  if (form === "comparative") {
    if (w === "good") return "better";
    if (w === "bad") return "worse";
    if (w === "far") return "farther";
    if (w === "many" || w === "much") return "more";
    if (w === "little") return "less";
    if (!isShortAdj(w)) return `more ${w}`;
    if (consonantPlusY(w)) return `${w.slice(0, -1)}ier`;
    if (isOneSyllableCVC(w)) return `${w}${lastChar(w)}er`;
    if (w.endsWith("e")) return `${w}r`;
    return `${w}er`;
  }
  // superlative
  if (w === "good") return "best";
  if (w === "bad") return "worst";
  if (w === "far") return "farthest";
  if (w === "many" || w === "much") return "most";
  if (!isShortAdj(w)) return `most ${w}`;
  if (consonantPlusY(w)) return `${w.slice(0, -1)}iest`;
  if (isOneSyllableCVC(w)) return `${w}${lastChar(w)}est`;
  if (w.endsWith("e")) return `${w}st`;
  return `${w}est`;
}
