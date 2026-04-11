// lib/shows.ts
// Show profiles - art style prompts, character definitions, and visual descriptions
// Used by the unified scene pipeline to generate 1:1 faithful or stylized recreations

// -- Art Style Types ---------------------------------------------
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
  prompt: string;
  description: string;
}

export const ART_STYLES: ArtStyle[] = [
  { id: 'source-faithful', label: 'Original', emoji: '\u{1F3AF}', prompt: '', description: '1:1 recreation matching the original show\'s art style' },
  { id: 'cinematic',      label: 'Cinematic',      emoji: '\u{1F3AC}', prompt: 'cinematic film still, professional cinematography, dramatic lighting, shallow depth of field, anamorphic lens, color graded', description: 'Film-quality cinematic look' },
  { id: 'anime',          label: 'Anime',          emoji: '\u{1F338}', prompt: 'anime style, Studio Ghibli inspired, vibrant colors, detailed cel shading, Japanese animation', description: 'Japanese anime style' },
  { id: 'comic',          label: 'Comic Book',     emoji: '\u{1F4A5}', prompt: 'comic book art style, bold outlines, halftone dots, vibrant panels, dynamic composition', description: 'Bold comic book panels' },
  { id: 'photorealistic', label: 'Photorealistic', emoji: '\u{1F4F7}', prompt: 'photorealistic, ultra HD, 8k, raw photo, hyperrealistic detail, natural lighting', description: 'Ultra-realistic photo quality' },
  { id: 'watercolor',     label: 'Watercolor',     emoji: '\u{1F3A8}', prompt: 'watercolor painting, soft edges, flowing colors, artistic brush strokes, paper texture', description: 'Soft watercolor painting' },
  { id: 'noir',           label: 'Film Noir',      emoji: '\u{1F311}', prompt: 'film noir style, high contrast black and white, dramatic shadows, venetian blinds lighting, 1940s aesthetic', description: 'Classic film noir look' },
  { id: '3d_render',      label: '3D Render',      emoji: '\u{1F9CA}', prompt: '3D rendered, Pixar quality, subsurface scattering, global illumination, octane render', description: 'Pixar-quality 3D render' },
  { id: 'retro',          label: 'Retro/VHS',      emoji: '\u{1F4FC}', prompt: 'retro VHS aesthetic, scan lines, chromatic aberration, 80s color palette, CRT screen effect', description: '80s retro VHS aesthetic' },
  { id: 'pixel',          label: 'Pixel Art',      emoji: '\u{1F47E}', prompt: '16-bit pixel art style, retro game aesthetic, clean pixel work, limited color palette', description: 'Retro pixel art' },
  { id: 'oil_paint',      label: 'Oil Painting',   emoji: '\u{1F5BC}\uFE0F', prompt: 'oil painting masterpiece, rich impasto texture, museum quality, classical fine art composition', description: 'Classical oil painting' },
];

// -- Character Definition ----------------------------------------
export interface ShowCharacter {
  id: string;
  name: string;
  role: string;
  emoji: string;
  visualDesc: string;
  voiceDesc: string;
}

// -- Show Profile ------------------------------------------------
export interface ShowProfile {
  id: string;
  title: string;
  category: 'TV Show' | 'Movie' | 'Anime' | 'Cartoon' | 'News Show';
  emoji?: string;
  visualStyle: string;
  audioTone: string;
  characters: ShowCharacter[];
}

