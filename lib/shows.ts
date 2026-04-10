// lib/shows.ts
// Show profiles — art style prompts, character definitions, and visual descriptions
// Used by the unified scene pipeline to generate 1:1 faithful or stylized recreations

// ── Art Style Types ─────────────────────────────────────────────
export type ArtStyleId =
  | 'source-faithful'   // 1:1 recreation of the original show's look
  | 'cinematic'
  | 'anime'
  | 'comic'
  | 'photorealistic'
  | 'watercolor'
  | 'noir'
  | '3d_render'
  | 'retro'
  | 'pixel'
  | 'oil_paint';

export interface ArtStyle {
  id: ArtStyleId;
  label: string;
  emoji: string;
  prompt: string;          // Base prompt suffix for this style
  description: string;
}

export const ART_STYLES: ArtStyle[] = [
  {
    id: 'source-faithful',
    label: 'Source Faithful',
    emoji: '🎯',
    prompt: '',  // Overridden per-show — uses show.visualStyle
    description: '1:1 recreation matching the original show\'s art style',
  },
  { id: 'cinematic',      label: 'Cinematic',      emoji: '🎬', prompt: 'cinematic film still, professional cinematography, dramatic lighting, shallow depth of field, anamorphic lens, color graded', description: 'Film-quality cinematic look' },
  { id: 'anime',          label: 'Anime',          emoji: '🌸', prompt: 'anime style, Studio Ghibli inspired, vibrant colors, detailed cel shading, Japanese animation', description: 'Japanese anime style' },
  { id: 'comic',          label: 'Comic Book',     emoji: '💥', prompt: 'comic book art style, bold outlines, halftone dots, vibrant panels, dynamic composition', description: 'Bold comic book panels' },
  { id: 'photorealistic', label: 'Photorealistic', emoji: '📷', prompt: 'photorealistic, ultra HD, 8k, raw photo, hyperrealistic detail, natural lighting', description: 'Ultra-realistic photo quality' },
  { id: 'watercolor',     label: 'Watercolor',     emoji: '🎨', prompt: 'watercolor painting, soft edges, flowing colors, artistic brush strokes, paper texture', description: 'Soft watercolor painting' },
  { id: 'noir',           label: 'Film Noir',      emoji: '🌑', prompt: 'film noir style, high contrast black and white, dramatic shadows, venetian blinds lighting, 1940s aesthetic', description: 'Classic film noir look' },
  { id: '3d_render',      label: '3D Render',      emoji: '🧊', prompt: '3D rendered, Pixar quality, subsurface scattering, global illumination, octane render', description: 'Pixar-quality 3D render' },
  { id: 'retro',          label: 'Retro/VHS',      emoji: '📼', prompt: 'retro VHS aesthetic, scan lines, chromatic aberration, 80s color palette, CRT screen effect', description: '80s retro VHS aesthetic' },
  { id: 'pixel',          label: 'Pixel Art',      emoji: '👾', prompt: '16-bit pixel art style, retro game aesthetic, clean pixel work, limited color palette', description: 'Retro pixel art' },
  { id: 'oil_paint',      label: 'Oil Painting',   emoji: '🖼️', prompt: 'oil painting masterpiece, rich impasto texture, museum quality, classical fine art composition', description: 'Classical oil painting' },
];

// ── Character Definition ────────────────────────────────────────
export interface ShowCharacter {
  id: string;
  name: string;
  role: string;
  emoji: string;
  // Visual description for prompting (how to draw them)
  visualDesc: string;
  // Voice description for audio-capable models (how they sound)
  voiceDesc: string;
}

// ── Show Profile ────────────────────────────────────────────────
export interface ShowProfile {
  id: string;
  title: string;
  category: 'TV Show' | 'Movie' | 'Anime' | 'Cartoon' | 'News Show';
  // The visual style prompt that makes generated content look like the actual show
  visualStyle: string;
  // Ambient sound / tone description for audio generation
  audioTone: string;
  characters: ShowCharacter[];
}

