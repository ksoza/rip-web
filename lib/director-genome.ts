// lib/director-genome.ts
// Directorial Genome System — director-specific cinematic DNA for movie script/scene generation
//
// Each director has a "genome" of 8 parameters that define their visual, narrative,
// and emotional fingerprint. The script route uses this for movie-type creations.

// ─── VISUAL TYPES ────────────────────────────────────────────────
export const VISUAL_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  operatic_sweep: {
    label: 'Operatic Sweep',
    description: 'Epic wide shots, dramatic skies, painterly compositions. Scale serves emotion.',
    examples: 'Spielberg, Cuarón, Malick',
  },
  claustrophobic_intimacy: {
    label: 'Claustrophobic Intimacy',
    description: 'Tight close-ups, shallow focus, compressed spaces. The frame traps the character.',
    examples: 'Fincher, Aronofsky, Polanski',
  },
  neon_noir: {
    label: 'Neon Noir',
    description: 'High contrast, saturated colors, rain-slicked streets. Style IS substance.',
    examples: 'Villeneuve, Refn, Mann',
  },
  documentary_verite: {
    label: 'Documentary Verité',
    description: 'Handheld, natural light, "found" moments. Reality captured, not constructed.',
    examples: 'Soderbergh, Greengrass, Loach',
  },
  surrealist_dreamscape: {
    label: 'Surrealist Dreamscape',
    description: 'Impossible geography, fluid reality, symbolic imagery. Logic of dreams.',
    examples: 'Lynch, Jodorowsky, Gondry',
  },
  geometric_precision: {
    label: 'Geometric Precision',
    description: 'Symmetry, one-point perspective, architectural framing. Order as aesthetic.',
    examples: 'Wes Anderson, Kubrick, Tarkovsky',
  },
  gritty_textural: {
    label: 'Gritty Textural',
    description: 'Film grain, desaturation, practical messiness. You can feel the world.',
    examples: 'Scorsese, PTA, The Safdies',
  },
  fluid_oner: {
    label: 'Fluid Oner',
    description: 'Seamless long takes, invisible cuts, choreographed movement. Unbroken reality.',
    examples: 'Iñárritu, Cuarón, Mendes',
  },
};

// ─── RHYTHM TYPES ────────────────────────────────────────────────
export const RHYTHM_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  classical_build: {
    label: 'Classical Build',
    description: 'Setup → Rising action → Climax → Resolution. Time-tested three-act satisfaction.',
    examples: 'Spielberg, Zemeckis, Cameron',
  },
  slow_burn_dread: {
    label: 'Slow-Burn Dread',
    description: 'Unease through duration, anticipation over action. The wait is the horror.',
    examples: 'Fincher, Eggers, Tarantino',
  },
  fractured_time: {
    label: 'Fractured Time',
    description: 'Non-linear, looping, time as theme. The structure IS the meaning.',
    examples: 'Nolan, Tarantino, Villeneuve',
  },
  impressionistic_flow: {
    label: 'Impressionistic Flow',
    description: 'Episodic, memory-driven, emotional logic over plot logic.',
    examples: 'Malick, Wong Kar-wai, Gerwig',
  },
  relentless_escalation: {
    label: 'Relentless Escalation',
    description: 'No breathing room, each beat tops the last. Exhaustion as experience.',
    examples: 'The Safdies, Mad Max: Fury Road',
  },
  meditative_stillness: {
    label: 'Meditative Stillness',
    description: 'Long holds, environmental scale, human smallness. Patience rewards.',
    examples: 'Tarkovsky, Malick, Zhao',
  },
};

// ─── THEMATIC TYPES ──────────────────────────────────────────────
export const THEMATIC_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  american_dream_corruption: {
    label: 'American Dream Corruption',
    description: 'Success poisons, capitalism destroys, nostalgia hurts. The dream is the lie.',
    examples: 'Scorsese, PTA, Chazelle',
  },
  identity_fragmentation: {
    label: 'Identity Fragmentation',
    description: 'Who am I? Memory unreliable, self as performance. The mirror lies.',
    examples: 'Nolan, Fincher, Aronofsky, Lynch',
  },
  childhood_wonder_loss: {
    label: 'Childhood Wonder/Loss',
    description: 'Innocence vs. experience, parental failure, play as meaning. Growing up hurts.',
    examples: 'Spielberg, del Toro, Burton',
  },
  violence_masculinity: {
    label: 'Violence & Masculinity',
    description: 'What men do to each other, codes of honor, toxic bonds. Violence as language.',
    examples: 'Tarantino, Scorsese, Mann, Bigelow',
  },
  isolation_connection: {
    label: 'Isolation & Connection',
    description: 'Loneliness in crowds, technology as barrier, love as risk.',
    examples: 'Wong Kar-wai, Gerwig, Baumbach',
  },
  nature_industry: {
    label: 'Nature vs. Industry',
    description: 'Environment as victim, human arrogance, cosmic indifference.',
    examples: 'Malick, Villeneuve, Cameron, Reichardt',
  },
  fate_redemption: {
    label: 'Fate & Redemption',
    description: 'Can we change? Past as prison, sacrifice as salvation.',
    examples: 'The Coens, Nolan, Spielberg',
  },
};