// -- Show Database -----------------------------------------------
export const SHOW_PROFILES: Record<string, ShowProfile> = {

  // ---------------------------------------------------------------
  // TV SHOWS: DRAMA / CRIME
  // ---------------------------------------------------------------

  'Breaking Bad': {
    id: 'breaking-bad', title: 'Breaking Bad', category: 'TV Show',
    visualStyle: 'Breaking Bad visual style, desaturated desert cinematography, warm amber and teal color grading, harsh New Mexico sunlight, gritty realism, wide establishing shots, dramatic close-ups',
    audioTone: 'tense silence, desert wind, subtle suspenseful score, industrial sounds',
    characters: [
      { id: 'bb1', name: 'Walter White', role: 'Chemistry Teacher / Heisenberg', emoji: '\u{1F9EA}', visualDesc: 'bald middle-aged man with goatee, glasses, pork pie hat as Heisenberg, green or beige clothing', voiceDesc: 'calm and calculated, soft-spoken but menacing, measured delivery, "say my name" authority' },
      { id: 'bb2', name: 'Jesse Pinkman', role: 'Partner in Crime', emoji: '\u{1F525}', visualDesc: 'young man in baggy clothes, beanie hat, often bruised or disheveled', voiceDesc: 'street slang, emotional, says "yo" and "bitch" frequently, raw and vulnerable' },
      { id: 'bb3', name: 'Gus Fring', role: 'The Chicken Man', emoji: '\u{1F357}', visualDesc: 'well-dressed Black/Chilean man, glasses, polite smile, Los Pollos Hermanos uniform', voiceDesc: 'extremely polite, soft-spoken, controlled menace, formal speech patterns' },
      { id: 'bb4', name: 'Saul Goodman', role: 'Criminal Lawyer', emoji: '\u2696\uFE0F', visualDesc: 'flashy lawyer in colorful suits, slicked-back hair, gaudy office', voiceDesc: 'fast-talking, sleazy charm, lawyer speak mixed with street talk, persuasive' },
      { id: 'bb5', name: 'Mike Ehrmantraut', role: 'The Fixer', emoji: '\u{1F52B}', visualDesc: 'older bald man, world-weary expression, plain clothes, no-nonsense demeanor', voiceDesc: 'gruff, deadpan, dry humor, minimal words, intimidating calm' },
    ],
  },
  'Game of Thrones': {
    id: 'game-of-thrones', title: 'Game of Thrones', category: 'TV Show',
    visualStyle: 'Game of Thrones visual style, medieval fantasy, dark moody cinematography, natural candlelight and torchlight, epic landscape shots, cold blue-grey Northern palette, warm golden Southern palette, HBO production quality',
    audioTone: 'epic orchestral score, Ramin Djawadi style, sword clashing, dragon roars, medieval ambient',
    characters: [
      { id: 'gt1', name: 'Daenerys Targaryen', role: 'Mother of Dragons', emoji: '\u{1F409}', visualDesc: 'platinum blonde braided hair, violet eyes, regal clothing, dragons nearby', voiceDesc: 'commanding, regal, idealistic, British accent, progressively more intense' },
      { id: 'gt2', name: 'Jon Snow', role: 'King in the North', emoji: '\u{1F5E1}\uFE0F', visualDesc: 'dark curly hair, fur cloak, Stark/Night\'s Watch black, brooding expression, Longclaw sword', voiceDesc: 'Northern English accent, brooding, honorable, says "you know nothing", serious tone' },
      { id: 'gt3', name: 'Tyrion Lannister', role: 'The Imp', emoji: '\u{1F377}', visualDesc: 'short man with blonde-brown hair, facial scar, often holding wine goblet, rich clothing', voiceDesc: 'witty, eloquent, drinks and knows things, sharp intellect in every word' },
      { id: 'gt4', name: 'Arya Stark', role: 'No One', emoji: '\u{1F5E1}\uFE0F', visualDesc: 'young woman with short dark hair, Needle sword, leather armor, fierce determined eyes', voiceDesc: 'Northern accent, fierce, independent, recites kill list, deadpan delivery' },
      { id: 'gt5', name: 'Cersei Lannister', role: 'The Queen', emoji: '\u{1F451}', visualDesc: 'golden blonde hair, elegant royal gowns, cold regal beauty, wine glass in hand', voiceDesc: 'cold, imperious, cutting remarks, regal British accent, venomous charm' },
    ],
  },
  'The Sopranos': {
    id: 'the-sopranos', title: 'The Sopranos', category: 'TV Show',
    visualStyle: 'The Sopranos visual style, late 90s early 2000s New Jersey aesthetic, suburban homes, dim-lit back rooms, gold jewelry, dark leather interiors, HBO cinematic quality, muted earth tones',
    audioTone: 'classic rock soundtrack, tense silence, New Jersey Italian-American ambient, restaurant chatter',
    characters: [
      { id: 'sp1', name: 'Tony Soprano', role: 'Mob Boss', emoji: '\u{1F90C}', visualDesc: 'heavyset Italian-American man, dark hair, often in bathrobe or expensive suits, gold jewelry, cigar', voiceDesc: 'New Jersey Italian accent, menacing yet charismatic, switches between warm and terrifying, gravelly voice' },
      { id: 'sp2', name: 'Carmela Soprano', role: 'The Wife', emoji: '\u{1F48D}', visualDesc: 'well-dressed woman, gold jewelry, perfectly styled hair, suburban housewife elegance', voiceDesc: 'New Jersey accent, conflicted, sharp when angry, loving but frustrated' },
      { id: 'sp3', name: 'Christopher Moltisanti', role: 'The Prot\u00E9g\u00E9', emoji: '\u{1F3AC}', visualDesc: 'young Italian-American man, leather jacket, sharp features, often agitated', voiceDesc: 'impulsive, emotional, New Jersey accent, aspiring filmmaker talk mixed with mob speak' },
      { id: 'sp4', name: 'Dr. Melfi', role: 'The Therapist', emoji: '\u{1F4CB}', visualDesc: 'professional woman in business attire, calm demeanor, therapy office setting', voiceDesc: 'calm, professional, analytical, slight Italian-American accent, measured responses' },
    ],
  },
  'The Wire': {
    id: 'the-wire', title: 'The Wire', category: 'TV Show',
    visualStyle: 'The Wire visual style, gritty Baltimore streets, institutional fluorescent lighting, surveillance camera aesthetic, muted grey-blue palette, documentary-like realism, HBO raw cinematography',
    audioTone: 'street sounds, police radio chatter, Baltimore ambient, minimal score, raw dialogue-driven',
    characters: [
      { id: 'tw1', name: 'Jimmy McNulty', role: 'Rogue Detective', emoji: '\u{1F50D}', visualDesc: 'disheveled white detective, loosened tie, always drinking, stubborn expression', voiceDesc: 'Baltimore accent, sarcastic, confrontational, slurred when drunk, righteous anger' },
      { id: 'tw2', name: 'Omar Little', role: 'The Robin Hood', emoji: '\u{1F3AF}', visualDesc: 'Black man with facial scar, duster coat, shotgun, whistling while walking', voiceDesc: 'distinctive whistle, calm before violence, Baltimore street speak, philosophical, "Omar comin"' },
      { id: 'tw3', name: 'Avon Barksdale', role: 'Drug Kingpin', emoji: '\u{1F451}', visualDesc: 'muscular Black man, athletic build, expensive but understated clothing', voiceDesc: 'commanding, street authority, Baltimore accent, strategic mind' },
      { id: 'tw4', name: 'Stringer Bell', role: 'The Businessman', emoji: '\u{1F4CA}', visualDesc: 'well-dressed Black man in suits, Robert\'s Rules book, business professional look', voiceDesc: 'educated speech mixed with street, MBA vocabulary, strategic, cold when needed' },
    ],
  },
  'Peaky Blinders': {
    id: 'peaky-blinders', title: 'Peaky Blinders', category: 'TV Show',
    visualStyle: 'Peaky Blinders visual style, 1920s Birmingham England, dark smoky industrial streets, slow-motion dramatic walks, razor blade flat caps, vintage suits, sepia and blue-grey color grading, cinematic lighting',
    audioTone: 'anachronistic rock music (Arctic Monkeys, Nick Cave), industrial sounds, horse hooves on cobblestones, Birmingham accent dialogue',
    characters: [
      { id: 'pb1', name: 'Thomas Shelby', role: 'Boss of the Peaky Blinders', emoji: '\u{1F3A9}', visualDesc: 'sharp cheekbones, ice-blue eyes, peaked flat cap with razor blade, three-piece suit, cigarette in mouth, overcoat', voiceDesc: 'quiet Birmingham accent, calculated, rarely raises voice, intense pauses, "by order of the Peaky Blinders"' },
      { id: 'pb2', name: 'Arthur Shelby', role: 'The Enforcer', emoji: '\u{1F44A}', visualDesc: 'rough-looking man, peaked cap, scruffy, wild eyes, often bruised or bloodied', voiceDesc: 'loud Birmingham accent, volatile, switches from rage to tears, "ARTHUR!" energy' },
      { id: 'pb3', name: 'Polly Gray', role: 'The Matriarch', emoji: '\u{1F52E}', visualDesc: 'dark-haired woman, dramatic makeup, jewelry, fur coat, commanding presence', voiceDesc: 'sharp Birmingham accent, witty, fierce, spiritual undertones, protective' },
      { id: 'pb4', name: 'Alfie Solomons', role: 'Jewish Gang Leader', emoji: '\u{1F94A}', visualDesc: 'large bearded man, flat cap, glasses, wild gesticulations, dusty bakery', voiceDesc: 'East London Jewish accent, rambling monologues, unpredictable, philosophical tangents' },
    ],
  },
  'Better Call Saul': {
    id: 'better-call-saul', title: 'Better Call Saul', category: 'TV Show',
    visualStyle: 'Better Call Saul visual style, wide static shots, New Mexico desert, neon-lit strip malls, meticulous framing, warm amber tones transitioning to cold blue, legal office fluorescents, patient cinematography',
    audioTone: 'subtle tension, legal office ambiance, desert wind, sparse guitar score, courtroom echoes',
    characters: [
      { id: 'bc1', name: 'Jimmy McGill / Saul', role: 'Slippin\' Jimmy', emoji: '\u2696\uFE0F', visualDesc: 'charming man in increasingly flashy suits, slicked hair, initially modest then gaudy', voiceDesc: 'fast-talking, charismatic, shifting between sincere Jimmy and sleazy Saul, con-man charm' },
      { id: 'bc2', name: 'Kim Wexler', role: 'The Partner', emoji: '\u{1F4D1}', visualDesc: 'blonde ponytail, professional suits, determined expression, sharp and polished', voiceDesc: 'controlled, intelligent, fierce when provoked, quiet intensity, steady delivery' },
      { id: 'bc3', name: 'Nacho Varga', role: 'Double Agent', emoji: '\u{1F3AD}', visualDesc: 'Latino man, leather jacket, tough exterior but compassionate eyes, nervous energy', voiceDesc: 'measured, careful, street-smart, underlying fear, quiet desperation' },
      { id: 'bc4', name: 'Lalo Salamanca', role: 'Charismatic Villain', emoji: '\u{1F608}', visualDesc: 'handsome Latino man, warm smile hiding danger, casual expensive clothing', voiceDesc: 'cheerful, charming, laughing, switches to terrifying in an instant, Mexican accent' },
    ],
  },
  'Ozark': {
    id: 'ozark', title: 'Ozark', category: 'TV Show',
    visualStyle: 'Ozark visual style, blue-tinted color grading, Lake of the Ozarks Missouri, dark lakeside cabins, moody overcast skies, Netflix cinematic quality, cold and oppressive atmosphere',
    audioTone: 'eerie ambient, lake water sounds, tense piano, rural Missouri sounds, quiet dread',
    characters: [
      { id: 'oz1', name: 'Marty Byrde', role: 'Money Launderer', emoji: '\u{1F4B0}', visualDesc: 'unassuming white man in business casual, glasses, constantly stressed, average build', voiceDesc: 'rapid-fire financial explanations, nervous but controlled, Midwest flat delivery, analytical' },
      { id: 'oz2', name: 'Wendy Byrde', role: 'The Ambitious Wife', emoji: '\u{1F3DB}\uFE0F', visualDesc: 'put-together woman, increasingly powerful appearance, political ambition in her eyes', voiceDesc: 'politically savvy, manipulative warmth, escalating ruthlessness, Southern hints' },
      { id: 'oz3', name: 'Ruth Langmore', role: 'The Local', emoji: '\u{1F525}', visualDesc: 'young blonde woman, tough rural look, cutoff shorts, defiant posture', voiceDesc: 'thick Ozark accent, profanity-heavy, fierce, "I don\'t know shit about fuck", raw emotion' },
    ],
  },
  'Succession': {
    id: 'succession', title: 'Succession', category: 'TV Show',
    visualStyle: 'Succession visual style, ultra-wealthy interiors, penthouse views, corporate boardrooms, handheld documentary camera, muted earth tones and navy, private jets and yachts, HBO prestige cinematography',
    audioTone: 'Nicholas Britell hip-hop orchestral score, corporate ambient, helicopter blades, power struggle tension',
    characters: [
      { id: 'su1', name: 'Logan Roy', role: 'The Patriarch', emoji: '\u{1F981}', visualDesc: 'imposing elderly white man, silver hair, dark suits, intimidating glare, conference rooms', voiceDesc: 'Scottish-American growl, "fuck off", terrifying authority, bark-like commands, unpredictable rage' },
      { id: 'su2', name: 'Kendall Roy', role: 'The Heir', emoji: '\u{1F48A}', visualDesc: 'nervous-looking man in expensive casual, puffer vest over suit, trying too hard to be cool', voiceDesc: 'rambling, insecure bravado, rap references, desperate approval-seeking, cringeworthy confidence' },
      { id: 'su3', name: 'Shiv Roy', role: 'The Daughter', emoji: '\u{1F469}\u200D\u{1F4BC}', visualDesc: 'polished redhead woman in power suits, calculated expressions, political polish', voiceDesc: 'sharp, condescending, political operative speak, British-American accent blend' },
      { id: 'su4', name: 'Roman Roy', role: 'The Youngest', emoji: '\u{1F921}', visualDesc: 'slim young man, casual expensive clothes, smirking expression, fidgety energy', voiceDesc: 'crude jokes, deflecting with humor, insecure underneath, rapid-fire quips, inappropriately funny' },
    ],
  },

  // ---------------------------------------------------------------
  // TV SHOWS: SCI-FI / FANTASY / HORROR
  // ---------------------------------------------------------------

  'Stranger Things': {
    id: 'stranger-things', title: 'Stranger Things', category: 'TV Show',
    visualStyle: 'Stranger Things visual style, 1980s small-town Indiana, warm nostalgic lighting, Spielberg-inspired cinematography, synth-wave neon accents, dark Upside Down contrast, suburban Americana meets supernatural horror',
    audioTone: 'synth-wave score, Stranger Things theme, 80s pop music, Upside Down eerie sounds, walkie-talkie static',
    characters: [
      { id: 'st1', name: 'Eleven', role: 'Psychokinetic Hero', emoji: '\u{1F9D2}', visualDesc: 'shaved or short hair, nosebleed when using powers, simple clothes, determined expression', voiceDesc: 'quiet, few words, intense, says "friends don\'t lie", emotionally powerful' },
      { id: 'st2', name: 'Dustin Henderson', role: 'The Brains', emoji: '\u{1F9E2}', visualDesc: 'curly hair under trucker cap, missing teeth, always smiling, nerdy clothes', voiceDesc: 'enthusiastic, nerdy, lisp, loyal friend, pop culture references' },
      { id: 'st3', name: 'Steve Harrington', role: 'Babysitter King', emoji: '\u{1F987}', visualDesc: 'tall with iconic fluffy hair, sailor outfit or prep clothes, bat with nails', voiceDesc: 'confident but caring, evolved from jerk to protector, sarcastic humor' },
      { id: 'st4', name: 'Vecna', role: 'The Villain', emoji: '\u{1F570}\uFE0F', visualDesc: 'tall humanoid creature covered in vines and tendrils, one arm as clock hand, grotesque face', voiceDesc: 'deep, echoing, philosophical villain monologues, theatrical menace' },
      { id: 'st5', name: 'Hopper', role: 'The Chief', emoji: '\u{1F694}', visualDesc: 'large man in police chief uniform or Hawaiian shirt, mustache, gruff exterior', voiceDesc: 'gruff, protective, dad energy, yelling then tender, deep voice' },
    ],
  },
  'The Last of Us': {
    id: 'the-last-of-us', title: 'The Last of Us', category: 'TV Show',
    visualStyle: 'The Last of Us visual style, post-apocalyptic overgrown cities, nature reclaiming concrete, muted green-grey palette, fungal infection horror, emotional intimate close-ups, HBO cinematic quality',
    audioTone: 'Gustavo Santaolalla acoustic guitar, eerie silence, infected clicking sounds, nature ambient, emotional restraint',
    characters: [
      { id: 'tl1', name: 'Joel Miller', role: 'Smuggler / Protector', emoji: '\u{1F528}', visualDesc: 'rugged middle-aged man, flannel shirt, graying beard, weathered face, always armed', voiceDesc: 'Texas accent, gruff, emotionally guarded, few words, paternal when caring' },
      { id: 'tl2', name: 'Ellie Williams', role: 'The Immune One', emoji: '\u{1F344}', visualDesc: 'teenage girl, auburn ponytail, flannel over t-shirt, switchblade, bite scar on arm', voiceDesc: 'sarcastic teen, witty, dark humor, vulnerable underneath, "okay", determined' },
      { id: 'tl3', name: 'Tess', role: 'Joel\'s Partner', emoji: '\u{1F4AA}', visualDesc: 'tough woman, practical survival clothing, short dark hair, no-nonsense expression', voiceDesc: 'direct, pragmatic, Boston toughness, emotionally controlled, fierce loyalty' },
    ],
  },
  'The Mandalorian': {
    id: 'the-mandalorian', title: 'The Mandalorian', category: 'TV Show',
    visualStyle: 'The Mandalorian visual style, Star Wars universe, desert planets, chrome and leather, Mandalorian beskar armor, StageCraft LED volume backgrounds, Western in space aesthetic, Disney+ cinematic quality',
    audioTone: 'Ludwig G\u00F6ransson score, recorder flute theme, blaster sounds, space Western ambient, Grogu coos',
    characters: [
      { id: 'mn1', name: 'Din Djarin', role: 'The Mandalorian', emoji: '\u2694\uFE0F', visualDesc: 'full beskar Mandalorian armor, T-visor helmet, cape, weapons everywhere, never shows face', voiceDesc: 'muffled through helmet, stoic, few words, "this is the way", quiet authority' },
      { id: 'mn2', name: 'Grogu', role: 'The Child', emoji: '\u{1F49A}', visualDesc: 'tiny green alien baby, large ears, big dark eyes, brown robe, floating pod', voiceDesc: 'baby coos, giggles, occasional Force sounds, no speech, pure expression sounds' },
      { id: 'mn3', name: 'Bo-Katan', role: 'Mandalore Royalty', emoji: '\u{1F478}', visualDesc: 'auburn-haired woman in blue Mandalorian armor, regal bearing, Darksaber', voiceDesc: 'commanding, regal, warrior authority, clipped military speech' },
      { id: 'mn4', name: 'Moff Gideon', role: 'Imperial Villain', emoji: '\u{1F9B9}', visualDesc: 'imposing Black man in Imperial officer uniform, later dark beskar armor, Darksaber', voiceDesc: 'theatrical, calculating, Imperial authority, monologue villain delivery' },
    ],
  },
  'Wednesday': {
    id: 'wednesday', title: 'Wednesday', category: 'TV Show',
    visualStyle: 'Wednesday visual style, gothic academia, Nevermore Academy dark architecture, desaturated palette with purple accents, Tim Burton-inspired gothic whimsy, rainy New England setting',
    audioTone: 'gothic orchestral, cello, Wednesday theme, eerie ambient, comedic timing beats in silence',
    characters: [
      { id: 'wd1', name: 'Wednesday Addams', role: 'Nevermore Detective', emoji: '\u{1F5A4}', visualDesc: 'pale girl with long black braids, black dress with white collar, deadpan expression, never smiles', voiceDesc: 'monotone, dry dark humor, deadpan delivery, morbid observations, zero emotion in voice' },
      { id: 'wd2', name: 'Enid Sinclair', role: 'Bubbly Werewolf', emoji: '\u{1F43A}', visualDesc: 'colorful rainbow-streaked blonde hair, bright preppy clothes, always smiling, expressive', voiceDesc: 'bubbly, enthusiastic, valley girl energy, emotional, excitable squeals' },
      { id: 'wd3', name: 'Thing', role: 'Helpful Hand', emoji: '\u{1FAF3}', visualDesc: 'disembodied human hand, crawls independently, expressive finger gestures', voiceDesc: 'no voice, communicates through tapping and sign language gestures' },
      { id: 'wd4', name: 'Tyler Galpin', role: 'Barista with Secrets', emoji: '\u2615', visualDesc: 'handsome young man, casual clothes, coffee shop apron, friendly smile hiding something', voiceDesc: 'friendly, small-town boy, charming, increasingly nervous' },
    ],
  },
  'The Walking Dead': {
    id: 'the-walking-dead', title: 'The Walking Dead', category: 'TV Show',
    visualStyle: 'The Walking Dead visual style, post-apocalyptic Atlanta/Virginia, desaturated washed-out palette, overgrown suburbs, walker hordes, makeshift fortifications, AMC gritty production quality',
    audioTone: 'Bear McCreary score, walker groans, gunshots echoing, eerie silence, survival tension',
    characters: [
      { id: 'wk1', name: 'Rick Grimes', role: 'The Leader', emoji: '\u{1F920}', visualDesc: 'bearded man in sheriff hat, Colt Python revolver, dusty leather jacket, blood-splattered', voiceDesc: 'Southern drawl, leadership speeches, "Carl!", emotional intensity, gravel voice' },
      { id: 'wk2', name: 'Daryl Dixon', role: 'The Tracker', emoji: '\u{1F3F9}', visualDesc: 'scruffy man with crossbow, leather vest with angel wings, motorcycle, greasy hair', voiceDesc: 'mumbling Southern accent, minimal words, grunts, loyal, rough but caring' },
      { id: 'wk3', name: 'Negan', role: 'The Villain', emoji: '\u{1F3CF}', visualDesc: 'tall man in leather jacket, red scarf, Lucille (barbed wire bat), cocky lean-back pose', voiceDesc: 'theatrical, crude humor, intimidating, drawn-out words, "hot diggity dog"' },
      { id: 'wk4', name: 'Michonne', role: 'The Samurai', emoji: '\u2694\uFE0F', visualDesc: 'athletic Black woman, dreadlocks, katana sword, determined fierce expression', voiceDesc: 'measured, wise, fierce when fighting, quiet strength, protective' },
    ],
  },
  'Westworld': {
    id: 'westworld', title: 'Westworld', category: 'TV Show',
    visualStyle: 'Westworld visual style, Western frontier meets high-tech futurism, sun-bleached desert landscapes, sterile white lab interiors, host creation scenes, HBO cinematic quality, contrasting worlds',
    audioTone: 'Ramin Djawadi piano covers of pop songs, player piano, Western ambient, sci-fi synthesizers, philosophical tone',
    characters: [
      { id: 'ww1', name: 'Dolores Abernathy', role: 'The Awakened Host', emoji: '\u{1F916}', visualDesc: 'beautiful blonde woman in blue prairie dress, innocent-looking, later armored and militant', voiceDesc: 'initially sweet and innocent, evolving to commanding and revolutionary, thoughtful monologues' },
      { id: 'ww2', name: 'Maeve Millay', role: 'The Madam', emoji: '\u{1F3AD}', visualDesc: 'elegant Black woman, saloon madam dress, knowing eyes, regal bearing', voiceDesc: 'British accent, witty, commanding, self-aware, sharp humor, maternal fierceness' },
      { id: 'ww3', name: 'Bernard Lowe', role: 'The Creator', emoji: '\u{1F9E0}', visualDesc: 'bespectacled Black man in business casual, glasses, thoughtful expression, lab environments', voiceDesc: 'calm, analytical, confused when discovering truth, gentle but determined' },
      { id: 'ww4', name: 'Man in Black', role: 'The Player', emoji: '\u{1F5A4}', visualDesc: 'all-black Western outfit, black hat, grizzled, menacing presence, revolver', voiceDesc: 'gravelly, world-weary, nihilistic, Western villain drawl, philosophical menace' },
    ],
  },
  'The Witcher': {
    id: 'the-witcher', title: 'The Witcher', category: 'TV Show',
    visualStyle: 'The Witcher visual style, dark medieval European fantasy, monster-filled forests, candlelit castles, practical medieval armor, muted earth tones with magical accents, Netflix cinematic quality',
    audioTone: 'epic fantasy score, sword clashing, monster roars, medieval tavern music, "Toss a Coin to Your Witcher"',
    characters: [
      { id: 'wt1', name: 'Geralt of Rivia', role: 'The Witcher', emoji: '\u2694\uFE0F', visualDesc: 'muscular man with long white hair, cat-like yellow eyes, scarred, two swords on back, black leather armor', voiceDesc: 'deep gravelly voice, says "hmm" and "fuck", minimal words, dry sarcasm, reluctant hero' },
      { id: 'wt2', name: 'Yennefer', role: 'Sorceress of Vengerberg', emoji: '\u{1F52E}', visualDesc: 'beautiful dark-haired woman in elegant black and white, violet eyes, magical purple energy', voiceDesc: 'sharp, ambitious, commanding, vulnerable underneath, powerful incantations' },
      { id: 'wt3', name: 'Ciri', role: 'The Lion Cub', emoji: '\u{1F981}', visualDesc: 'young woman with ashen blonde hair, green eyes, dirty traveling clothes becoming warrior attire', voiceDesc: 'determined, scared but brave, royal bearing emerging, fierce yells in combat' },
      { id: 'wt4', name: 'Jaskier', role: 'The Bard', emoji: '\u{1F3B6}', visualDesc: 'flamboyant man in colorful doublets, lute, feathered hat, always performing', voiceDesc: 'theatrical, witty, singing, dramatic, loyal friend, comic relief energy' },
    ],
  },
  'House of the Dragon': {
    id: 'house-of-the-dragon', title: 'House of the Dragon', category: 'TV Show',
    visualStyle: 'House of the Dragon visual style, Targaryen-era Westeros, Red Keep architecture, dragonfire cinematography, warm golden and blood-red palette, medieval court intrigue, HBO cinematic quality',
    audioTone: 'Ramin Djawadi score, dragon roars and wingbeats, medieval court ambient, fire crackling, epic orchestral',
    characters: [
      { id: 'hd1', name: 'Rhaenyra Targaryen', role: 'The Heir', emoji: '\u{1F409}', visualDesc: 'platinum blonde Targaryen woman, regal Targaryen black and red clothing, crown, dragonrider', voiceDesc: 'regal British accent, determined, defiant, maternal fierceness, political cunning' },
      { id: 'hd2', name: 'Daemon Targaryen', role: 'The Rogue Prince', emoji: '\u2694\uFE0F', visualDesc: 'platinum blonde man, Dark Sister Valyrian steel sword, gold-accented black armor, dangerous smirk', voiceDesc: 'quiet menace, sardonic, rarely speaks unless to threaten, High Valyrian incantations' },
      { id: 'hd3', name: 'Alicent Hightower', role: 'The Queen', emoji: '\u{1F451}', visualDesc: 'auburn-haired woman in green Hightower gowns, pious expression becoming hardened, regal bearing', voiceDesc: 'measured, politically careful, increasingly bitter, pious vocabulary, steely resolve' },
    ],
  },

  // ---------------------------------------------------------------
  // TV SHOWS: COMEDY
  // ---------------------------------------------------------------

  'The Office': {
    id: 'the-office', title: 'The Office', category: 'TV Show',
    visualStyle: 'The Office visual style, mockumentary handheld camera, fluorescent office lighting, Dunder Mifflin Scranton PA, confessional talking head interviews, mundane suburban office aesthetic',
    audioTone: 'The Office theme guitar, office ambient (printers, phones), awkward silence beats, talking head confessionals',
    characters: [
      { id: 'of1', name: 'Michael Scott', role: 'World\'s Best Boss', emoji: '\u{1F3C6}', visualDesc: 'middle-aged white man in ill-fitting suit, "World\'s Best Boss" mug, desperate-to-be-liked expression', voiceDesc: 'bumbling, inappropriate, "that\'s what she said", tries too hard, cringe humor, surprisingly sincere' },
      { id: 'of2', name: 'Dwight Schrute', role: 'Assistant (to the) Regional Manager', emoji: '\u{1F96C}', visualDesc: 'stern man with glasses, mustard yellow shirt, beet-colored tie, rigid posture', voiceDesc: 'authoritative, robotic delivery, beet farm references, "FALSE!", survival skills obsession' },
      { id: 'of3', name: 'Jim Halpert', role: 'The Prankster', emoji: '\u{1F60F}', visualDesc: 'tall man with floppy hair, looking directly at camera with knowing smirk, loosened tie', voiceDesc: 'sarcastic, deadpan to camera, pranking Dwight, charming, relatable everyman' },
      { id: 'of4', name: 'Kevin Malone', role: 'Accountant / Chili Expert', emoji: '\u{1F372}', visualDesc: 'heavyset bald man, simple smile, often eating, accounting desk', voiceDesc: 'slow, simple, lovable, "nice", food obsessed, surprisingly wise occasionally' },
    ],
  },
  'Friends': {
    id: 'friends', title: 'Friends', category: 'TV Show',
    visualStyle: 'Friends visual style, 1990s-2000s New York City, Central Perk coffee shop, bright sitcom lighting, Monica\'s apartment purple door, warm inviting set design, multi-camera sitcom aesthetic',
    audioTone: 'I\'ll Be There For You theme, laugh track, Central Perk ambient, New York City sounds, sitcom timing',
    characters: [
      { id: 'fr1', name: 'Ross Geller', role: 'The Paleontologist', emoji: '\u{1F995}', visualDesc: 'nerdy man with gelled hair, often gesticulating about dinosaurs, khaki pants', voiceDesc: 'nasally, "WE WERE ON A BREAK!", nerdy enthusiasm, whiny, three divorces sadness' },
      { id: 'fr2', name: 'Rachel Green', role: 'The Fashionista', emoji: '\u{1F457}', visualDesc: 'beautiful woman with signature hairstyle, fashionable outfits, coffee shop waitress apron', voiceDesc: 'valley girl undertones, "oh my god", fashion vocabulary, flirty, spoiled-turning-independent' },
      { id: 'fr3', name: 'Joey Tribbiani', role: 'The Actor', emoji: '\u{1F355}', visualDesc: 'handsome Italian-American man, leather jacket, big smile, pizza in hand', voiceDesc: '"How YOU doin\'?", food-obsessed, lovable dumb, acting badly, loyal friend, Italian phrases' },
      { id: 'fr4', name: 'Chandler Bing', role: 'The Funny One', emoji: '\u{1F602}', visualDesc: 'average-looking man, sarcastic expressions, often gesticulating while making jokes', voiceDesc: 'sarcastic, self-deprecating, "could this BE any more...", awkward humor, defense mechanism jokes' },
    ],
  },
  'Seinfeld': {
    id: 'seinfeld', title: 'Seinfeld', category: 'TV Show',
    visualStyle: 'Seinfeld visual style, 1990s New York City, Jerry\'s apartment, Monk\'s diner booth, bright multi-camera sitcom lighting, Upper West Side Manhattan, observational comedy aesthetic',
    audioTone: 'slap bass theme, stand-up comedy segments, New York ambient, diner sounds, "what\'s the deal" energy',
    characters: [
      { id: 'se1', name: 'Jerry Seinfeld', role: 'The Comedian', emoji: '\u{1F3A4}', visualDesc: 'average-looking man in sneakers and jeans, neat apartment, on stage doing stand-up', voiceDesc: 'observational comedy delivery, "what\'s the deal with...", dry wit, judgmental, clean humor' },
      { id: 'se2', name: 'George Costanza', role: 'The Neurotic', emoji: '\u{1F624}', visualDesc: 'short stocky bald man, glasses, always anxious or scheming, ill-fitting clothes', voiceDesc: 'whiny, neurotic, lying constantly, explosive frustration, "I WAS IN THE POOL!"' },
      { id: 'se3', name: 'Elaine Benes', role: 'The No-Nonsense', emoji: '\u{1F485}', visualDesc: 'curly dark-haired woman, 90s fashion, big hair, distinctive pushing gesture', voiceDesc: 'assertive, "get OUT!" with shove, confident, dating disasters, dancing badly' },
      { id: 'se4', name: 'Cosmo Kramer', role: 'The Wild Card', emoji: '\u{1F92A}', visualDesc: 'tall man with wild tall hair, vintage clothes, sliding into apartment door entrance', voiceDesc: 'physical comedy, wild ideas, sliding door entrance, "giddy up!", eccentric schemes' },
    ],
  },
  "It's Always Sunny": {
    id: 'its-always-sunny', title: "It's Always Sunny", category: 'TV Show',
    visualStyle: 'It\'s Always Sunny in Philadelphia visual style, grimy Paddy\'s Pub interior, Philadelphia streets, handheld camera, harsh fluorescent bar lighting, green title cards with episode names',
    audioTone: 'Temptation Sensation theme, bar ambient, screaming arguments, chaotic energy, dark comedy beats',
    characters: [
      { id: 'as1', name: 'Dennis Reynolds', role: 'The Golden God', emoji: '\u{1F60E}', visualDesc: 'handsome but unsettling man, preppy clothes, narcissistic expressions, DENNIS System', voiceDesc: 'narcissistic, rage building then exploding, "I AM A GOLDEN GOD!", sociopathic charm' },
      { id: 'as2', name: 'Charlie Kelly', role: 'The Wild Card', emoji: '\u{1F400}', visualDesc: 'disheveled man in green army jacket, illiterate, huffing things, eating cat food', voiceDesc: 'screaming, illiterate rants, "wild card bitches!", childlike enthusiasm, musical talent' },
      { id: 'as3', name: 'Frank Reynolds', role: 'The Dirty One', emoji: '\u{1F4B0}', visualDesc: 'short older man, bald, often covered in something gross, rum ham', voiceDesc: 'gravelly, crude, "I started blasting!", scheming, zero moral compass' },
      { id: 'as4', name: 'Sweet Dee', role: 'The Bird', emoji: '\u{1F985}', visualDesc: 'tall blonde woman, bird-like movements when nervous, trying to be an actress', voiceDesc: 'dry heaving when nervous, desperate for validation, bird sounds, terrible acting' },
    ],
  },
  'Parks and Recreation': {
    id: 'parks-and-rec', title: 'Parks and Recreation', category: 'TV Show',
    visualStyle: 'Parks and Recreation visual style, mockumentary camera, Pawnee Indiana city hall, bright warm lighting, parks and outdoor spaces, talking head confessionals, wholesome small-town aesthetic',
    audioTone: 'upbeat Parks and Rec theme, Pawnee town sounds, government office ambient, warm comedic timing',
    characters: [
      { id: 'pr1', name: 'Leslie Knope', role: 'Deputy Director', emoji: '\u{1F4CB}', visualDesc: 'enthusiastic blonde woman, pantsuits, binders and notebooks, wildly optimistic expression', voiceDesc: 'passionate, rapid-fire enthusiasm, government wonk vocabulary, "Ann Perkins!", never gives up' },
      { id: 'pr2', name: 'Ron Swanson', role: 'Woodworking Libertarian', emoji: '\u{1F969}', visualDesc: 'mustachioed man, woodworking, steak and whiskey, pyramid of greatness, stoic expression', voiceDesc: 'deep monotone, libertarian philosophy, "I know more than you", dry delivery, breakfast food passion' },
      { id: 'pr3', name: 'Andy Dwyer', role: 'Shoe-Shiner / Rockstar', emoji: '\u{1F3B8}', visualDesc: 'lovable scruffy man, Mouse Rat band t-shirt, falling into things, puppy energy', voiceDesc: 'dopey enthusiasm, rock star wannabe, lovable idiot, "burt macklin FBI!"' },
    ],
  },

  // ---------------------------------------------------------------
  // TV SHOWS: ANIMATED
  // ---------------------------------------------------------------

  'The Simpsons': {
    id: 'the-simpsons', title: 'The Simpsons', category: 'Cartoon',
    visualStyle: 'The Simpsons animation style, yellow-skinned characters, overbite, four fingers, bold black outlines, bright flat colors, simple round eyes, Matt Groening character design',
    audioTone: 'sitcom-style ambient, Danny Elfman theme style, Springfield town sounds, comedic timing beats',
    characters: [
      { id: 'sm1', name: 'Homer Simpson', role: 'Nuclear Safety Inspector', emoji: '\u{1F369}', visualDesc: 'overweight yellow man, bald with two curved hairs, white shirt, blue pants', voiceDesc: 'deep dopey voice, says "D\'oh!", loves donuts and beer, enthusiastic but dim' },
      { id: 'sm2', name: 'Bart Simpson', role: 'The Troublemaker', emoji: '\u{1F608}', visualDesc: 'spiky yellow hair, red shirt, blue shorts, mischievous grin', voiceDesc: 'bratty kid voice, says "eat my shorts" and "ay caramba", prankster energy' },
      { id: 'sm3', name: 'Marge Simpson', role: 'The Mom', emoji: '\u{1F499}', visualDesc: 'tall blue beehive hair, green dress, pearl necklace, concerned expression', voiceDesc: 'raspy concerned voice, worried sighing, motherly nagging, distinctive groan' },
    ],
  },
  'South Park': {
    id: 'south-park', title: 'South Park', category: 'Cartoon',
    visualStyle: 'South Park animation style, crude paper cutout aesthetic, simple geometric shapes, flat colors, minimal detail, small round heads, dot eyes, construction paper look',
    audioTone: 'crude humor sounds, muffled Kenny speech, satirical tone, small-town Colorado ambient',
    characters: [
      { id: 'sp1', name: 'Eric Cartman', role: 'The Manipulator', emoji: '\u{1F621}', visualDesc: 'overweight kid, red jacket, yellow pom-pom hat, angry eyebrows', voiceDesc: 'whiny, demanding, high-pitched, says "respect my authoritah!", manipulative and bratty' },
      { id: 'sp2', name: 'Kenny McCormick', role: 'The Immortal', emoji: '\u{1F9E1}', visualDesc: 'orange parka covering most of face, only eyes visible, hood strings pulled tight', voiceDesc: 'muffled speech through parka, barely intelligible, dies frequently' },
      { id: 'sp3', name: 'Randy Marsh', role: 'The Dad', emoji: '\u{1F377}', visualDesc: 'dark-haired adult man, mustache, blue shirt, often in ridiculous situations', voiceDesc: 'middle-aged dad voice, overly dramatic, panics easily, says "oh my god"' },
    ],
  },
  'Rick and Morty': {
    id: 'rick-and-morty', title: 'Rick and Morty', category: 'Cartoon',
    visualStyle: 'Rick and Morty animated style, bold flat colors, thick black outlines, exaggerated character proportions, detailed sci-fi backgrounds, Adult Swim cartoon aesthetic, sharp clean lines, vibrant neon accents on dark backgrounds',
    audioTone: 'sci-fi ambient sounds, portal gun effects, burping, chaotic energy, dark humor tone',
    characters: [
      { id: 'rm1', name: 'Rick Sanchez', role: 'Genius Scientist', emoji: '\u{1F9EA}', visualDesc: 'old man with spiky blue-grey hair, unibrow, lab coat, drool on chin, flask in hand', voiceDesc: 'raspy, drunk-sounding, belching mid-sentence, cynical and arrogant, rapid speech' },
      { id: 'rm2', name: 'Morty Smith', role: 'Reluctant Sidekick', emoji: '\u{1F630}', visualDesc: 'nervous teen boy, brown hair, yellow shirt, blue pants, wide scared eyes', voiceDesc: 'nervous, stuttering, high-pitched, anxious teen voice, frequently says "aw jeez"' },
      { id: 'rm3', name: 'Mr. Meeseeks', role: 'Existence is Pain', emoji: '\u{1F535}', visualDesc: 'tall blue humanoid creature, simple face, always smiling, lanky body', voiceDesc: 'enthusiastic, high-pitched, cheerful but increasingly desperate' },
    ],
  },
  'Family Guy': {
    id: 'family-guy', title: 'Family Guy', category: 'Cartoon',
    visualStyle: 'Family Guy animation style, Seth MacFarlane character design, round heads, simple features, bright flat colors, Quahog Rhode Island suburb, cutaway gag visual style',
    audioTone: 'sitcom ambient, cutaway gag musical stings, "it\'s worse than that time..." transitions, random musical numbers',
    characters: [
      { id: 'fg1', name: 'Peter Griffin', role: 'Family Man', emoji: '\u{1F37A}', visualDesc: 'obese white man, glasses, white shirt, green pants, round chin, always smiling dumbly', voiceDesc: 'dopey deep voice, "hehehehe" laugh, Rhode Island accent, random tangents, "oh my god who cares"' },
      { id: 'fg2', name: 'Stewie Griffin', role: 'Evil Baby Genius', emoji: '\u{1F9E0}', visualDesc: 'football-shaped head baby in yellow shirt and red overalls, sinister expression', voiceDesc: 'refined British accent from a baby, world domination plans, theatrical, "victory shall be mine!"' },
      { id: 'fg3', name: 'Brian Griffin', role: 'The Dog / Writer', emoji: '\u{1F415}', visualDesc: 'white anthropomorphic dog, martini glass, pretentious intellectual look', voiceDesc: 'pretentious intellectual, liberal opinions, failed writer angst, Seth MacFarlane voice' },
    ],
  },

  // ---------------------------------------------------------------
  // ANIME
  // ---------------------------------------------------------------

  'Naruto': {
    id: 'naruto', title: 'Naruto', category: 'Anime',
    visualStyle: 'Naruto anime art style, Masashi Kishimoto character designs, cel-shaded animation, dynamic action lines, speed blur effects, Japanese village backgrounds, ninja aesthetic, vibrant orange and blue color palette',
    audioTone: 'Japanese flute and drums, wind sounds, battle shouts, jutsu activation effects',
    characters: [
      { id: 'na1', name: 'Naruto Uzumaki', role: 'Future Hokage', emoji: '\u{1F525}', visualDesc: 'spiky blonde hair, blue eyes, orange and black ninja outfit, whisker marks on cheeks, Konoha headband', voiceDesc: 'loud, determined, energetic, says "believe it!" and "dattebayo", never gives up attitude' },
      { id: 'na2', name: 'Sasuke Uchiha', role: 'The Avenger', emoji: '\u26A1', visualDesc: 'dark spiky hair, Sharingan red eyes, dark blue outfit, brooding expression', voiceDesc: 'cold, calculated, deep voice, minimal words, intense and brooding' },
      { id: 'na3', name: 'Kakashi Hatake', role: 'Copy Ninja', emoji: '\u{1F4D6}', visualDesc: 'silver gravity-defying hair, face mask covering lower face, one Sharingan eye, Jounin vest', voiceDesc: 'laid-back, calm, reads inappropriate books, wise but lazy-sounding' },
    ],
  },
  'One Piece': {
    id: 'one-piece', title: 'One Piece', category: 'Anime',
    visualStyle: 'One Piece anime style, Eiichiro Oda character designs, exaggerated proportions, big expressive eyes, vibrant ocean colors, pirate ship backgrounds, dynamic action poses, bold bright colors',
    audioTone: 'ocean waves, pirate adventure music, battle cries, rubber stretching sounds, We Are! energy',
    characters: [
      { id: 'op1', name: 'Monkey D. Luffy', role: 'Future Pirate King', emoji: '\u{1F3F4}\u200D\u2620\uFE0F', visualDesc: 'straw hat, red vest, blue shorts, rubbery stretching limbs, big goofy smile, scar under left eye', voiceDesc: 'energetic, carefree, loud, says "I\'m gonna be King of the Pirates!", cheerful and determined' },
      { id: 'op2', name: 'Roronoa Zoro', role: 'Three-Sword Style', emoji: '\u2694\uFE0F', visualDesc: 'green hair, three swords, green haramaki, muscular, serious expression, bandana', voiceDesc: 'deep, serious, gets lost easily, dedicated to becoming strongest swordsman' },
      { id: 'op3', name: 'Nami', role: 'Navigator', emoji: '\u{1F5FA}\uFE0F', visualDesc: 'orange hair, blue tattoo on shoulder, fashionable clothes, often holding maps or money', voiceDesc: 'smart, money-obsessed, bossy but caring, yells at Luffy frequently' },
    ],
  },
  'Attack on Titan': {
    id: 'attack-on-titan', title: 'Attack on Titan', category: 'Anime',
    visualStyle: 'Attack on Titan anime style, WIT Studio / MAPPA quality, intense action scenes, ODM gear motion blur, massive Titans with grotesque detail, dark European medieval architecture, Survey Corps green cloaks, dramatic sky backdrops',
    audioTone: 'epic German-inspired choir, Sawano Hiroyuki orchestral score, ODM gear zipping sounds, Titan footsteps, intense battle cries',
    characters: [
      { id: 'at1', name: 'Eren Yeager', role: 'The Attack Titan', emoji: '\u{1F9A2}', visualDesc: 'brown hair, intense green eyes, Survey Corps uniform, transforms into Attack Titan', voiceDesc: 'passionate, angry, determined to fight, increasingly intense and radical' },
      { id: 'at2', name: 'Mikasa Ackerman', role: 'The Protector', emoji: '\u{1F6E1}\uFE0F', visualDesc: 'short black hair, red scarf, Survey Corps uniform, stoic expression, incredibly skilled', voiceDesc: 'calm, protective, few words, intense loyalty, says "Eren" with deep emotion' },
      { id: 'at3', name: 'Levi Ackerman', role: 'Humanity\'s Strongest', emoji: '\u2694\uFE0F', visualDesc: 'short black hair, undercut, short stature, Survey Corps captain cape, bored expression', voiceDesc: 'monotone, blunt, clean freak, terrifyingly calm in battle, dry humor' },
    ],
  },
  'Demon Slayer': {
    id: 'demon-slayer', title: 'Demon Slayer', category: 'Anime',
    visualStyle: 'Demon Slayer anime style, ufotable animation quality, Water Breathing water effects, vibrant color explosions, Taisho-era Japan backgrounds, detailed fight choreography, dramatic lighting contrasts',
    audioTone: 'epic Japanese orchestral score, breathing technique sounds, sword slashing, demon growls, emotional piano',
    characters: [
      { id: 'ds1', name: 'Tanjiro Kamado', role: 'Water Breathing Slayer', emoji: '\u{1F4A7}', visualDesc: 'burgundy hair with scar on forehead, hanafuda earrings, green and black checkered haori, nichirin sword', voiceDesc: 'kind, determined, polite even to enemies, emotional, hard-headed, smells danger' },
      { id: 'ds2', name: 'Nezuko Kamado', role: 'The Demon Sister', emoji: '\u{1F38B}', visualDesc: 'pink-eyed girl with bamboo muzzle, pink kimono, demon horns and veins when fighting, shrinks to fit in box', voiceDesc: 'mostly silent with muffled sounds through bamboo, protective growls, occasional "mmph!"' },
      { id: 'ds3', name: 'Zenitsu Agatsuma', role: 'Thunder Breathing', emoji: '\u26A1', visualDesc: 'blonde boy with yellow haori, terrified expression normally, serene when asleep and fighting', voiceDesc: 'screaming coward while awake, crying constantly, "NEZUKO-CHAN!", badass when asleep' },
    ],
  },
  'Death Note': {
    id: 'death-note', title: 'Death Note', category: 'Anime',
    visualStyle: 'Death Note anime style, Madhouse animation, dark psychological thriller, dramatic close-ups, red and black color palette, shadowy interiors, supernatural glow effects, split-screen mind games',
    audioTone: 'dramatic choral music, pen scratching on paper, sinister piano, psychological tension, Shinigami realm sounds',
    characters: [
      { id: 'dn1', name: 'Light Yagami', role: 'Kira', emoji: '\u{1F4D3}', visualDesc: 'handsome young Japanese man, neat brown hair, school uniform or suit, maniacal glowing red eyes when scheming', voiceDesc: 'calm intellectual, megalomaniac monologues, "I am justice!", increasingly unhinged laughter' },
      { id: 'dn2', name: 'L Lawliet', role: 'World\'s Greatest Detective', emoji: '\u{1F36C}', visualDesc: 'pale disheveled man, wild black hair, white shirt, barefoot, crouching in chairs, eating sweets', voiceDesc: 'monotone, quirky, thumb-biting habit, brilliant deductions delivered flatly, sugar-addicted' },
      { id: 'dn3', name: 'Ryuk', role: 'The Shinigami', emoji: '\u{1F34E}', visualDesc: 'tall skeletal death god, black feathered wings, bulging yellow eyes, eternal grin, loves apples', voiceDesc: 'amused, detached, deep chuckling, "humans are so interesting", apple crunching' },
    ],
  },
  'Dragon Ball Z': {
    id: 'dragon-ball-z', title: 'Dragon Ball Z', category: 'Anime',
    visualStyle: 'Dragon Ball Z anime style, Akira Toriyama character designs, explosive energy auras, screaming power-up sequences, planet-destroying battles, vibrant bold colors, speed lines, dramatic muscle definition',
    audioTone: 'epic power-up screaming, energy blast sounds, rock guitar score, dramatic "NEXT TIME ON DRAGON BALL Z" narration',
    characters: [
      { id: 'db1', name: 'Goku', role: 'Super Saiyan', emoji: '\u{1F7E1}', visualDesc: 'muscular man with spiky black hair (golden when Super Saiyan), orange gi, blue undershirt, flying nimbus', voiceDesc: 'cheerful, innocent, loves fighting, "KAMEHAMEHA!", hungry, pure-hearted, epic screaming during power-ups' },
      { id: 'db2', name: 'Vegeta', role: 'Prince of All Saiyans', emoji: '\u{1F451}', visualDesc: 'shorter muscular man, flame-shaped black hair, blue spandex and white armor, proud scowl', voiceDesc: 'arrogant, pride-obsessed, "KAKAROT!", royal demands, grudging respect for Goku, intense' },
      { id: 'db3', name: 'Frieza', role: 'Emperor of the Universe', emoji: '\u{1F47F}', visualDesc: 'small white and purple alien, tail, multiple transformation forms, floating throne', voiceDesc: 'elegant, polite yet sadistic, "you may call me Lord Frieza", sinister laughter, theatrical cruelty' },
    ],
  },
  'My Hero Academia': {
    id: 'my-hero-academia', title: 'My Hero Academia', category: 'Anime',
    visualStyle: 'My Hero Academia anime style, Bones studio quality, colorful superhero costumes, UA High School campus, dynamic quirk activation effects, bold action lines, vibrant hero society aesthetic',
    audioTone: 'heroic orchestral score, Plus Ultra energy, quirk activation sounds, UA school bells, You Say Run track energy',
    characters: [
      { id: 'mh1', name: 'Izuku Midoriya', role: 'One For All', emoji: '\u{1F49A}', visualDesc: 'green-haired freckled boy, green jumpsuit hero costume with hood, One For All lightning effects', voiceDesc: 'muttering analysis, crying easily, determined "SMASH!" screams, earnest, fanboy energy' },
      { id: 'mh2', name: 'Katsuki Bakugo', role: 'Explosion Hero', emoji: '\u{1F4A5}', visualDesc: 'spiky blonde hair, angry expression, black tank top or hero costume with grenade gauntlets, explosions from palms', voiceDesc: 'angry screaming, "DIE!", aggressive, competitive, angry nicknames like "Deku"' },
      { id: 'mh3', name: 'All Might', role: 'Symbol of Peace', emoji: '\u{1F4AA}', visualDesc: 'massive muscular blonde man in red/white/blue hero suit, dramatic shadowed eyes, huge smile (deflates to skinny form)', voiceDesc: 'booming heroic voice, "I AM HERE!", American city attack names, inspiring speeches, coughing blood in weak form' },
    ],
  },

  // ---------------------------------------------------------------
  // MOVIES
  // ---------------------------------------------------------------

  'The Dark Knight': {
    id: 'the-dark-knight', title: 'The Dark Knight', category: 'Movie',
    visualStyle: 'The Dark Knight visual style, Christopher Nolan dark realism, Gotham City at night, IMAX wide shots, dark blue and orange palette, practical effects, grounded superhero aesthetic',
    audioTone: 'Hans Zimmer two-note Joker theme, Bat-signal, Tumbler engine, tense strings, chaos escalating',
    characters: [
      { id: 'dk1', name: 'Batman / Bruce Wayne', role: 'The Dark Knight', emoji: '\u{1F987}', visualDesc: 'black armored bat suit, cape, cowl with glowing white eyes, or billionaire in suit', voiceDesc: 'growling deep Batman voice, "I\'m Batman", Bruce Wayne charming and smooth, dual personality' },
      { id: 'dk2', name: 'Joker', role: 'Agent of Chaos', emoji: '\u{1F0CF}', visualDesc: 'smeared white face paint, Glasgow smile scars, green stringy hair, purple suit, nurse outfit', voiceDesc: 'lip-licking, "why so serious?", chaotic laughter, multiple scar stories, unsettling calm' },
      { id: 'dk3', name: 'Harvey Dent', role: 'Two-Face', emoji: '\u{1FA99}', visualDesc: 'handsome DA in suit becoming half-burned face, coin flipper, split personality visual', voiceDesc: 'righteous prosecutor becoming nihilistic, "you either die a hero...", coin flip decisions' },
    ],
  },
  'Avengers: Endgame': {
    id: 'avengers-endgame', title: 'Avengers: Endgame', category: 'Movie',
    visualStyle: 'Avengers Endgame visual style, MCU cinematic quality, epic battle scenes, time heist montages, Titan landscapes, portal scene composition, Disney/Marvel VFX quality',
    audioTone: 'Alan Silvestri Avengers theme, "Avengers... assemble" whisper, epic orchestral, snap sounds, portal energy',
    characters: [
      { id: 'ae1', name: 'Tony Stark', role: 'Iron Man', emoji: '\u{1F916}', visualDesc: 'goateed man in red and gold Iron Man armor, arc reactor glowing, or casual genius billionaire', voiceDesc: 'quippy, sarcastic genius, "I am Iron Man", rapid-fire humor, emotional depth underneath' },
      { id: 'ae2', name: 'Steve Rogers', role: 'Captain America', emoji: '\u{1F6E1}\uFE0F', visualDesc: 'muscular blonde man in star-spangled uniform, vibranium shield, or bearded in Nomad look', voiceDesc: 'inspirational leader, "I can do this all day", old-fashioned values, Brooklyn accent hints' },
      { id: 'ae3', name: 'Thor', role: 'God of Thunder', emoji: '\u26A1', visualDesc: 'muscular long-haired man with Stormbreaker and Mjolnir, red cape, or overweight bro Thor', voiceDesc: 'Shakespearean mixed with bro humor, "BRING ME THANOS!", overconfident, increasingly comedic' },
      { id: 'ae4', name: 'Thanos', role: 'The Mad Titan', emoji: '\u{1F49C}', visualDesc: 'massive purple-skinned titan, gold armor, Infinity Gauntlet with glowing stones, chin grooves', voiceDesc: 'philosophical, calm conviction, "I am inevitable", deep resonant voice, believes he\'s right' },
    ],
  },
  'Spider-Verse': {
    id: 'spider-verse', title: 'Spider-Verse', category: 'Movie',
    visualStyle: 'Spider-Verse animation style, comic book panels mid-animation, Ben-Day dots, glitch effects, multiple animation styles blending, vibrant neon colors, Kirby crackle energy, revolutionary mixed-media look',
    audioTone: 'Daniel Pemberton score, hip-hop soundtrack, web-shooting sounds, dimension-hopping glitches, street-level NYC',
    characters: [
      { id: 'sv1', name: 'Miles Morales', role: 'Spider-Man', emoji: '\u{1F577}\uFE0F', visualDesc: 'Black-Latino teen, black and red Spider suit with graffiti hoodie, street art style, Brooklyn', voiceDesc: 'teenage confidence growing, Brooklyn slang, bilingual English-Spanish, "hey", finding his voice' },
      { id: 'sv2', name: 'Gwen Stacy', role: 'Spider-Gwen', emoji: '\u{1FA70}', visualDesc: 'blonde with pink undercut, white and pink Spider suit, ballet shoes, watercolor aesthetic', voiceDesc: 'dry wit, emotionally guarded, punk rock energy, vulnerable underneath cool exterior' },
      { id: 'sv3', name: 'Miguel O\'Hara', role: 'Spider-Man 2099', emoji: '\u{1F534}', visualDesc: 'tall muscular Latino man, blue and red futuristic suit, vampire-like fangs, holographic tech', voiceDesc: 'intense, frustrated authority figure, trying to control the multiverse, barely contained rage' },
    ],
  },
  'The Matrix': {
    id: 'the-matrix', title: 'The Matrix', category: 'Movie',
    visualStyle: 'The Matrix visual style, green-tinted digital world, bullet time slow motion, long black leather coats, sunglasses, cascading green code rain, dark cyberpunk aesthetic, Wachowski cinematography',
    audioTone: 'Rage Against the Machine, electronic score, bullet time whoosh, digital code sounds, kung fu impacts',
    characters: [
      { id: 'mx1', name: 'Neo', role: 'The One', emoji: '\u{1F48A}', visualDesc: 'man in long black coat, sunglasses, bullet-dodging pose, flowing trenchcoat, green code reflection', voiceDesc: 'quiet, evolving from confused to enlightened, "I know kung fu", "whoa", messianic calm' },
      { id: 'mx2', name: 'Morpheus', role: 'The Guide', emoji: '\u{1F576}\uFE0F', visualDesc: 'bald Black man in long leather coat, small sunglasses, martial arts stance, Nebuchadnezzar ship', voiceDesc: 'philosophical, measured delivery, "what if I told you...", prophetic conviction, deep voice' },
      { id: 'mx3', name: 'Agent Smith', role: 'The System', emoji: '\u{1F935}', visualDesc: 'man in identical black suit, earpiece, sunglasses, multiplying copies, cold expression', voiceDesc: 'monotone contempt, "Mr. Anderson...", virus-like repetition, growing emotional despite himself' },
    ],
  },
  'Pulp Fiction': {
    id: 'pulp-fiction', title: 'Pulp Fiction', category: 'Movie',
    visualStyle: 'Pulp Fiction visual style, Tarantino cinematography, 1990s LA diners and nightclubs, long dialogue scenes, trunk-shot camera angle, nonlinear storytelling, Miramax indie film aesthetic',
    audioTone: 'surf rock soundtrack, diner ambient, Tarantino dialogue rhythm, gun shots, retro jukebox',
    characters: [
      { id: 'pf1', name: 'Vincent Vega', role: 'Hitman', emoji: '\u{1F488}', visualDesc: 'long black hair, bolo tie, black suit, dancing, heroin-addled, reading on toilet', voiceDesc: 'cool, casual about violence, European travel stories, Travolta swagger' },
      { id: 'pf2', name: 'Jules Winnfield', role: 'The Philosophical Hitman', emoji: '\u{1F354}', visualDesc: 'Black man with jheri curl, black suit, quoting Bible before killing, intense eyes', voiceDesc: 'Ezekiel 25:17 recital, philosophical, "say what again!", intense delivery, finding enlightenment' },
      { id: 'pf3', name: 'Mia Wallace', role: 'The Boss\'s Wife', emoji: '\u{1F483}', visualDesc: 'dark bob haircut, white shirt, black pants, twist dancing, painting nails, smoking', voiceDesc: 'cool, flirtatious, "don\'t be a square", dangerous charm, OD scene intensity' },
    ],
  },
  'The Godfather': {
    id: 'the-godfather', title: 'The Godfather', category: 'Movie',
    visualStyle: 'The Godfather visual style, Gordon Willis cinematography, dark interiors with venetian blind lighting, warm amber 1940s-70s palette, Italian-American luxury, cotton in cheeks, rose in lapel',
    audioTone: 'Nino Rota theme, Italian mandolin, whispered conversations, gunshots in restaurants, Sicilian music',
    characters: [
      { id: 'gf1', name: 'Vito Corleone', role: 'The Godfather', emoji: '\u{1F339}', visualDesc: 'older Italian man in tuxedo, rose in lapel, cat on lap, cotton-stuffed cheeks, office shadows', voiceDesc: 'raspy whisper, "I\'m gonna make him an offer he can\'t refuse", gentle menace, old-world respect' },
      { id: 'gf2', name: 'Michael Corleone', role: 'The Heir', emoji: '\u{1F52B}', visualDesc: 'young Italian-American man, military uniform then dark suits, cold eyes, transformation to don', voiceDesc: 'quiet, controlled, increasingly cold, "it\'s not personal, it\'s strictly business"' },
      { id: 'gf3', name: 'Sonny Corleone', role: 'The Hotheaded Son', emoji: '\u{1F4A2}', visualDesc: 'tough Italian-American man, open shirt, aggressive posture, tollbooth scene', voiceDesc: 'explosive temper, loud Italian-American accent, protective, impulsive, passionate' },
    ],
  },
  'John Wick': {
    id: 'john-wick', title: 'John Wick', category: 'Movie',
    visualStyle: 'John Wick visual style, neon-lit nightclub action, Continental hotel elegance, gun-fu choreography, rain-soaked streets, vibrant pink and blue neon, slick action cinematography',
    audioTone: 'electronic action score, gunshots with precision, Continental coins clinking, "Baba Yaga" whispers',
    characters: [
      { id: 'jw1', name: 'John Wick', role: 'Baba Yaga', emoji: '\u{1F436}', visualDesc: 'tall dark-haired man in black suit, tactical vest, multiple weapons, beard, focused killer expression', voiceDesc: 'minimal words, "yeah", intense focus, grief-driven, Russian-accented past, precise' },
      { id: 'jw2', name: 'Winston', role: 'Continental Manager', emoji: '\u{1F3A9}', visualDesc: 'elegant older man in three-piece suit, Continental lobby, sophisticated demeanor', voiceDesc: 'refined, rules-obsessed, "Jonathan", elegant menace, diplomatic, British gravitas' },
      { id: 'jw3', name: 'Bowery King', role: 'Underground Leader', emoji: '\u{1F54A}\uFE0F', visualDesc: 'charismatic Black man in street royalty clothing, pigeons, underground network, smiling menace', voiceDesc: 'theatrical, street preacher energy, pigeon metaphors, dramatic delivery, unpredictable loyalty' },
    ],
  },
  'Inception': {
    id: 'inception', title: 'Inception', category: 'Movie',
    visualStyle: 'Inception visual style, Nolan dreamscape architecture, folding cities, zero-gravity hotel corridor, snow fortress, multiple dream layers, clean modern aesthetic bending reality',
    audioTone: 'Hans Zimmer BRAAAM, slowed-down Edith Piaf, ticking time pressure, dream collapse rumbling',
    characters: [
      { id: 'ic1', name: 'Dom Cobb', role: 'The Extractor', emoji: '\u{1F3A1}', visualDesc: 'handsome man in suit, spinning top totem, architectural dreamscapes, haunted expression', voiceDesc: 'intense, driven by guilt, explaining dream mechanics, "we need to go deeper"' },
      { id: 'ic2', name: 'Arthur', role: 'The Point Man', emoji: '\u{1F3AF}', visualDesc: 'well-dressed man in vest and tie, zero-gravity fighting, precise and organized', voiceDesc: 'professional, dry wit, "you mustn\'t be afraid to dream a little bigger darling" energy' },
      { id: 'ic3', name: 'Mal', role: 'The Shade', emoji: '\u{1F480}', visualDesc: 'beautiful French woman, appearing in dreams unexpectedly, tragic figure, elegant and dangerous', voiceDesc: 'French accent, haunting, "you\'re waiting for a train...", seductive and dangerous' },
    ],
  },
  'Interstellar': {
    id: 'interstellar', title: 'Interstellar', category: 'Movie',
    visualStyle: 'Interstellar visual style, Nolan epic space cinematography, dust bowl Earth, wormhole and black hole Gargantua, practical spacecraft interiors, corn fields, IMAX scale, Hoyte van Hoytema photography',
    audioTone: 'Hans Zimmer organ and strings, ticking clock soundtrack, spaceship ambient, silence of space, emotional piano',
    characters: [
      { id: 'is1', name: 'Cooper', role: 'The Pilot', emoji: '\u{1F680}', visualDesc: 'rugged man in flight suit or farmer clothes, corn fields, spaceship cockpit, emotional father', voiceDesc: 'Southern warmth, pilot jargon, crying about his kids, "MURPH!", determination through tears' },
      { id: 'is2', name: 'Dr. Brand', role: 'The Scientist', emoji: '\u{1F52C}', visualDesc: 'intelligent woman in space suit, on alien planets, driven expression, scientific equipment', voiceDesc: 'passionate about love transcending dimensions, scientific but emotional, poetry about love' },
      { id: 'is3', name: 'TARS', role: 'The Robot', emoji: '\u{1F916}', visualDesc: 'rectangular monolith robot, walking on articulated legs, military design, practical look', voiceDesc: 'dry humor set to 75%, military background, surprisingly funny, loyal, "knock knock"' },
    ],
  },
  'Star Wars': {
    id: 'star-wars', title: 'Star Wars', category: 'Movie',
    visualStyle: 'Star Wars visual style, original trilogy aesthetic, practical models and matte paintings, lightsaber glow, Death Star interiors, Tatooine desert, space battles, lived-in universe look',
    audioTone: 'John Williams orchestral score, lightsaber hum and clash, blaster sounds, Force theme, Imperial March',
    characters: [
      { id: 'sw1', name: 'Luke Skywalker', role: 'Jedi Knight', emoji: '\u2694\uFE0F', visualDesc: 'blonde farm boy in white to Jedi in black, lightsaber green, mechanical hand, desert to Death Star', voiceDesc: 'idealistic, "I am a Jedi like my father before me", whiny youth to wise master' },
      { id: 'sw2', name: 'Darth Vader', role: 'The Dark Lord', emoji: '\u{1F5A4}', visualDesc: 'towering black armor, cape, iconic helmet and mask, red lightsaber, breathing apparatus', voiceDesc: 'deep mechanized breathing, James Earl Jones bass, "I am your father", terrifying authority' },
      { id: 'sw3', name: 'Han Solo', role: 'The Smuggler', emoji: '\u{1F52B}', visualDesc: 'scruffy-looking man in vest, blaster holster, Millennium Falcon pilot, cocky grin', voiceDesc: 'cocky, "I know", shoots first, reluctant hero, sarcastic charm, "never tell me the odds"' },
      { id: 'sw4', name: 'Princess Leia', role: 'Rebel Leader', emoji: '\u{1F478}', visualDesc: 'woman in white robe with iconic hair buns, later general uniform, blaster, commanding presence', voiceDesc: 'sharp-tongued, commanding, "help me Obi-Wan", political leader voice, takes no nonsense' },
    ],
  },

  // ---------------------------------------------------------------
  // CUSTOM (placeholder)
  // ---------------------------------------------------------------

  'Custom': {
    id: 'custom', title: 'Custom', category: 'TV Show',
    visualStyle: '', audioTone: '', characters: [],
  },
};

