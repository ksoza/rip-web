// lib/music-video-genome.ts
// Music Video Director Genome System — director-specific visual DNA for music video treatments
//
// Each MV director has a "genome" of 8 parameters that define their visual language,
// editing rhythm, and approach to translating sound into image.

// ─── VISUAL TYPES ────────────────────────────────────────────────
export const MV_VISUAL_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  hyper_surreal: {
    label: 'Hyper-Surreal',
    description: 'Impossible physics, dream logic, reality bending. The laws of nature are suggestions.',
    examples: 'Michel Gondry, Spike Jonze (early)',
  },
  gritty_documentary: {
    label: 'Gritty Documentary',
    description: 'Real locations, handheld, "found" moments. Authenticity over artifice.',
    examples: 'David Fincher (early), Nabil',
  },
  fashion_tableau: {
    label: 'Fashion Tableau',
    description: 'Static poses, haute couture, model aesthetic. Every frame a magazine spread.',
    examples: 'Hype Williams, Nick Knight',
  },
  narrative_cinema: {
    label: 'Narrative Cinema',
    description: 'Short film structure, character arcs, plot twists. A movie in 4 minutes.',
    examples: 'Joseph Kahn, Anthony Mandler',
  },
  performance_pure: {
    label: 'Performance Pure',
    description: 'Artist as icon, minimal distraction, voice/body focus. Nothing competes.',
    examples: 'Francis Lawrence, Diane Martel',
  },
  tech_experiment: {
    label: 'Tech Experiment',
    description: 'New camera tech, CG integration, format play. The medium IS the message.',
    examples: 'Chris Cunningham, Jonathan Glazer',
  },
  urban_grime: {
    label: 'Urban Grime',
    description: 'Street authenticity, location as character, raw energy. Keep it real.',
    examples: 'Hype Williams, Director X, Cole Bennett',
  },
  intimate_voyeur: {
    label: 'Intimate Voyeur',
    description: 'Close proximity, private moments, emotional rawness. You shouldn\'t be seeing this.',
    examples: 'Sophie Muller, Autumn de Wilde',
  },
};

// ─── EDITING TYPES ───────────────────────────────────────────────
export const MV_EDITING_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  match_cut_rhythm: {
    label: 'Match-Cut Rhythm',
    description: 'Visual rhymes, seamless transitions, flow state. Every cut is a musical note.',
    examples: 'Michel Gondry, Spike Jonze',
  },
  hard_hitting_strobe: {
    label: 'Hard-Hitting Strobe',
    description: 'Fast cuts, black frames, impact on beat. Each cut hits like a drum.',
    examples: 'Hype Williams, Joseph Kahn',
  },
  long_take_breath: {
    label: 'Long Take Breath',
    description: 'Extended shots, real-time performance, patience. Let the moment exist.',
    examples: 'Jonathan Glazer, Nabil',
  },
  montage_accumulation: {
    label: 'Montage Accumulation',
    description: 'Layering images, building meaning through repetition. Each pass adds weight.',
    examples: 'Chris Cunningham, David Fincher',
  },
  lyrical_literal: {
    label: 'Lyrical Literal',
    description: 'Cut to lyric meaning, word-visual association. See what you hear.',
    examples: 'Michel Gondry, OK Go videos',
  },
  disorienting_fracture: {
    label: 'Disorienting Fracture',
    description: 'Non-linear, time jumps, spatial confusion. Where am I? When is this?',
    examples: 'Chris Cunningham, Aphex Twin',
  },
  smooth_continuity: {
    label: 'Smooth Continuity',
    description: 'Invisible cuts, fluid movement, polished. Hollywood in 4 minutes.',
    examples: 'Francis Lawrence, Joseph Kahn',
  },
  tiktok_pacing: {
    label: 'TikTok Pacing',
    description: 'Quick hooks, viral moments, attention-grabbing. Every second earns the next.',
    examples: 'Cole Bennett, modern TikTok era',
  },
};