// ─── CHARACTER TYPES ─────────────────────────────────────────────
export const CHARACTER_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  everyman_extraordinary: {
    label: 'Everyman in Extraordinary',
    description: 'Ordinary person, extraordinary situation, moral choice defines them.',
    examples: 'Spielberg, Hitchcock, Zemeckis',
  },
  obsessive_professional: {
    label: 'Obsessive Professional',
    description: 'Expert at cost, work as identity, perfection as disease.',
    examples: 'Fincher, Mann, Nolan, Chazelle',
  },
  romantic_idealist: {
    label: 'Romantic Idealist',
    description: 'Hopeful in cynicism, love as transcendence, earnest without irony.',
    examples: 'Gerwig, Crowe, Linklater',
  },
  toxic_masculine: {
    label: 'Toxic Masculine',
    description: 'Charismatic but destructive, violence as language, seductive evil.',
    examples: 'Scorsese, Tarantino, Refn',
  },
  alienated_observer: {
    label: 'Alienated Observer',
    description: 'Outsider looking in, unreliable narrator, dissociated from reality.',
    examples: 'Kubrick, Lynch, Kaufman, Anderson',
  },
  ensemble_tapestry: {
    label: 'Ensemble Tapestry',
    description: 'No single protagonist, community as character, interwoven lives.',
    examples: 'Altman, PTA, Iñárritu, Linklater',
  },
};

// ─── AUDIO TYPES ─────────────────────────────────────────────────
export const AUDIO_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  john_williams_emotional: {
    label: 'John Williams Emotional',
    description: 'Leitmotifs, orchestral swell, emotion externalized through score.',
    examples: 'Spielberg, Lucas',
  },
  source_driven_hip: {
    label: 'Source-Driven & Hip',
    description: 'Diegetic music, curated soundtrack, anachronistic needle drops.',
    examples: 'Tarantino, Scorsese, Wright, Gunn',
  },
  ambient_dread: {
    label: 'Ambient Dread',
    description: 'Drone, low frequencies, silence as weapon. Sound design as score.',
    examples: 'Fincher, Villeneuve, Eggers',
  },
  classical_juxtaposition: {
    label: 'Classical Juxtaposition',
    description: 'Baroque music over violence, irony through beauty. The contrast IS the point.',
    examples: 'Kubrick, Yorgos Lanthimos',
  },
  naturalistic_overlap: {
    label: 'Naturalistic Overlap',
    description: 'Overlapping dialogue, environmental sound, no score. Reality unfiltered.',
    examples: 'Altman, Linklater, The Coens',
  },
  hans_zimmer_pummel: {
    label: 'Hans Zimmer Pummel',
    description: 'Sonic pressure, brass blasts, physical sound design that vibrates your chest.',
    examples: 'Nolan, Villeneuve, Zimmer collaborations',
  },
};

// ─── EMOTIONAL TYPES ─────────────────────────────────────────────
export const EMOTIONAL_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  bittersweet_nostalgia: {
    label: 'Bittersweet Nostalgia',
    description: 'Happy-sad, beauty in loss, golden light on a moment that\'s already gone.',
    examples: 'Spielberg, Burton, del Toro',
  },
  exist_dread: {
    label: 'Existential Dread',
    description: 'Cosmic insignificance, anxiety, no answers. The void stares back.',
    examples: 'Nolan, Aronofsky, Lynch',
  },
  romantic_melancholy: {
    label: 'Romantic Melancholy',
    description: 'Longing, missed connections, time passing. Love as beautiful ache.',
    examples: 'Wong Kar-wai, Gerwig, Baumbach',
  },
  cathartic_vengeance: {
    label: 'Cathartic Vengeance',
    description: 'Violence as release, moral ambiguity, dark satisfaction.',
    examples: 'Tarantino, Scorsese, Bigelow',
  },
  absurdist_humor: {
    label: 'Absurdist Humor',
    description: 'Dark comedy, life\'s randomness, coping through laughter at the void.',
    examples: 'The Coens, Anderson, Yorgos',
  },
  wonder_terror: {
    label: 'Wonder & Terror',
    description: 'Awe and fear simultaneously, sublime scale, human smallness before the vast.',
    examples: 'Malick, Cuarón, Villeneuve',
  },
};