// ── Show Database ───────────────────────────────────────────────
export const SHOW_PROFILES: Record<string, ShowProfile> = {
  'Rick and Morty': {
    id: 'rick-and-morty',
    title: 'Rick and Morty',
    category: 'Cartoon',
    visualStyle: 'Rick and Morty animated style, bold flat colors, thick black outlines, exaggerated character proportions, detailed sci-fi backgrounds, Adult Swim cartoon aesthetic, sharp clean lines, vibrant neon accents on dark backgrounds',
    audioTone: 'sci-fi ambient sounds, portal gun effects, burping, chaotic energy, dark humor tone',
    characters: [
      { id: 'rm1', name: 'Rick Sanchez', role: 'Genius Scientist', emoji: '🧪', visualDesc: 'old man with spiky blue-grey hair, unibrow, lab coat, drool on chin, flask in hand', voiceDesc: 'raspy, drunk-sounding, belching mid-sentence, cynical and arrogant, rapid speech' },
      { id: 'rm2', name: 'Morty Smith', role: 'Reluctant Sidekick', emoji: '😰', visualDesc: 'nervous teen boy, brown hair, yellow shirt, blue pants, wide scared eyes', voiceDesc: 'nervous, stuttering, high-pitched, anxious teen voice, frequently says "aw jeez"' },
      { id: 'rm3', name: 'Mr. Meeseeks', role: 'Existence is Pain', emoji: '🔵', visualDesc: 'tall blue humanoid creature, simple face, always smiling, lanky body', voiceDesc: 'enthusiastic, high-pitched, cheerful but increasingly desperate' },
    ],
  },
  'Breaking Bad': {
    id: 'breaking-bad',
    title: 'Breaking Bad',
    category: 'TV Show',
    visualStyle: 'Breaking Bad visual style, desaturated desert cinematography, warm amber and teal color grading, harsh New Mexico sunlight, gritty realism, wide establishing shots, dramatic close-ups',
    audioTone: 'tense silence, desert wind, subtle suspenseful score, industrial sounds',
    characters: [
      { id: 'bb1', name: 'Walter White', role: 'Chemistry Teacher / Heisenberg', emoji: '🧪', visualDesc: 'bald middle-aged man with goatee, glasses, pork pie hat as Heisenberg, green or beige clothing', voiceDesc: 'calm and calculated, soft-spoken but menacing, measured delivery, "say my name" authority' },
      { id: 'bb2', name: 'Jesse Pinkman', role: 'Partner in Crime', emoji: '🔥', visualDesc: 'young man in baggy clothes, beanie hat, often bruised or disheveled', voiceDesc: 'street slang, emotional, says "yo" and "bitch" frequently, raw and vulnerable' },
      { id: 'bb3', name: 'Gus Fring', role: 'The Chicken Man', emoji: '🍗', visualDesc: 'well-dressed Black/Chilean man, glasses, polite smile, Los Pollos Hermanos uniform', voiceDesc: 'extremely polite, soft-spoken, controlled menace, formal speech patterns' },
      { id: 'bb4', name: 'Saul Goodman', role: 'Criminal Lawyer', emoji: '⚖️', visualDesc: 'flashy lawyer in colorful suits, slicked-back hair, gaudy office', voiceDesc: 'fast-talking, sleazy charm, lawyer speak mixed with street talk, persuasive' },
    ],
  },
  'Naruto': {
    id: 'naruto',
    title: 'Naruto',
    category: 'Anime',
    visualStyle: 'Naruto anime art style, Masashi Kishimoto character designs, cel-shaded animation, dynamic action lines, speed blur effects, Japanese village backgrounds, ninja aesthetic, vibrant orange and blue color palette',
    audioTone: 'Japanese flute and drums, wind sounds, battle shouts, jutsu activation effects',
    characters: [
      { id: 'na1', name: 'Naruto Uzumaki', role: 'Future Hokage', emoji: '🔥', visualDesc: 'spiky blonde hair, blue eyes, orange and black ninja outfit, whisker marks on cheeks, Konoha headband', voiceDesc: 'loud, determined, energetic, says "believe it!" and "dattebayo", never gives up attitude' },
      { id: 'na2', name: 'Sasuke Uchiha', role: 'The Avenger', emoji: '⚡', visualDesc: 'dark spiky hair, Sharingan red eyes, dark blue outfit, brooding expression', voiceDesc: 'cold, calculated, deep voice, minimal words, intense and brooding' },
      { id: 'na3', name: 'Kakashi Hatake', role: 'Copy Ninja', emoji: '📖', visualDesc: 'silver gravity-defying hair, face mask covering lower face, one Sharingan eye, Jounin vest', voiceDesc: 'laid-back, calm, reads inappropriate books, wise but lazy-sounding' },
    ],
  },
  'The Simpsons': {
    id: 'the-simpsons',
    title: 'The Simpsons',
    category: 'Cartoon',
    visualStyle: 'The Simpsons animation style, yellow-skinned characters, overbite, four fingers, bold black outlines, bright flat colors, simple round eyes, Matt Groening character design',
    audioTone: 'sitcom-style ambient, Danny Elfman theme style, Springfield town sounds, comedic timing beats',
    characters: [
      { id: 'sm1', name: 'Homer Simpson', role: 'Nuclear Safety Inspector', emoji: '🍩', visualDesc: 'overweight yellow man, bald with two curved hairs, white shirt, blue pants', voiceDesc: 'deep dopey voice, says "D\'oh!", loves donuts and beer, enthusiastic but dim' },
      { id: 'sm2', name: 'Bart Simpson', role: 'The Troublemaker', emoji: '😈', visualDesc: 'spiky yellow hair, red shirt, blue shorts, mischievous grin', voiceDesc: 'bratty kid voice, says "eat my shorts" and "ay caramba", prankster energy' },
      { id: 'sm3', name: 'Marge Simpson', role: 'The Mom', emoji: '💙', visualDesc: 'tall blue beehive hair, green dress, pearl necklace, concerned expression', voiceDesc: 'raspy concerned voice, worried sighing, motherly nagging, distinctive groan' },
    ],
  },
  'South Park': {
    id: 'south-park',
    title: 'South Park',
    category: 'Cartoon',
    visualStyle: 'South Park animation style, crude paper cutout aesthetic, simple geometric shapes, flat colors, minimal detail, small round heads, dot eyes, construction paper look',
    audioTone: 'crude humor sounds, muffled Kenny speech, satirical tone, small-town Colorado ambient',
    characters: [
      { id: 'sp1', name: 'Eric Cartman', role: 'The Manipulator', emoji: '😡', visualDesc: 'overweight kid, red jacket, yellow pom-pom hat, angry eyebrows', voiceDesc: 'whiny, demanding, high-pitched, says "respect my authoritah!", manipulative and bratty' },
      { id: 'sp2', name: 'Kenny McCormick', role: 'The Immortal', emoji: '🧡', visualDesc: 'orange parka covering most of face, only eyes visible, hood strings pulled tight', voiceDesc: 'muffled speech through parka, barely intelligible, dies frequently' },
      { id: 'sp3', name: 'Randy Marsh', role: 'The Dad', emoji: '🍷', visualDesc: 'dark-haired adult man, mustache, blue shirt, often in ridiculous situations', voiceDesc: 'middle-aged dad voice, overly dramatic, panics easily, says "oh my god"' },
    ],
  },
  'Game of Thrones': {
    id: 'game-of-thrones',
    title: 'Game of Thrones',
    category: 'TV Show',
    visualStyle: 'Game of Thrones visual style, medieval fantasy, dark moody cinematography, natural candlelight and torchlight, epic landscape shots, cold blue-grey Northern palette, warm golden Southern palette, HBO production quality',
    audioTone: 'epic orchestral score, Ramin Djawadi style, sword clashing, dragon roars, medieval ambient',
    characters: [
      { id: 'gt1', name: 'Daenerys Targaryen', role: 'Mother of Dragons', emoji: '🐉', visualDesc: 'platinum blonde braided hair, violet eyes, regal clothing, dragons nearby', voiceDesc: 'commanding, regal, idealistic, British accent, progressively more intense' },
      { id: 'gt2', name: 'Jon Snow', role: 'King in the North', emoji: '🗡️', visualDesc: 'dark curly hair, fur cloak, Stark/Night\'s Watch black, brooding expression, Longclaw sword', voiceDesc: 'Northern English accent, brooding, honorable, says "you know nothing", serious tone' },
      { id: 'gt3', name: 'Tyrion Lannister', role: 'The Imp', emoji: '🍷', visualDesc: 'short man with blonde-brown hair, facial scar, often holding wine goblet, rich clothing', voiceDesc: 'witty, eloquent, drinks and knows things, sharp intellect in every word' },
    ],
  },
  'One Piece': {
    id: 'one-piece',
    title: 'One Piece',
    category: 'Anime',
    visualStyle: 'One Piece anime style, Eiichiro Oda character designs, exaggerated proportions, big expressive eyes, vibrant ocean colors, pirate ship backgrounds, dynamic action poses, bold bright colors',
    audioTone: 'ocean waves, pirate adventure music, battle cries, rubber stretching sounds, We Are! energy',
    characters: [
      { id: 'op1', name: 'Monkey D. Luffy', role: 'Future Pirate King', emoji: '🏴‍☠️', visualDesc: 'straw hat, red vest, blue shorts, rubbery stretching limbs, big goofy smile, scar under left eye', voiceDesc: 'energetic, carefree, loud, says "I\'m gonna be King of the Pirates!", cheerful and determined' },
      { id: 'op2', name: 'Roronoa Zoro', role: 'Three-Sword Style', emoji: '⚔️', visualDesc: 'green hair, three swords, green haramaki, muscular, serious expression, bandana', voiceDesc: 'deep, serious, gets lost easily, dedicated to becoming strongest swordsman' },
      { id: 'op3', name: 'Nami', role: 'Navigator', emoji: '🗺️', visualDesc: 'orange hair, blue tattoo on shoulder, fashionable clothes, often holding maps or money', voiceDesc: 'smart, money-obsessed, bossy but caring, yells at Luffy frequently' },
    ],
  },
  'Stranger Things': {
    id: 'stranger-things',
    title: 'Stranger Things',
    category: 'TV Show',
    visualStyle: 'Stranger Things visual style, 1980s small-town Indiana, warm nostalgic lighting, Spielberg-inspired cinematography, synth-wave neon accents, dark Upside Down contrast, suburban Americana meets supernatural horror',
    audioTone: 'synth-wave score, Stranger Things theme, 80s pop music, Upside Down eerie sounds, walkie-talkie static',
    characters: [
      { id: 'st1', name: 'Eleven', role: 'Psychokinetic Hero', emoji: '🧒', visualDesc: 'shaved or short hair, nosebleed when using powers, simple clothes, determined expression', voiceDesc: 'quiet, few words, intense, says "friends don\'t lie", emotionally powerful' },
      { id: 'st2', name: 'Dustin Henderson', role: 'The Brains', emoji: '🧢', visualDesc: 'curly hair under trucker cap, missing teeth, always smiling, nerdy clothes', voiceDesc: 'enthusiastic, nerdy, lisp, loyal friend, pop culture references' },
    ],
  },
  'Attack on Titan': {
    id: 'attack-on-titan',
    title: 'Attack on Titan',
    category: 'Anime',
    visualStyle: 'Attack on Titan anime style, WIT Studio / MAPPA quality, intense action scenes, ODM gear motion blur, massive Titans with grotesque detail, dark European medieval architecture, Survey Corps green cloaks, dramatic sky backdrops',
    audioTone: 'epic German-inspired choir, Sawano Hiroyuki orchestral score, ODM gear zipping sounds, Titan footsteps, intense battle cries',
    characters: [
      { id: 'at1', name: 'Eren Yeager', role: 'The Attack Titan', emoji: '🦢', visualDesc: 'brown hair, intense green eyes, Survey Corps uniform, transforms into Attack Titan', voiceDesc: 'passionate, angry, determined to fight, increasingly intense and radical' },
      { id: 'at2', name: 'Mikasa Ackerman', role: 'The Protector', emoji: '🛡️', visualDesc: 'short black hair, red scarf, Survey Corps uniform, stoic expression, incredibly skilled', voiceDesc: 'calm, protective, few words, intense loyalty, says "Eren" with deep emotion' },
      { id: 'at3', name: 'Levi Ackerman', role: 'Humanity\'s Strongest', emoji: '⚔️', visualDesc: 'short black hair, undercut, short stature, Survey Corps captain cape, bored expression', voiceDesc: 'monotone, blunt, clean freak, terrifyingly calm in battle, dry humor' },
    ],
  },
  // Placeholder for user-added shows
  'Custom': {
    id: 'custom',
    title: 'Custom',
    category: 'TV Show',
    visualStyle: '',
    audioTone: '',
    characters: [],
  },
};