// ─── ARTIST TYPES ────────────────────────────────────────────────
export const MV_ARTIST_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  artist_as_everyman: {
    label: 'Artist as Everyman',
    description: 'Normal clothes, relatable situations, anti-glamour. Could be anyone.',
    examples: 'Spike Jonze, Beastie Boys',
  },
  artist_as_icon: {
    label: 'Artist as Icon',
    description: 'Larger than life, worshipful framing, superstar glow. A deity in their temple.',
    examples: 'Hype Williams, Beyoncé',
  },
  artist_as_character: {
    label: 'Artist as Character',
    description: 'Acting role, persona shift, fictional identity. The artist disappears into someone.',
    examples: 'Joseph Kahn, Taylor Swift',
  },
  artist_as_observer: {
    label: 'Artist as Observer',
    description: 'Watching the world, detached, contemplative. Present but apart.',
    examples: 'Sophie Muller, Sade',
  },
  artist_as_raw_presence: {
    label: 'Artist as Raw Presence',
    description: 'Unfiltered emotion, vulnerability, no artifice. Just a person feeling something.',
    examples: 'Autumn de Wilde, Florence Welch',
  },
  artist_absent: {
    label: 'Artist Absent',
    description: 'Concept carries the video, performer barely appears. The idea is the star.',
    examples: 'Chris Cunningham, concept-driven videos',
  },
  artist_as_dancer: {
    label: 'Artist as Dancer',
    description: 'Body as instrument, choreography central. Movement speaks louder than words.',
    examples: 'Francis Lawrence, Britney Spears',
  },
  artist_as_rapper: {
    label: 'Artist as Rapper',
    description: 'Lyric delivery, swagger, word-as-image. The flow IS the visual.',
    examples: 'Cole Bennett, Hype Williams',
  },
};

// ─── NARRATIVE TYPES ─────────────────────────────────────────────
export const MV_NARRATIVE_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  literal_lyric: {
    label: 'Literal Lyric',
    description: 'Visualize lyrics exactly, word-for-word. What you hear is what you see.',
    examples: 'Michel Gondry, "Fell in Love with a Girl"',
  },
  emotional_metaphor: {
    label: 'Emotional Metaphor',
    description: 'Capture feeling of song, not plot. Mood over meaning.',
    examples: 'Sophie Muller, "Why Does My Heart Feel So Bad?"',
  },
  conceptual_twist: {
    label: 'Conceptual Twist',
    description: 'One idea pushed to absurd extreme. Simple concept, total commitment.',
    examples: 'Spike Jonze, "Weapon of Choice"',
  },
  mini_movie: {
    label: 'Mini-Movie',
    description: 'Clear three-act story, characters, plot twists. A film in miniature.',
    examples: 'Joseph Kahn, "Thriller" homage',
  },
  performance_narrative: {
    label: 'Performance-Narrative',
    description: 'Singing intercut with story. Dual tracks — performance and plot.',
    examples: 'Anthony Mandler, Rihanna videos',
  },
  abstract_texture: {
    label: 'Abstract Texture',
    description: 'No story, pure visual/sound experience. Synesthesia on screen.',
    examples: 'Chris Cunningham, "Windowlicker"',
  },
  documentary_moment: {
    label: 'Documentary Moment',
    description: 'Real events, captured authenticity. Truth as narrative.',
    examples: 'Nabil, Kanye West "Otis"',
  },
  surreal_journey: {
    label: 'Surreal Journey',
    description: 'Dream logic, symbolic progression. A trip without a map.',
    examples: 'Jonathan Glazer, "Virtual Insanity"',
  },
};