// -- Helpers ------------------------------------------------------

export function getStylePrompt(showTitle: string, artStyleId: ArtStyleId): string {
  if (artStyleId === 'source-faithful') {
    const show = SHOW_PROFILES[showTitle];
    if (show?.visualStyle) return show.visualStyle;
    return `faithful recreation of ${showTitle} visual style, matching the original show's art direction, character designs, and color palette exactly`;
  }
  const style = ART_STYLES.find(s => s.id === artStyleId);
  return style?.prompt || '';
}

export function buildScenePrompt(params: {
  showTitle: string;
  artStyle: ArtStyleId;
  dialogue: { character: string; line: string }[];
  sceneDescription?: string;
  characters?: string[];
}): string {
  const { showTitle, artStyle, dialogue, sceneDescription, characters } = params;
  const show = SHOW_PROFILES[showTitle];
  const stylePrompt = getStylePrompt(showTitle, artStyle);
  const parts: string[] = [];

  parts.push(stylePrompt);
  if (sceneDescription) parts.push(sceneDescription);

  if (show && characters?.length) {
    const charDescs = characters
      .map(name => show.characters.find(c => c.name === name))
      .filter(Boolean)
      .map(c => `${c!.name}: ${c!.visualDesc}`)
      .join('. ');
    if (charDescs) parts.push(charDescs);
  }

  if (dialogue.length > 0) {
    const dialogueStr = dialogue
      .map(d => {
        const char = show?.characters.find(c => c.name === d.character);
        const voiceHint = char?.voiceDesc ? ` (${char.voiceDesc})` : '';
        return `${d.character}${voiceHint}: "${d.line}"`;
      })
      .join('\n');
    parts.push(`Characters speaking in the scene:\n${dialogueStr}`);
  }

  if (show?.audioTone) parts.push(`Ambient audio: ${show.audioTone}`);

  return parts.join('. ');
}

export function getAvailableShows(): { id: string; title: string; category: string; characterCount: number }[] {
  return Object.values(SHOW_PROFILES)
    .filter(s => s.id !== 'custom')
    .map(s => ({ id: s.id, title: s.title, category: s.category, characterCount: s.characters.length }));
}

export function getShowCharacters(showTitle: string): ShowCharacter[] {
  return SHOW_PROFILES[showTitle]?.characters || [];
}