// ─── COLOR TYPES ─────────────────────────────────────────────────
export const COLOR_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  warm_amber_memory: {
    label: 'Warm Amber Memory',
    description: 'Golden hour, nostalgia, safety. The past glows.',
    examples: 'Spielberg, Malick, Zemeckis',
  },
  cool_steel_anxiety: {
    label: 'Cool Steel Anxiety',
    description: 'Blues, grays, clinical precision. Cold as control.',
    examples: 'Fincher, Nolan, Villeneuve',
  },
  saturated_pop: {
    label: 'Saturated Pop',
    description: 'Primaries, comic book energy, artificial joy that might crack.',
    examples: 'Burton, Wright, Gerwig',
  },
  desaturated_grit: {
    label: 'Desaturated Grit',
    description: 'Earth tones, mud, blood, reality. Beauty isn\'t pretty.',
    examples: 'Scorsese, The Safdies, Reichardt',
  },
  neon_contrast: {
    label: 'Neon Contrast',
    description: 'Magentas, cyans, electric night. Color as fever dream.',
    examples: 'Refn, Villeneuve, Mann, Wong Kar-wai',
  },
  pastel_wes: {
    label: 'Pastel Wes',
    description: 'Specific palette per film, flat lighting, storybook quality.',
    examples: 'Wes Anderson, Sophia Coppola',
  },
};

// ─── CAMERA TYPES ────────────────────────────────────────────────
export const CAMERA_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  steady_reveal: {
    label: 'Steady Reveal',
    description: 'Dolly in, slow information, the "Spielberg face" — reaction before the thing.',
    examples: 'Spielberg, Zemeckis',
  },
  subjective_unreliable: {
    label: 'Subjective Unreliable',
    description: 'POV shifts, unstable framing, audience manipulation. Can you trust what you see?',
    examples: 'Fincher, Nolan, Aronofsky',
  },
  floating_lyrical: {
    label: 'Floating Lyrical',
    description: 'Steadicam, handheld poetry, natural movement. Camera breathes with the scene.',
    examples: 'Cuarón, Iñárritu, Malick',
  },
  static_tableau: {
    label: 'Static Tableau',
    description: 'Wide shot, depth staging, let actors move within the frame. Painting, not chasing.',
    examples: 'Anderson, Kubrick, Tarkovsky',
  },
  kinetic_chaos: {
    label: 'Kinetic Chaos',
    description: 'Quick pans, zooms, energy through movement. The camera is alive.',
    examples: 'Scorsese, PTA, Soderbergh',
  },
  intimate_breathing: {
    label: 'Intimate Breathing',
    description: 'Close proximity, shallow focus, the actor\'s space. You feel their breath.',
    examples: 'Gerwig, Baumbach, Reichardt',
  },
};

// ─── DIRECTOR GENOME CONFIG ──────────────────────────────────────
export interface DirectorGenome {
  visual_type: keyof typeof VISUAL_LIBRARY;
  rhythm_type: keyof typeof RHYTHM_LIBRARY;
  thematic_type: keyof typeof THEMATIC_LIBRARY;
  character_type: keyof typeof CHARACTER_LIBRARY;
  audio_type: keyof typeof AUDIO_LIBRARY;
  emotional_type: keyof typeof EMOTIONAL_LIBRARY;
  color_type: keyof typeof COLOR_LIBRARY;
  camera_type: keyof typeof CAMERA_LIBRARY;
  heading_style: string;
  description_style: string;
  camera_direction_style: string;
  dialogue_style: string;
  audio_cue_style: string;
  beat_description: string;
}