// ─── AESTHETIC TYPES ─────────────────────────────────────────────
export const MV_AESTHETIC_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  cardboard_diy: {
    label: 'Cardboard DIY',
    description: 'Handmade, lo-fi, charmingly cheap. The seams show and that\'s the point.',
    examples: 'Michel Gondry, "Swedish Chef" aesthetic',
  },
  futuristic_minimal: {
    label: 'Futuristic Minimal',
    description: 'Clean lines, white space, tech sheen. Tomorrow, stripped bare.',
    examples: 'Chris Cunningham, "All Is Full of Love"',
  },
  urban_decay: {
    label: 'Urban Decay',
    description: 'Graffiti, industrial, street culture. The city as canvas.',
    examples: 'Hype Williams, 90s hip-hop',
  },
  retro_pastiche: {
    label: 'Retro Pastiche',
    description: 'Specific era recreation, vintage styling. Time travel through art direction.',
    examples: 'Joseph Kahn, "1989" aesthetic',
  },
  natural_elements: {
    label: 'Natural Elements',
    description: 'Water, fire, earth, weather as character. Nature does the acting.',
    examples: 'Sophie Muller, "No Light, No Light"',
  },
  suburban_alienation: {
    label: 'Suburban Alienation',
    description: 'Mundane locations made strange. The familiar turned uncanny.',
    examples: 'Spike Jonze, Fatboy Slim videos',
  },
  high_fashion_surreal: {
    label: 'High Fashion Surreal',
    description: 'Couture, impossible beauty, art direction. Fashion as fever dream.',
    examples: 'Nick Knight, "Born This Way"',
  },
  intimate_domestic: {
    label: 'Intimate Domestic',
    description: 'Bedrooms, kitchens, private spaces. Home as emotional landscape.',
    examples: 'Autumn de Wilde, "Lisbon"',
  },
};

// ─── CAMERA TYPES ────────────────────────────────────────────────
export const MV_CAMERA_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  invisible_observer: {
    label: 'Invisible Observer',
    description: 'Static or smooth, doesn\'t interfere. The camera is a ghost.',
    examples: 'Francis Lawrence, "Bad Romance"',
  },
  kinetic_participant: {
    label: 'Kinetic Participant',
    description: 'Moving with action, immersive, wild. The camera is in the mosh pit.',
    examples: 'Cole Bennett, "Lucid Dreams"',
  },
  mechanical_precision: {
    label: 'Mechanical Precision',
    description: 'Robot arms, exact repeats, technical perfection. Inhuman accuracy.',
    examples: 'Chris Cunningham, "Come to Daddy"',
  },
  handheld_urgency: {
    label: 'Handheld Urgency',
    description: 'Running with, documentary feel, chaos. The cameraman is out of breath.',
    examples: 'Nabil, "Ni**as in Paris"',
  },
  floating_dream: {
    label: 'Floating Dream',
    description: 'Weightless, steadicam, ethereal. The camera levitates.',
    examples: 'Jonathan Glazer, "Karma Police"',
  },
  locked_off_tableau: {
    label: 'Locked-Off Tableau',
    description: 'Camera doesn\'t move, performance within frame. A stage, not a chase.',
    examples: 'Hype Williams, "Upgrade U"',
  },
  subjective_pov: {
    label: 'Subjective POV',
    description: 'Artist\'s eyes, immersive, disorienting. You ARE the performer.',
    examples: 'Spike Jonze, "Being John Malkovich" style',
  },
  dance_choreography: {
    label: 'Dance Choreography',
    description: 'Movement designed for camera, camera and dancer as partners.',
    examples: 'Francis Lawrence, "I\'m a Slave 4 U"',
  },
};

// ─── COLOR TYPES ─────────────────────────────────────────────────
export const MV_COLOR_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  primary_pop: {
    label: 'Primary Pop',
    description: 'Red, yellow, blue — bold, graphic, playful. Lego-block energy.',
    examples: 'Michel Gondry, Lego/childlike',
  },
  monochrome_drama: {
    label: 'Monochrome Drama',
    description: 'One color pushed, extreme stylization. Commitment to a single hue.',
    examples: 'Hype Williams, blue-tinted 90s videos',
  },
  natural_warm: {
    label: 'Natural Warm',
    description: 'Golden hour, skin tones, intimacy. Warmth you can feel.',
    examples: 'Autumn de Wilde, "Solar Power"',
  },
  neon_night: {
    label: 'Neon Night',
    description: 'Magenta, cyan, electric urban. The city at 2am.',
    examples: 'Joseph Kahn, "Teenage Dream"',
  },
  desaturated_earth: {
    label: 'Desaturated Earth',
    description: 'Browns, grays, realism, grit. Beauty stripped of glamour.',
    examples: 'Nabil, "Paranoid"',
  },
  high_contrast_bw: {
    label: 'High Contrast B&W',
    description: 'Black and white, shadows, drama. Classic for a reason.',
    examples: 'David Fincher, "Oh Father"',
  },
  pastel_dream: {
    label: 'Pastel Dream',
    description: 'Soft pinks, lavenders, nostalgia. Everything is gentle.',
    examples: 'Sophie Muller, "Sunday Morning"',
  },
  saturated_hyper: {
    label: 'Saturated Hyper',
    description: 'Colors pushed to breaking point. Reality on steroids.',
    examples: 'Cole Bennett, "Lyrical Lemonade" aesthetic',
  },
};

