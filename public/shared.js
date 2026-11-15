/* Shared by the server and the browser: exercise catalog and content rules. */
(function (root) {
  const ART = ['le', 'la', 'les', 'un', 'une', 'el', 'los', 'las', 'una', 'unos', 'unas'];
  const isSentence = (fr) => {
    const t = String(fr).trim().split(/\s+/).filter(Boolean);
    if (t.length >= 4) return true;
    if (t.length < 3) return false;
    if (/[.!?]$/.test(fr.trim())) return true;
    const first = t[0].toLowerCase();
    return !(ART.includes(first) || /^l['’]/i.test(first)); // "la grande maison" is a noun phrase
  };
  const parseArticle = (fr) => {
    const s = String(fr).trim();
    const m = s.match(/^(l['’])(\S.*)$/i) || s.match(/^(le|la|les|un|une)\s+(\S.*)$/i);
    return m ? { art: m[1].toLowerCase().replace('’', "'"), noun: m[2] } : null;
  };
  const PRONOUNS = ['je', 'tu', 'il/elle', 'nous', 'vous', 'ils/elles'];
  const pronounFor = (i, form) => (i === 0 && /^[aeiouhàâéèêëîïôùûœ]/i.test(form) ? "j'" : PRONOUNS[i]);

  const CATEGORIES = [
    { id: 'vocab', name: 'Vocabulary' },
    { id: 'listen', name: 'Listening and typing' },
    { id: 'sent', name: 'Sentences' },
    { id: 'verbs', name: 'Verbs' },
    { id: 'gram', name: 'Grammar' }
  ];
  /* need: what content is required. i = vocab items, s = sentences, n = nouns with articles, v = verbs, g = grammar gaps, go = grammar gaps with wrong options */
  const CATALOG = [
    { id: 'match', cat: 'vocab', ic: '🧩', name: 'Match pairs', desc: 'Tap the matching French and English.', need: 'i4' },
    { id: 'translate', cat: 'vocab', ic: '🔄', name: 'English to French', desc: 'See English, pick the French.', need: 'i4' },
    { id: 'meaning', cat: 'vocab', ic: '🇬🇧', name: 'French to English', desc: 'See French, pick what it means.', need: 'i4' },
    { id: 'flash', cat: 'vocab', ic: '🃏', name: 'Flashcards', desc: 'Flip the card and say if you knew it.', need: 'i2' },
    { id: 'typeit', cat: 'vocab', ic: '⌨️', name: 'Type the French', desc: 'See English, type the French (accents count).', need: 'i1' },
    { id: 'article', cat: 'vocab', ic: '🏷️', name: 'Le, la or l\'?', desc: 'Pick the right article for each noun.', need: 'n4' },
    { id: 'truefalse', cat: 'vocab', ic: '✅', name: 'True or false', desc: 'Is this translation right?', need: 'i4' },
    { id: 'listen', cat: 'listen', ic: '👂', name: 'Listen and pick', desc: 'Hear a word, pick what was said.', need: 'i4' },
    { id: 'dictation', cat: 'listen', ic: '✍️', name: 'Dictation', desc: 'Hear it, then type what you heard.', need: 'i1' },
    { id: 'tap', cat: 'listen', ic: '👆', name: 'Tap what you hear', desc: 'Hear a sentence, build it from tiles.', need: 's3' },
    { id: 'spaces', cat: 'sent', ic: '↔️', name: 'Add spaces', desc: 'Put the spaces into a sentence.', need: 's3' },
    { id: 'odd', cat: 'sent', ic: '🔍', name: 'Odd words out', desc: 'Pull out the words that do not belong.', need: 's3' },
    { id: 'build', cat: 'sent', ic: '🧱', name: 'Build the sentence', desc: 'See English, build the French from tiles.', need: 's3' },
    { id: 'cloze', cat: 'sent', ic: '🕳️', name: 'Missing word', desc: 'Pick the word that fills the gap.', need: 's3' },
    { id: 'conjpick', cat: 'verbs', ic: '🎯', name: 'Pick the verb form', desc: 'Choose the right form for the pronoun.', need: 'v1' },
    { id: 'conjtype', cat: 'verbs', ic: '✏️', name: 'Conjugate it', desc: 'Type the verb form.', need: 'v1' },
    { id: 'conjmatch', cat: 'verbs', ic: '🔗', name: 'Match pronoun and verb', desc: 'Join each pronoun to its verb form.', need: 'v1' },
    { id: 'gappick', cat: 'gram', ic: '🔘', name: 'Fill the gap (choose)', desc: 'Pick the correct word for the gap.', need: 'go1' },
    { id: 'gaptype', cat: 'gram', ic: '📝', name: 'Fill the gap (type)', desc: 'Type the missing word.', need: 'g1' }
  ];
  const EXERCISES = {}; CATALOG.forEach((c) => { EXERCISES[c.id] = c; });
  for (let n = 1; n <= 10; n++) EXERCISES['L' + n] = { id: 'L' + n, cat: 'lesson', ic: '📘', name: 'Lesson ' + n, desc: 'Mixed practice: words, sounds and sentences', lesson: true };
  const isLesson = (k) => /^L\d+$/.test(k);
  /* a mixed homework gets one lesson per ~8 items (2 to 8 lessons) */
  const lessonCount = (items) => Math.max(2, Math.min(10, Math.ceil((items || []).length / 10)));
  const NEED_TEXT = { i4: 'at least 4 vocabulary items', i2: 'at least 2 vocabulary items', i1: 'at least 1 vocabulary item', s3: '3 or more sentences', n4: '4 nouns that start with le, la, l\', les, un or une', v1: 'at least 1 verb', g1: 'at least 1 grammar question', go1: 'a grammar question with wrong options' };

  function contentStats(items, verbs, grammar) {
    items = items || []; verbs = verbs || []; grammar = grammar || [];
    const w = items.filter((i) => !(i.s != null ? i.s : isSentence(i.fr)));
    return { i: items.length, s: items.length - w.length, n: w.filter((i) => parseArticle(i.fr)).length, v: verbs.length, g: grammar.length, go: grammar.filter((x) => x.o && x.o.length).length };
  }
  function supports(id, st) {
    const need = EXERCISES[id] && EXERCISES[id].need; if (!need) return false;
    const k = need.match(/^([a-z]+)(\d+)$/); return st[k[1]] >= +k[2];
  }
  const out = { isLesson, lessonCount, CATALOG, CATEGORIES, EXERCISES, NEED_TEXT, isSentence, parseArticle, PRONOUNS, pronounFor, contentStats, supports };
  if (typeof module !== 'undefined' && module.exports) module.exports = out; else Object.assign(root, out);
})(typeof window !== 'undefined' ? window : globalThis);