export const DIRECTOR_GENOME_DATABASE: Record<string, DirectorGenome> = {
  'Steven Spielberg': {
    visual_type: 'operatic_sweep',
    rhythm_type: 'classical_build',
    thematic_type: 'childhood_wonder_loss',
    character_type: 'everyman_extraordinary',
    audio_type: 'john_williams_emotional',
    emotional_type: 'bittersweet_nostalgia',
    color_type: 'warm_amber_memory',
    camera_type: 'steady_reveal',
    heading_style: 'Standard slugline + brief atmospheric note',
    description_style: "Visual-first, mention light quality, 'Spielberg face' moments",
    camera_direction_style: 'Specific lens choices, dolly moves, backlighting notes',
    dialogue_style: 'Earnest, exposition through emotion, parental reassurance',
    audio_cue_style: 'Williams-style motif description, swell timing',
    beat_description: 'Childlike awe turning to adult understanding',
  },
  'Christopher Nolan': {
    visual_type: 'geometric_precision',
    rhythm_type: 'fractured_time',
    thematic_type: 'identity_fragmentation',
    character_type: 'obsessive_professional',
    audio_type: 'hans_zimmer_pummel',
    emotional_type: 'exist_dread',
    color_type: 'cool_steel_anxiety',
    camera_type: 'subjective_unreliable',
    heading_style: 'Location + Time note (if non-linear)',
    description_style: 'Architectural, mention practical effects, time mechanics',
    camera_direction_style: 'IMAX scale, cross-cutting description, spatial disorientation',
    dialogue_style: 'Technical exposition, philosophical asides, urgent whisper',
    audio_cue_style: 'Shepard tone, ticking, bass drop at revelation',
    beat_description: 'Intellectual puzzle solving with emotional cost',
  },
  'Quentin Tarantino': {
    visual_type: 'neon_noir',
    rhythm_type: 'slow_burn_dread',
    thematic_type: 'violence_masculinity',
    character_type: 'toxic_masculine',
    audio_type: 'source_driven_hip',
    emotional_type: 'cathartic_vengeance',
    color_type: 'saturated_pop',
    camera_type: 'kinetic_chaos',
    heading_style: 'Chapter heading, location as character',
    description_style: 'Pop culture reference, brand names, fetishistic detail',
    camera_direction_style: 'Trunk shots, feet, 360° tracking, sudden zooms',
    dialogue_style: 'Circular conversations, movie references, sudden violence',
    audio_cue_style: 'Anachronistic song, cue timing, diegetic music source',
    beat_description: 'Cool to explosive, tension through conversation',
  },
  'David Fincher': {
    visual_type: 'claustrophobic_intimacy',
    rhythm_type: 'slow_burn_dread',
    thematic_type: 'identity_fragmentation',
    character_type: 'obsessive_professional',
    audio_type: 'ambient_dread',
    emotional_type: 'exist_dread',
    color_type: 'cool_steel_anxiety',
    camera_type: 'subjective_unreliable',
    heading_style: 'Minimalist, clinical',
    description_style: 'Process-oriented, detail fetishism, sterile environments',
    camera_direction_style: 'Digital smoothness, invisible technique, locked-off precision',
    dialogue_style: 'Understated, subtext, information as weapon',
    audio_cue_style: 'Trent Reznor ambient, low frequency dread, silence',
    beat_description: 'Compulsion, control slipping, meticulous to unravelling',
  },
  'Martin Scorsese': {
    visual_type: 'gritty_textural',
    rhythm_type: 'relentless_escalation',
    thematic_type: 'american_dream_corruption',
    character_type: 'toxic_masculine',
    audio_type: 'source_driven_hip',
    emotional_type: 'cathartic_vengeance',
    color_type: 'desaturated_grit',
    camera_type: 'kinetic_chaos',
    heading_style: 'Neighborhood specific, street level',
    description_style: 'Ethnic detail, food, ritual, Catholic imagery',
    camera_direction_style: 'Quick zooms, push-ins, Scorsese silhouette',
    dialogue_style: 'Overlapping, profane musicality, storytelling as power',
    audio_cue_style: 'Rolling Stones, doo-wop, Italian opera, ironic juxtaposition',
    beat_description: 'Seduction of power, guilt, inevitable fall',
  },
  'Greta Gerwig': {
    visual_type: 'operatic_sweep',
    rhythm_type: 'impressionistic_flow',
    thematic_type: 'isolation_connection',
    character_type: 'romantic_idealist',
    audio_type: 'source_driven_hip',
    emotional_type: 'romantic_melancholy',
    color_type: 'saturated_pop',
    camera_type: 'intimate_breathing',
    heading_style: 'Domestic space + emotional weather',
    description_style: 'Female gaze, costume detail, interior emotional life',
    camera_direction_style: 'Close on faces, dancing bodies, spontaneous movement',
    dialogue_style: 'Overlapping, earnest, Greta-specific cadence, literary references',
    audio_cue_style: 'Indie folk, female vocalists, diegetic piano, party music',
    beat_description: 'Becoming, mother-daughter tension, joy and sadness simultaneous',
  },
  'Wes Anderson': {
    visual_type: 'geometric_precision',
    rhythm_type: 'classical_build',
    thematic_type: 'isolation_connection',
    character_type: 'alienated_observer',
    audio_type: 'classical_juxtaposition',
    emotional_type: 'absurdist_humor',
    color_type: 'pastel_wes',
    camera_type: 'static_tableau',
    heading_style: 'Chapter title, elaborate location description',
    description_style: 'Miniature quality, costume as character, deadpan detail',
    camera_direction_style: 'Flat dolly, whip pans, centered symmetry, aspect ratio shifts',
    dialogue_style: 'Deadpan, precocious, emotional restraint, sudden confession',
    audio_cue_style: '60s French pop, Henry Jarvis score, needle drop precision',
    beat_description: 'Whimsy masking melancholy, family dysfunction, nostalgia as trap',
  },
  'Denis Villeneuve': {
    visual_type: 'neon_noir',
    rhythm_type: 'slow_burn_dread',
    thematic_type: 'nature_industry',
    character_type: 'obsessive_professional',
    audio_type: 'ambient_dread',
    emotional_type: 'wonder_terror',
    color_type: 'neon_contrast',
    camera_type: 'floating_lyrical',
    heading_style: 'Environmental scale + human smallness',
    description_style: 'Atmospheric, weather as mood, tactile surfaces',
    camera_direction_style: 'Atmospheric haze, silhouette, scale contrast, Deakins light',
    dialogue_style: 'Sparse, whispered, weight of silence, philosophical',
    audio_cue_style: 'Jóhann Jóhannsson/Villalobos drones, low rumbles, organic synths',
    beat_description: 'Confronting the unknown, maternal/paternal anxiety, time dilation',
  },
  'Alfonso Cuarón': {
    visual_type: 'operatic_sweep',
    rhythm_type: 'relentless_escalation',
    thematic_type: 'isolation_connection',
    character_type: 'ensemble_tapestry',
    audio_type: 'naturalistic_overlap',
    emotional_type: 'wonder_terror',
    color_type: 'warm_amber_memory',
    camera_type: 'fluid_oner',
    heading_style: 'Geographic specificity + social context',
    description_style: 'Class dynamics, Mexico City texture, political undertone',
    camera_direction_style: 'Long take choreography, gravity play, environmental immersion',
    dialogue_style: 'Naturalistic overlap, class-coded speech, intimate banter',
    audio_cue_style: 'Source music, environmental sound, silence in space',
    beat_description: 'Personal as political, class friction, survival through connection',
  },
  'David Lynch': {
    visual_type: 'surrealist_dreamscape',
    rhythm_type: 'meditative_stillness',
    thematic_type: 'identity_fragmentation',
    character_type: 'alienated_observer',
    audio_type: 'ambient_dread',
    emotional_type: 'exist_dread',
    color_type: 'neon_contrast',
    camera_type: 'subjective_unreliable',
    heading_style: 'Dream logic location, industrial or suburban',
    description_style: 'Uncanny imagery, electrical hum, red curtains, highway at night',
    camera_direction_style: 'Slow dissolve, strobe effect, unexplained close-ups',
    dialogue_style: 'Non-sequitur, ominous banality, reversed speech, screaming',
    audio_cue_style: 'Angelo Badalamenti jazz, industrial noise, silence, Julee Cruise',
    beat_description: 'Subconscious bleeding through, evil in banality, no answers',
  },
  'Stanley Kubrick': {
    visual_type: 'geometric_precision',
    rhythm_type: 'meditative_stillness',
    thematic_type: 'violence_masculinity',
    character_type: 'alienated_observer',
    audio_type: 'classical_juxtaposition',
    emotional_type: 'exist_dread',
    color_type: 'cool_steel_anxiety',
    camera_type: 'static_tableau',
    heading_style: 'Precise, clinical, location as psychological state',
    description_style: 'Symmetrical composition, period detail, dehumanized environments',
    camera_direction_style: 'One-point perspective, Steadicam tracking, wide-angle distortion',
    dialogue_style: 'Monotone delivery, ironic formality, coded threats, dark humor',
    audio_cue_style: 'Classical music over violence, Ligeti clusters, silence then eruption',
    beat_description: 'Systems controlling humans, beauty of horror, mechanical inevitability',
  },
  'Paul Thomas Anderson': {
    visual_type: 'gritty_textural',
    rhythm_type: 'impressionistic_flow',
    thematic_type: 'american_dream_corruption',
    character_type: 'ensemble_tapestry',
    audio_type: 'source_driven_hip',
    emotional_type: 'romantic_melancholy',
    color_type: 'warm_amber_memory',
    camera_type: 'kinetic_chaos',
    heading_style: 'Period-specific, industry-detailed',
    description_style: 'Era textures, Americana, father-son dynamics, industry as backdrop',
    camera_direction_style: 'Ambitious tracking shots, push-ins, Altman-esque ensemble coverage',
    dialogue_style: 'Monologue-driven, desperate confessions, verbal power plays',
    audio_cue_style: 'Radiohead, period-accurate needle drops, Jonny Greenwood dissonance',
    beat_description: 'Desperate need for love/recognition, fathers failing children, ambition consuming soul',
  },
  'Andrei Tarkovsky': {
    visual_type: 'operatic_sweep',
    rhythm_type: 'meditative_stillness',
    thematic_type: 'nature_industry',
    character_type: 'alienated_observer',
    audio_type: 'ambient_dread',
    emotional_type: 'wonder_terror',
    color_type: 'desaturated_grit',
    camera_type: 'static_tableau',
    heading_style: 'Elemental, poetic, location as spiritual state',
    description_style: 'Water, fire, earth as characters; decay and renewal; long takes of nature',
    camera_direction_style: 'Extremely long holds, slow panning, rain on surfaces',
    dialogue_style: 'Philosophical, sparse, characters speak as if thinking aloud',
    audio_cue_style: 'Bach, natural sounds amplified, dripping water, wind',
    beat_description: 'Spiritual yearning, memory as prayer, time made visible',
  },
  'Wong Kar-wai': {
    visual_type: 'neon_noir',
    rhythm_type: 'impressionistic_flow',
    thematic_type: 'isolation_connection',
    character_type: 'romantic_idealist',
    audio_type: 'source_driven_hip',
    emotional_type: 'romantic_melancholy',
    color_type: 'neon_contrast',
    camera_type: 'intimate_breathing',
    heading_style: 'Time stamp + emotional temperature',
    description_style: 'Rain-slicked neon, cramped Hong Kong spaces, food as intimacy',
    camera_direction_style: 'Step-printed slow motion, smeared color, handheld closeness',
    dialogue_style: 'Voiceover longing, indirect communication, time stamps as poetry',
    audio_cue_style: 'Canned Latin music, repeating motifs, diegetic jukebox',
    beat_description: 'Missed connections, parallel loneliness, love as timing',
  },
  'Bong Joon-ho': {
    visual_type: 'geometric_precision',
    rhythm_type: 'fractured_time',
    thematic_type: 'american_dream_corruption',
    character_type: 'ensemble_tapestry',
    audio_type: 'classical_juxtaposition',
    emotional_type: 'absurdist_humor',
    color_type: 'saturated_pop',
    camera_type: 'steady_reveal',
    heading_style: 'Class-coded location, vertical geography',
    description_style: 'Class metaphors made physical, food/smell, architectural hierarchy',
    camera_direction_style: 'Precise blocking, stairs as metaphor, reveal through architecture',
    dialogue_style: 'Genre-shifting tone, casual cruelty, class-coded formality',
    audio_cue_style: 'Orchestral with dark humor, silence before violence, ironic beauty',
    beat_description: 'Class warfare as genre exercise, comedy becoming horror, systems crushing individuals',
  },
  'Damien Chazelle': {
    visual_type: 'operatic_sweep',
    rhythm_type: 'relentless_escalation',
    thematic_type: 'american_dream_corruption',
    character_type: 'obsessive_professional',
    audio_type: 'source_driven_hip',
    emotional_type: 'bittersweet_nostalgia',
    color_type: 'warm_amber_memory',
    camera_type: 'kinetic_chaos',
    heading_style: 'Performance space as arena',
    description_style: 'Sweat, blood, instruments, physical toll of art-making',
    camera_direction_style: 'Whip pans to hands/instruments, spinning camera, visceral cuts',
    dialogue_style: 'Mentor abuse, passionate argument, silence before performance',
    audio_cue_style: 'Jazz as weapon, diegetic performance, music as dialogue',
    beat_description: 'Art demands sacrifice, greatness vs. happiness, the price of perfection',
  },
  'Robert Eggers': {
    visual_type: 'claustrophobic_intimacy',
    rhythm_type: 'slow_burn_dread',
    thematic_type: 'isolation_connection',
    character_type: 'obsessive_professional',
    audio_type: 'ambient_dread',
    emotional_type: 'exist_dread',
    color_type: 'desaturated_grit',
    camera_type: 'intimate_breathing',
    heading_style: 'Period-specific, archaic language in description',
    description_style: 'Historical accuracy, candlelight, tactile textures, period detail',
    camera_direction_style: 'Natural light only, period-accurate aspect ratios, slow zoom',
    dialogue_style: 'Archaic period speech, biblical cadence, madness in formality',
    audio_cue_style: 'Period instruments, wind howl, creaking wood, silence',
    beat_description: 'Isolation breeds madness, nature as indifferent god, faith tested',
  },
  'The Safdie Brothers': {
    visual_type: 'gritty_textural',
    rhythm_type: 'relentless_escalation',
    thematic_type: 'american_dream_corruption',
    character_type: 'obsessive_professional',
    audio_type: 'source_driven_hip',
    emotional_type: 'cathartic_vengeance',
    color_type: 'neon_contrast',
    camera_type: 'kinetic_chaos',
    heading_style: 'NYC street level, claustrophobic specificity',
    description_style: 'Sweat, fluorescent light, Diamond District grime, overlapping chaos',
    camera_direction_style: 'Telephoto compression, handheld panic, faces filling frame',
    dialogue_style: 'Overlapping yelling, desperate lies, fast-talking hustler energy',
    audio_cue_style: 'Daniel Lopatin synths, diegetic radio, anxiety-inducing score',
    beat_description: 'Addiction to risk, spiraling consequences, no brakes, exhilarating doom',
  },
  'Jordan Peele': {
    visual_type: 'neon_noir',
    rhythm_type: 'slow_burn_dread',
    thematic_type: 'identity_fragmentation',
    character_type: 'everyman_extraordinary',
    audio_type: 'ambient_dread',
    emotional_type: 'exist_dread',
    color_type: 'saturated_pop',
    camera_type: 'subjective_unreliable',
    heading_style: 'Suburban uncanny, familiar made wrong',
    description_style: 'Social horror through visual metaphor, doubling, mirrors',
    camera_direction_style: 'Slow zooms, symmetrical framing, POV that questions reality',
    dialogue_style: 'Casual Black vernacular, comedic timing weaponized, coded warnings',
    audio_cue_style: 'Repurposed pop/soul songs, Michael Abels orchestral horror, silence',
    beat_description: 'Race as horror landscape, the familiar turned predatory, systemic evil',
  },
  'Chloé Zhao': {
    visual_type: 'operatic_sweep',
    rhythm_type: 'meditative_stillness',
    thematic_type: 'nature_industry',
    character_type: 'alienated_observer',
    audio_type: 'ambient_dread',
    emotional_type: 'wonder_terror',
    color_type: 'warm_amber_memory',
    camera_type: 'floating_lyrical',
    heading_style: 'Landscape as character, golden hour',
    description_style: 'Non-actors, real locations, American frontier, weathered faces',
    camera_direction_style: 'Magic hour chasing, natural light, landscape dwarfing human',
    dialogue_style: 'Spare, non-professional cadence, silence speaks, observation over exposition',
    audio_cue_style: 'Minimal score, wind, ambient nature, piano simplicity',
    beat_description: 'Dignity in marginality, land as memory, impermanence accepted',
  },
  'Guillermo del Toro': {
    visual_type: 'surrealist_dreamscape',
    rhythm_type: 'classical_build',
    thematic_type: 'childhood_wonder_loss',
    character_type: 'romantic_idealist',
    audio_type: 'classical_juxtaposition',
    emotional_type: 'bittersweet_nostalgia',
    color_type: 'saturated_pop',
    camera_type: 'steady_reveal',
    heading_style: 'Fairy tale location + darkness underneath',
    description_style: 'Monster design as metaphor, Catholic/fascist imagery, amber and crimson',
    camera_direction_style: 'Creature reveals, practical effects worship, gothic architecture',
    dialogue_style: 'Fairy tale narration, accented earnestness, monsters speak truth',
    audio_cue_style: 'Lullaby motif, orchestral darkness, ticking clocks',
    beat_description: 'Monsters are sympathetic, humans are the real horror, love transcends form',
  },
  'Yorgos Lanthimos': {
    visual_type: 'geometric_precision',
    rhythm_type: 'slow_burn_dread',
    thematic_type: 'identity_fragmentation',
    character_type: 'alienated_observer',
    audio_type: 'classical_juxtaposition',
    emotional_type: 'absurdist_humor',
    color_type: 'cool_steel_anxiety',
    camera_type: 'static_tableau',
    heading_style: 'Clinical, rule-based, institutional',
    description_style: 'Deadpan surreal, bodies as objects, ritualistic behavior',
    camera_direction_style: 'Fish-eye distortion, static wide shots, slow zoom into discomfort',
    dialogue_style: 'Flat affect, literal-minded, absurd rules stated as fact',
    audio_cue_style: 'Discordant strings, silence, sudden classical eruption',
    beat_description: 'Power structures as absurd games, compliance as horror, dark comedy of control',
  },
  'Steven Soderbergh': {
    visual_type: 'documentary_verite',
    rhythm_type: 'fractured_time',
    thematic_type: 'american_dream_corruption',
    character_type: 'obsessive_professional',
    audio_type: 'source_driven_hip',
    emotional_type: 'cathartic_vengeance',
    color_type: 'neon_contrast',
    camera_type: 'kinetic_chaos',
    heading_style: 'Location title card, institutional specificity',
    description_style: 'Process fetishism, institutional mechanics, genre-hopping',
    camera_direction_style: 'iPhone cinematography, color-coded timelines, push-in on process',
    dialogue_style: 'Jargon-heavy, procedural exposition, understated wit',
    audio_cue_style: 'Electronic/retro score, genre-appropriate needle drops',
    beat_description: 'Systems vs. individuals, competence as entertainment, cool efficiency',
  },
  'Tim Burton': {
    visual_type: 'surrealist_dreamscape',
    rhythm_type: 'classical_build',
    thematic_type: 'childhood_wonder_loss',
    character_type: 'alienated_observer',
    audio_type: 'classical_juxtaposition',
    emotional_type: 'bittersweet_nostalgia',
    color_type: 'saturated_pop',
    camera_type: 'steady_reveal',
    heading_style: 'Gothic location, contrast between worlds',
    description_style: 'German Expressionist angles, spiral motifs, outsider protagonist',
    camera_direction_style: 'Dutch angles, miniature quality, dramatic shadows',
    dialogue_style: 'Quirky outsider wisdom, deadpan dark humor, poetic misfits',
    audio_cue_style: 'Danny Elfman choir, music box melody, waltz tempo',
    beat_description: 'The outsider finds belonging, darkness as home, beauty in the macabre',
  },
  'James Cameron': {
    visual_type: 'operatic_sweep',
    rhythm_type: 'relentless_escalation',
    thematic_type: 'nature_industry',
    character_type: 'everyman_extraordinary',
    audio_type: 'hans_zimmer_pummel',
    emotional_type: 'wonder_terror',
    color_type: 'neon_contrast',
    camera_type: 'fluid_oner',
    heading_style: 'Technical environment, scale emphasized',
    description_style: 'Technology worship, water/machines, practical + digital hybrid',
    camera_direction_style: 'Pioneering VFX shots, underwater photography, scale reveals',
    dialogue_style: 'Blunt, functional, "Get to the chopper" efficiency, one-liners',
    audio_cue_style: 'James Horner epic, tribal drums, silence before spectacle',
    beat_description: 'Technology as threat and salvation, love across barriers, spectacle with heart',
  },
};