// ─── SYMBOLIC TYPES ──────────────────────────────────────────────
export const MV_SYMBOLIC_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  childhood_regression: {
    label: 'Childhood Regression',
    description: 'Toys, games, innocence lost. Adulthood through a child\'s lens.',
    examples: 'Michel Gondry, "Deadweight"',
  },
  body_horror: {
    label: 'Body Horror',
    description: 'Physical transformation, uncanny flesh. The body betrays.',
    examples: 'Chris Cunningham, "Rubber Johnny"',
  },
  celebrity_deconstruction: {
    label: 'Celebrity Deconstruction',
    description: 'Fame as prison, persona vs. person. The mask slips.',
    examples: 'Sophie Muller, "Toxic"',
  },
  technology_anxiety: {
    label: 'Technology Anxiety',
    description: 'Machines, screens, alienation. Connected but alone.',
    examples: 'Chris Cunningham, Radiohead videos',
  },
  identity_multiplicity: {
    label: 'Identity Multiplicity',
    description: 'Clones, mirrors, many selves. Who is the real one?',
    examples: 'Joseph Kahn, "Look What You Made Me Do"',
  },
  urban_mythology: {
    label: 'Urban Mythology',
    description: 'Street legends, neighborhood stories. Everyday made epic.',
    examples: 'Hype Williams, "Big Pimpin\'"',
  },
  romantic_obsession: {
    label: 'Romantic Obsession',
    description: 'Love as danger, possession, all-consuming. Desire as gravity.',
    examples: 'Anthony Mandler, "Diamonds"',
  },
  surreal_humor: {
    label: 'Surreal Humor',
    description: 'Absurdity as meaning, joke as depth. Funny because it\'s true.',
    examples: 'Spike Jonze, "Praise You"',
  },
};

// ─── MV DIRECTOR GENOME CONFIG ──────────────────────────────────
export interface MVDirectorGenome {
  visual_type: keyof typeof MV_VISUAL_LIBRARY;
  editing_type: keyof typeof MV_EDITING_LIBRARY;
  artist_type: keyof typeof MV_ARTIST_LIBRARY;
  narrative_type: keyof typeof MV_NARRATIVE_LIBRARY;
  aesthetic_type: keyof typeof MV_AESTHETIC_LIBRARY;
  camera_type: keyof typeof MV_CAMERA_LIBRARY;
  color_type: keyof typeof MV_COLOR_LIBRARY;
  symbolic_type: keyof typeof MV_SYMBOLIC_LIBRARY;
  title_style: string;
  summary_style: string;
  visual_section_style: string;
  choreo_style: string;
  editing_section_style: string;
  palette_description: string;
  moment_description: string;
}