// ── Helpers ──────────────────────────────────────────────────────

/**
 * Get the art style prompt for a given show + art style combination.
 * If 'source-faithful', returns the show's own visual style.
 * Otherwise returns the generic art style prompt.
 */
export function getStylePrompt(showTitle: string, artStyleId: ArtStyleId): string {
  if (artStyleId === 'source-faithful') {
    const show = SHOW_PROFILES[showTitle];
    if (show?.visualStyle) return show.visualStyle;
    // Fallback if show not in database
    return `faithful recreation of ${showTitle} visual style, matching the original show's art direction, character designs, and color palette exactly`;
  }
  const style = ART_STYLES.find(s => s.id === artStyleId);
  return style?.prompt || '';
}

/**
 * Build a complete scene prompt for video generation with native audio.
 * Includes visual style, character descriptions, dialogue, and audio cues.
 */
export function buildScenePrompt(params: {
  showTitle: string;
  artStyle: ArtStyleId;
  dialogue: { character: string; line: string }[];
  sceneDescription?: string;
  characters?: string[];  // Character names to include
}): string {
  const { showTitle, artStyle, dialogue, sceneDescription, characters } = params;
  const show = SHOW_PROFILES[showTitle];
  const stylePrompt = getStylePrompt(showTitle, artStyle);

  const parts: string[] = [];

  // Visual style
  parts.push(stylePrompt);

  // Scene description
  if (sceneDescription) {
    parts.push(sceneDescription);
  }

  // Character visuals (for source-faithful, include character-specific descriptions)
  if (show && characters?.length) {
    const charDescs = characters
      .map(name => show.characters.find(c => c.name === name))
      .filter(Boolean)
      .map(c => `${c!.name}: ${c!.visualDesc}`)
      .join('. ');
    if (charDescs) parts.push(charDescs);
  }

  // Dialogue — embedded directly so audio-capable models generate characters speaking
  if (dialogue.length > 0) {
    const dialogueStr = dialogue
      .map(d => {
        const char = show?.characters.find(c => c.name === d.character);
        // Include voice description so the model knows how they should sound
        const voiceHint = char?.voiceDesc ? ` (${char.voiceDesc})` : '';
        return `${d.character}${voiceHint}: "${d.line}"`;
      })
      .join('\n');
    parts.push(`Characters speaking in the scene:\n${dialogueStr}`);
  }

  // Audio tone for ambient sound
  if (show?.audioTone) {
    parts.push(`Ambient audio: ${show.audioTone}`);
  }

  return parts.join('. ');
}

/**
 * Get all available shows.
 */
export function getAvailableShows(): { id: string; title: string; category: string; characterCount: number }[] {
  return Object.values(SHOW_PROFILES)
    .filter(s => s.id !== 'custom')
    .map(s => ({
      id: s.id,
      title: s.title,
      category: s.category,
      characterCount: s.characters.length,
    }));
}

/**
 * Get characters for a specific show.
 */
export function getShowCharacters(showTitle: string): ShowCharacter[] {
  return SHOW_PROFILES[showTitle]?.characters || [];
}