// ─── HELPER: Build directorial genome prompt ─────────────────────
export function buildDirectorialGenome(directorName: string): string | null {
  const genome = DIRECTOR_GENOME_DATABASE[directorName];
  if (!genome) return null;

  const visual = VISUAL_LIBRARY[genome.visual_type];
  const rhythm = RHYTHM_LIBRARY[genome.rhythm_type];
  const thematic = THEMATIC_LIBRARY[genome.thematic_type];
  const character = CHARACTER_LIBRARY[genome.character_type];
  const audio = AUDIO_LIBRARY[genome.audio_type];
  const emotional = EMOTIONAL_LIBRARY[genome.emotional_type];
  const color = COLOR_LIBRARY[genome.color_type];
  const camera = CAMERA_LIBRARY[genome.camera_type];

  return `## DIRECTORIAL GENOME: ${directorName}

### VISUAL SIGNATURE: ${visual?.label || genome.visual_type}
${visual?.description || ''}

### NARRATIVE RHYTHM: ${rhythm?.label || genome.rhythm_type}
${rhythm?.description || ''}

### THEMATIC OBSESSION: ${thematic?.label || genome.thematic_type}
${thematic?.description || ''}

### CHARACTER ARCHETYPES: ${character?.label || genome.character_type}
${character?.description || ''}

### AUDIO DESIGN: ${audio?.label || genome.audio_type}
${audio?.description || ''}

### EMOTIONAL TEMPERATURE: ${emotional?.label || genome.emotional_type}
${emotional?.description || ''}

### COLOR PHILOSOPHY: ${color?.label || genome.color_type}
${color?.description || ''}

### CAMERA PSYCHOLOGY: ${camera?.label || genome.camera_type}
${camera?.description || ''}

## DIRECTORIAL SPECIFICS
- Scene headings: ${genome.heading_style}
- Visual description: ${genome.description_style}
- Camera work: ${genome.camera_direction_style}
- Dialogue style: ${genome.dialogue_style}
- Sound/music: ${genome.audio_cue_style}
- Emotional beats: ${genome.beat_description}`;
}