export const MV_DIRECTOR_DATABASE: Record<string, MVDirectorGenome> = {
  'Michel Gondry': {
    visual_type: 'hyper_surreal',
    editing_type: 'match_cut_rhythm',
    artist_type: 'artist_as_everyman',
    narrative_type: 'literal_lyric',
    aesthetic_type: 'cardboard_diy',
    camera_type: 'kinetic_participant',
    color_type: 'primary_pop',
    symbolic_type: 'childhood_regression',
    title_style: 'Playful, pun-based, literal description',
    summary_style: 'Start with technique, then emotional result',
    visual_section_style: 'Step-by-step practical effects description',
    choreo_style: 'Movement as puzzle solving, in-camera tricks',
    editing_section_style: 'Match points, visual rhymes, seamless joins',
    palette_description: 'Bright primaries, handmade textures, tangible materials',
    moment_description: 'The impossible made charming through craft',
  },
  'Hype Williams': {
    visual_type: 'fashion_tableau',
    editing_type: 'hard_hitting_strobe',
    artist_type: 'artist_as_icon',
    narrative_type: 'performance_narrative',
    aesthetic_type: 'urban_decay',
    camera_type: 'locked_off_tableau',
    color_type: 'monochrome_drama',
    symbolic_type: 'urban_mythology',
    title_style: 'Bold, single word, iconic',
    summary_style: 'Artist as deity, environment as temple',
    visual_section_style: 'Fisheye lens, fish tank, luxury goods, street cred',
    choreo_style: 'Posed tableaus, minimal movement, maximum presence',
    editing_section_style: 'Cut on impact, flash frames, rhythmic assault',
    palette_description: 'Blue tint, gold accents, high contrast, night eternal',
    moment_description: 'The artist as untouchable icon in their world',
  },
  'Chris Cunningham': {
    visual_type: 'tech_experiment',
    editing_type: 'disorienting_fracture',
    artist_type: 'artist_absent',
    narrative_type: 'abstract_texture',
    aesthetic_type: 'futuristic_minimal',
    camera_type: 'mechanical_precision',
    color_type: 'desaturated_earth',
    symbolic_type: 'body_horror',
    title_style: 'Technical, sterile, slightly unsettling',
    summary_style: 'Technology and flesh merge, beauty and horror collide',
    visual_section_style: 'CG integration, prosthetics, robotic movement',
    choreo_style: 'Uncanny valley, not quite human, precise and wrong',
    editing_section_style: 'Jarring cuts, time manipulation, sensory overload',
    palette_description: 'Steel grays, clinical whites, organic pinks',
    moment_description: 'The moment technology becomes terrifyingly alive',
  },
  'Spike Jonze': {
    visual_type: 'hyper_surreal',
    editing_type: 'match_cut_rhythm',
    artist_type: 'artist_as_everyman',
    narrative_type: 'conceptual_twist',
    aesthetic_type: 'suburban_alienation',
    camera_type: 'subjective_pov',
    color_type: 'natural_warm',
    symbolic_type: 'surreal_humor',
    title_style: 'Casual, conversational, slightly absurd',
    summary_style: 'Normal situation, one weird element, commit fully',
    visual_section_style: 'Location scouting finds the strange in ordinary',
    choreo_style: 'Chaotic, enthusiastic, amateur precision',
    editing_section_style: 'Comedic timing, deadpan holds, sudden chaos',
    palette_description: 'Suburban naturalism, slightly faded, warm but lonely',
    moment_description: 'The absurd made sincere through commitment',
  },
  'Joseph Kahn': {
    visual_type: 'narrative_cinema',
    editing_type: 'smooth_continuity',
    artist_type: 'artist_as_character',
    narrative_type: 'mini_movie',
    aesthetic_type: 'retro_pastiche',
    camera_type: 'invisible_observer',
    color_type: 'neon_night',
    symbolic_type: 'identity_multiplicity',
    title_style: 'Cinematic, genre-evoking, epic scope',
    summary_style: 'Clear genre premise, high production value, plot twists',
    visual_section_style: 'Cinematic references, genre touchstones, set pieces',
    choreo_style: 'Integrated with story, character-driven movement',
    editing_section_style: 'Hollywood continuity, invisible technique',
    palette_description: 'Genre-appropriate, saturated, cinematic grading',
    moment_description: 'The reveal, the twist, the cinematic payoff',
  },
  'Sophie Muller': {
    visual_type: 'intimate_voyeur',
    editing_type: 'long_take_breath',
    artist_type: 'artist_as_observer',
    narrative_type: 'emotional_metaphor',
    aesthetic_type: 'natural_elements',
    camera_type: 'floating_dream',
    color_type: 'pastel_dream',
    symbolic_type: 'romantic_obsession',
    title_style: 'Poetic, evocative, emotional',
    summary_style: 'Feeling over plot, atmosphere over action',
    visual_section_style: 'Natural light, weather, water, fire as emotion',
    choreo_style: 'Movement as emotion, unchoreographed grace',
    editing_section_style: 'Breathing room, held shots, emotional accumulation',
    palette_description: 'Soft, diffused, natural, skin tones prioritized',
    moment_description: 'The vulnerable reveal, the unguarded moment',
  },
  'Cole Bennett': {
    visual_type: 'urban_grime',
    editing_type: 'tiktok_pacing',
    artist_type: 'artist_as_rapper',
    narrative_type: 'mini_movie',
    aesthetic_type: 'high_fashion_surreal',
    camera_type: 'kinetic_participant',
    color_type: 'saturated_hyper',
    symbolic_type: 'urban_mythology',
    title_style: 'Lyrical Lemonade branding, playful, youthful',
    summary_style: 'Animated effects, cartoon logic, rapper as superhero',
    visual_section_style: 'Green screen, 3D animation, candy colors, surreal gags',
    choreo_style: 'Bouncing, energy, cartoon physics applied to human',
    editing_section_style: 'Quick cuts, meme-able moments, visual punchlines',
    palette_description: 'Lyrical Lemonade yellow, oversaturated, candy colors',
    moment_description: 'The visual gag that becomes the thumbnail',
  },
  'Nabil': {
    visual_type: 'gritty_documentary',
    editing_type: 'long_take_breath',
    artist_type: 'artist_as_observer',
    narrative_type: 'documentary_moment',
    aesthetic_type: 'urban_decay',
    camera_type: 'handheld_urgency',
    color_type: 'desaturated_earth',
    symbolic_type: 'celebrity_deconstruction',
    title_style: 'Simple, direct, location-based',
    summary_style: 'Real moment, captured authenticity, artist in real world',
    visual_section_style: 'Available light, real locations, no artifice',
    choreo_style: 'Documented movement, not staged, found choreography',
    editing_section_style: 'Long takes, observational, when to cut is key',
    palette_description: 'Natural, location-specific, no grading, real skin',
    moment_description: 'The unguarded moment, the real reaction',
  },
  'Francis Lawrence': {
    visual_type: 'performance_pure',
    editing_type: 'smooth_continuity',
    artist_type: 'artist_as_dancer',
    narrative_type: 'performance_narrative',
    aesthetic_type: 'futuristic_minimal',
    camera_type: 'dance_choreography',
    color_type: 'monochrome_drama',
    symbolic_type: 'celebrity_deconstruction',
    title_style: 'Bold, iconic, single powerful image',
    summary_style: 'Artist as superhuman, body as spectacle',
    visual_section_style: 'Set design as world, lighting as character',
    choreo_style: 'Camera and dancer as partners, movement designed for lens',
    editing_section_style: 'Show the skill, hold on difficulty, cut on completion',
    palette_description: 'High contrast, dramatic shadows, sculpted light',
    moment_description: 'The impossible physical feat, the iconic image',
  },
  'Autumn de Wilde': {
    visual_type: 'intimate_voyeur',
    editing_type: 'long_take_breath',
    artist_type: 'artist_as_raw_presence',
    narrative_type: 'emotional_metaphor',
    aesthetic_type: 'intimate_domestic',
    camera_type: 'invisible_observer',
    color_type: 'natural_warm',
    symbolic_type: 'romantic_obsession',
    title_style: 'Literary, art reference, domestic detail',
    summary_style: 'Domestic spaces made strange, intimacy as performance',
    visual_section_style: 'Interior design, costume as character, light through windows',
    choreo_style: 'Movement as relationship, space between people',
    editing_section_style: 'Patient, let moments breathe, emotional beats land',
    palette_description: 'Warm interiors, golden light, vintage textiles',
    moment_description: 'The glance, the touch, the domestic made epic',
  },
};

// ─── HELPER: Build MV directorial genome prompt ─────────────────
export function buildMVDirectorialGenome(directorName: string): string | null {
  const genome = MV_DIRECTOR_DATABASE[directorName];
  if (!genome) return null;

  const visual = MV_VISUAL_LIBRARY[genome.visual_type];
  const editing = MV_EDITING_LIBRARY[genome.editing_type];
  const artist = MV_ARTIST_LIBRARY[genome.artist_type];
  const narrative = MV_NARRATIVE_LIBRARY[genome.narrative_type];
  const aesthetic = MV_AESTHETIC_LIBRARY[genome.aesthetic_type];
  const camera = MV_CAMERA_LIBRARY[genome.camera_type];
  const color = MV_COLOR_LIBRARY[genome.color_type];
  const symbolic = MV_SYMBOLIC_LIBRARY[genome.symbolic_type];

  return `## MUSIC VIDEO DIRECTORIAL GENOME: ${directorName}

### VISUAL VOCABULARY: ${visual?.label || genome.visual_type}
${visual?.description || ''}

### RHYTHM EDITING: ${editing?.label || genome.editing_type}
${editing?.description || ''}

### ARTIST RELATIONSHIP: ${artist?.label || genome.artist_type}
${artist?.description || ''}

### NARRATIVE MODE: ${narrative?.label || genome.narrative_type}
${narrative?.description || ''}

### AESTHETIC WORLD: ${aesthetic?.label || genome.aesthetic_type}
${aesthetic?.description || ''}

### CAMERA CHOREOGRAPHY: ${camera?.label || genome.camera_type}
${camera?.description || ''}

### COLOR EMOTION: ${color?.label || genome.color_type}
${color?.description || ''}

### SYMBOLIC LAYER: ${symbolic?.label || genome.symbolic_type}
${symbolic?.description || ''}

## MV DIRECTORIAL SPECIFICS
- Treatment titles: ${genome.title_style}
- Concept summaries: ${genome.summary_style}
- Visual breakdown: ${genome.visual_section_style}
- Choreography: ${genome.choreo_style}
- Editing rhythm: ${genome.editing_section_style}
- Color palette: ${genome.palette_description}
- Iconic moment: ${genome.moment_description}`;
}