// ─── HELPER: Find director by name (fuzzy) ──────────────────────
export function findDirectorGenome(name: string): string | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();

  // Direct match
  for (const key of Object.keys(DIRECTOR_GENOME_DATABASE)) {
    if (key.toLowerCase() === lower) return key;
  }

  // Last name match — "nolan" matches "Christopher Nolan"
  for (const key of Object.keys(DIRECTOR_GENOME_DATABASE)) {
    const parts = key.toLowerCase().split(' ');
    const lastName = parts[parts.length - 1];
    if (lastName === lower || lower.includes(lastName)) return key;
  }

  // Partial match
  for (const key of Object.keys(DIRECTOR_GENOME_DATABASE)) {
    if (key.toLowerCase().includes(lower) || lower.includes(key.toLowerCase())) return key;
  }

  return null;
}

// ─── HELPER: Build full movie writer prompt ──────────────────────
export function buildMovieWriterPrompt(
  directorName: string,
  premise: string,
  sceneType?: string,
  era?: string,
  actors?: string,
  customCharacter?: string,
): string {
  const genome = DIRECTOR_GENOME_DATABASE[directorName];
  if (!genome) {
    return `You are a talented screenwriter. Write a movie scene about: ${premise}`;
  }

  const dirGenome = buildDirectorialGenome(directorName)!;

  let prompt = `SYSTEM ROLE: You are a master cinematographer and screenwriter who has studied ${directorName}'s complete filmography. Generate scenes that perfectly replicate their directorial DNA.

${dirGenome}`;

  if (customCharacter) {
    prompt += `\n\n## CUSTOM CHARACTER\n${customCharacter}`;
  }
  if (era) {
    prompt += `\n\n## ERA CONTEXT\nWrite in the style of ${directorName}'s ${era} career period.`;
  }
  if (actors) {
    prompt += `\n\n## MENTAL CAST\n${actors}`;
  }

  prompt += `\n\n## PREMISE\n${premise}
${sceneType ? `\nScene type: ${sceneType}` : ''}

Generate now following ${directorName}'s cinematic language exactly.`;

  return prompt;
}