// ─── HELPER: Find MV director by name (fuzzy) ──────────────────
export function findMVDirectorGenome(name: string): string | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();

  // Direct match
  for (const key of Object.keys(MV_DIRECTOR_DATABASE)) {
    if (key.toLowerCase() === lower) return key;
  }

  // Last name match — "gondry" matches "Michel Gondry"
  for (const key of Object.keys(MV_DIRECTOR_DATABASE)) {
    const parts = key.toLowerCase().split(' ');
    const lastName = parts[parts.length - 1];
    if (lastName === lower || lower.includes(lastName)) return key;
  }

  // Partial match
  for (const key of Object.keys(MV_DIRECTOR_DATABASE)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) return key;
  }

  return null;
}

// ─── HELPER: Build full MV writer prompt ────────────────────────
export function buildMVWriterPrompt(
  directorName: string,
  genre: string,
  mood: string,
  artistType: string,
  lyricalTheme: string,
  era?: string,
  visualRefs?: string,
): string {
  const genome = MV_DIRECTOR_DATABASE[directorName];
  if (!genome) {
    return `You are a visionary music video director. Create a treatment for a ${genre} music video about: ${lyricalTheme}`;
  }

  const dirGenome = buildMVDirectorialGenome(directorName)!;

  let prompt = `SYSTEM ROLE: You are a visionary music video director who has apprenticed under ${directorName}. Create a treatment for a music video that captures their signature visual language, editing psychology, and approach to translating sound into image.

${dirGenome}

## SONG SPECIFICATIONS
Genre: ${genre}
Mood: ${mood}
Artist Type: ${artistType}
Lyrical Theme: ${lyricalTheme}`;

  if (era) prompt += `\nCareer Era: ${era}`;
  if (visualRefs) prompt += `\nVisual References: ${visualRefs}`;

  prompt += `

## OUTPUT FORMAT

1. **TREATMENT TITLE** (${genome.title_style})
2. **CONCEPT SUMMARY** (2-3 sentences, ${genome.summary_style})
3. **VISUAL BREAKDOWN** (${genome.visual_section_style})
4. **CHOREOGRAPHY NOTES** (${genome.choreo_style})
5. **EDITING RHYTHM** (${genome.editing_section_style})
6. **COLOR PALETTE** (${genome.palette_description})
7. **ICONIC MOMENT** (${genome.moment_description})

Generate treatment now following ${directorName}'s music video DNA exactly.`;

  return prompt;
}
