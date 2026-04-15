// lib/show-genome.ts
// Narrative Genome System — show-specific writing DNA for authentic script generation
//
// Each show has a "genome" that defines its structural, comedic, and thematic DNA.
// The script route uses this to generate scripts that feel like the real show.
//
// Based on research into each show's actual writing methodology and structural patterns.

// ─── STRUCTURE TYPES ─────────────────────────────────────────────
export const STRUCTURE_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  viral_three_act: {
    label: 'Viral Satire',
    description: 'Topic enters mundane world → Adult incompetence escalates → Absurd catastrophe. Every scene transition uses "BUT" (complication) or "THEREFORE" (consequence) — never "AND THEN."',
    examples: 'South Park, Family Guy',
  },
  mystery_procedural: {
    label: 'Mystery of the Week',
    description: 'Cold open death/crime → Investigation with clues → Red herrings and misdirection → Twist reveal and resolution.',
    examples: 'Law & Order, CSI, Monk',
  },
  serial_ensemble: {
    label: 'Serial Ensemble',
    description: 'A-plot/B-plot/C-plot run in parallel → Convergence at climax → Cliffhanger or thematic echo.',
    examples: 'Game of Thrones, Succession, The Wire',
  },
  sitcom_reset: {
    label: 'Sitcom Reset',
    description: 'Setup → Complication → Escalating chaos → Reset (no lessons learned, status quo restored).',
    examples: 'Seinfeld, It\'s Always Sunny, Friends',
  },
  monster_of_week: {
    label: 'Monster/Threat of Week',
    description: 'Teaser threat → Team assembles → Plan fails → Emotional turn → Victory (pyrrhic or full).',
    examples: 'Buffy, X-Files, Supernatural',
  },
  shonen_arc: {
    label: 'Shonen Battle Arc',
    description: 'Training → Tournament/Fight → Power-up revelation → Friendship speech → Win against impossible odds.',
    examples: 'Dragon Ball, My Hero Academia, Naruto',
  },
  SOL_episodic: {
    label: 'Slice of Life Episodic',
    description: 'Mood piece → Small conflict → Emotional resolution → Contemplative ending.',
    examples: 'K-On!, Laid-Back Camp',
  },
  noir_twist: {
    label: 'Noir Twist',
    description: 'Setup → Double-cross → Revelation → Downbeat/tragic ending. Moral ambiguity throughout.',
    examples: 'Breaking Bad, Fargo, Ozark',
  },
};

// ─── PACING TYPES ────────────────────────────────────────────────
export const PACING_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  rapid_fire: {
    label: 'Rapid-Fire',
    description: '30-60 second scenes, cutaway gags, no breathing room. Constant momentum.',
    examples: 'South Park, 30 Rock, Rick and Morty',
  },
  procedural_steady: {
    label: 'Procedural Steady',
    description: '4 acts of equal length, commercial breaks built-in, methodical progression.',
    examples: 'Law & Order, NCIS',
  },
  slow_burn: {
    label: 'Slow Burn',
    description: 'Long scenes, heavy subtext, meaningful pauses, visual storytelling over dialogue.',
    examples: 'Better Call Saul, Mad Men, The Sopranos',
  },
  anime_beats: {
    label: 'Anime Beats',
    description: 'Fast dialogue → Dramatic pause → Reaction shot → Action burst → Recap/flashback.',
    examples: 'Most shonen, melodrama anime',
  },
  mockumentary: {
    label: 'Mockumentary',
    description: 'Talking heads intercut with action, deadpan delivery, camera-aware moments.',
    examples: 'The Office, Parks and Rec, Modern Family',
  },
};

// ─── CHARACTER DYNAMICS ──────────────────────────────────────────
export const DYNAMICS_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  four_boys_chaos: {
    label: 'Four Boys + Idiot Adult',
    description: 'Moral center + Arguer + Chaos agent + Victim + Obsessive adult who makes everything worse.',
    examples: 'South Park',
  },
  selfish_ensemble: {
    label: 'Selfish Ensemble',
    description: 'No moral center, everyone is terrible, individual schemes collide and compound.',
    examples: 'Seinfeld, It\'s Always Sunny, Arrested Development',
  },
  found_family: {
    label: 'Found Family',
    description: 'Leader + Muscle + Heart + Wildcard + Mentor. Loyalty tested but always endures.',
    examples: 'Guardians of Galaxy, Firefly, One Piece',
  },
  workplace_hierarchy: {
    label: 'Workplace Hierarchy',
    description: 'Boss + Workers + Outsider. Power dynamics drive comedy and drama.',
    examples: 'The Office, 30 Rock, Brooklyn Nine-Nine',
  },
  rival_friends: {
    label: 'Rival Friends',
    description: 'Two leads with opposing worldviews forced together, mutual respect under conflict.',
    examples: 'Sherlock, House, Rick and Morty',
  },
  chosen_crew: {
    label: 'Chosen Crew',
    description: 'Prophecy figure + Protector + Comic relief + Love interest. Classic quest structure.',
    examples: 'Star Wars, Harry Potter, most fantasy',
  },
};

// ─── COMEDY/TONE MECHANICS ───────────────────────────────────────
export const MECHANICS_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  satirical_deconstruction: {
    label: 'Satirical Deconstruction',
    description: 'Mock real events/institutions, systems fail comically, ironic lessons that undercut themselves.',
    examples: 'South Park, Veep, Black Mirror',
  },
  cringe_empathy: {
    label: 'Cringe Empathy',
    description: 'Secondhand embarrassment, character unaware of their own flaw, audience winces.',
    examples: 'The Office, Peep Show, Curb Your Enthusiasm',
  },
  absurdist_logic: {
    label: 'Absurdist Logic',
    description: 'Internal consistency within nonsense, escalation to surreal extremes.',
    examples: 'Adventure Time, Futurama, Monty Python',
  },
  dramatic_irony: {
    label: 'Dramatic Irony',
    description: 'Audience knows more than characters, tension from the knowledge gap.',
    examples: 'Breaking Bad, horror movies, The Sopranos',
  },
  earnest_sincerity: {
    label: 'Earnest Sincerity',
    description: 'Genuine emotion without irony, catharsis through empathy, hopeful undertone.',
    examples: 'Pixar, Studio Ghibli, Ted Lasso',
  },
  meta_commentary: {
    label: 'Meta Commentary',
    description: 'Characters aware of medium, fourth wall breaks, genre-savvy humor.',
    examples: 'Deadpool, She-Hulk, Community',
  },
};

// ─── THEMATIC MODES ──────────────────────────────────────────────
export const THEMATIC_LIBRARY: Record<string, { label: string; description: string }> = {
  no_lesson: {
    label: 'No Lesson',
    description: 'Chaos resolves, nobody learns anything, status quo is restored. The point is the journey.',
  },
  ironic_lesson: {
    label: 'Ironic Lesson',
    description: 'Lesson is stated explicitly, then immediately undercut or proven wrong. The "real" lesson is for the audience.',
  },
  earned_growth: {
    label: 'Earned Growth',
    description: 'Character actually changes through suffering, pays a real cost for development.',
  },
  circular_poetry: {
    label: 'Circular Poetry',
    description: 'Returns to where it started but with new context. Bittersweet recognition that things don\'t really change.',
  },
  friendship_power: {
    label: 'Friendship Power',
    description: 'Emotional bond between characters defeats the threat. Explicit speech about loyalty/love.',
  },
  ambiguous_bittersweet: {
    label: 'Ambiguous Bittersweet',
    description: 'Resolution is unclear, mixed emotions, viewer must decide meaning.',
  },
};

// ─── AESTHETIC TYPES ─────────────────────────────────────────────
export const AESTHETIC_LIBRARY: Record<string, { label: string; description: string; examples: string }> = {
  cutout_crude: {
    label: 'Cutout Crude',
    description: 'Construction paper aesthetic, limited animation, sudden violence contrasts with simplicity.',
    examples: 'South Park',
  },
  sitcom_multi: {
    label: 'Multi-Camera Sitcom',
    description: 'Bright lighting, laugh track, standard sets, warm palette.',
    examples: 'Seinfeld, Friends, Big Bang Theory',
  },
  cinematic_handheld: {
    label: 'Cinematic Handheld',
    description: 'Single-camera, handheld movement, natural lighting, documentary feel.',
    examples: 'The Office, Parks and Rec',
  },
  anime_sakuga: {
    label: 'Anime Sakuga',
    description: 'Limited animation with key frame bursts of fluid action, speed lines, exaggerated reaction faces.',
    examples: 'Most TV anime',
  },
  minimalist_indie: {
    label: 'Minimalist Indie',
    description: 'Flat colors, sparse backgrounds, emotional close-ups, stylized simplicity.',
    examples: 'Bojack Horseman, Midnight Gospel',
  },
  gritty_real: {
    label: 'Gritty Realism',
    description: 'Desaturated palette, practical effects, grounded cinematography, harsh lighting.',
    examples: 'Breaking Bad, Chernobyl, The Wire',
  },
};

// ─── SHOW GENOME CONFIG ──────────────────────────────────────────
export interface ShowGenome {
  medium_type: string;
  structure_type: keyof typeof STRUCTURE_LIBRARY;
  pacing_type: keyof typeof PACING_LIBRARY;
  dynamics_type: keyof typeof DYNAMICS_LIBRARY;
  mechanics_type: keyof typeof MECHANICS_LIBRARY;
  thematic_mode: keyof typeof THEMATIC_LIBRARY;
  aesthetic_type: keyof typeof AESTHETIC_LIBRARY;
  title_format: string;
  logline_style: string;
  structure_label: string;
  transition_type: string;
  scene_count: string;
  dialogue_style: string;
  resolution_type: string;
  recurring_bit_style: string;
  custom_character_rules: string;
}

export const SHOW_GENOME_DATABASE: Record<string, ShowGenome> = {
  // ── Cartoons ────────────────────────────────────────────────
  'South Park': {
    medium_type: 'Adult Animated Sitcom',
    structure_type: 'viral_three_act',
    pacing_type: 'rapid_fire',
    dynamics_type: 'four_boys_chaos',
    mechanics_type: 'satirical_deconstruction',
    thematic_mode: 'ironic_lesson',
    aesthetic_type: 'cutout_crude',
    title_format: "'The [Topic] Special' or '[Topic] [Absurd Modifier]'",
    logline_style: 'The boys [action] when [topic] causes [absurd consequence]',
    structure_label: 'Three-Act Viral Structure',
    transition_type: 'But/Therefore causation',
    scene_count: '3-4',
    dialogue_style: 'Kids as adults, adults as panicked children, profanity as punctuation',
    resolution_type: 'Stan/Kyle ironic speech to camera, status quo reset',
    recurring_bit_style: 'Escalating catchphrase or visual gag',
    custom_character_rules: 'Supporting only, 2-4 scenes, never replaces core four',
  },
  'The Simpsons': {
    medium_type: 'Adult Animated Sitcom',
    structure_type: 'sitcom_reset',
    pacing_type: 'rapid_fire',
    dynamics_type: 'workplace_hierarchy',
    mechanics_type: 'satirical_deconstruction',
    thematic_mode: 'ironic_lesson',
    aesthetic_type: 'cutout_crude',
    title_format: "'[Pun on famous phrase]' or '[Homer\'s _____]'",
    logline_style: 'Homer [does something stupid] which causes [Springfield-wide chaos] while [family member] deals with [parallel B-plot]',
    structure_label: 'Three-Act with B-Plot',
    transition_type: 'Couch gag → Setup → Pivot → Resolution',
    scene_count: '3-4',
    dialogue_style: "Rapid-fire wordplay, Homer's catchphrases (D'oh!, Mmm...), Lisa's earnest speeches, Bart's rebellion",
    resolution_type: 'Family reconciliation, Homer learns nothing but hugs Marge, status quo restored',
    recurring_bit_style: "Couch gag, Homer's D'oh, Bart's chalkboard, Itchy & Scratchy",
    custom_character_rules: 'Springfield resident, customer at Moe\'s, or school peer; absorbed into town dynamic',
  },
  'Family Guy': {
    medium_type: 'Adult Animated Sitcom',
    structure_type: 'viral_three_act',
    pacing_type: 'rapid_fire',
    dynamics_type: 'selfish_ensemble',
    mechanics_type: 'absurdist_logic',
    thematic_mode: 'no_lesson',
    aesthetic_type: 'cutout_crude',
    title_format: "'[Pop culture reference]' or '[Pun]'",
    logline_style: 'Peter [fixates on topic] causing [family chaos] while Stewie and Brian [separate adventure]',
    structure_label: 'A-Plot + Stewie/Brian B-Plot + Cutaway Gags',
    transition_type: 'Cutaway gag transitions, "This is worse than the time..."',
    scene_count: '3-4',
    dialogue_style: 'Rapid cutaway references, Peter\'s stupidity, Stewie\'s eloquence, Brian\'s pretentiousness, Meg abuse',
    resolution_type: 'Abrupt resolution, fourth wall break, or everyone sits on couch',
    recurring_bit_style: 'Cutaway gags, Conway Twitty, Chicken Fight, Meg bullying',
    custom_character_rules: 'Quahog neighbor or Peter\'s coworker; serves as straight man or enabler',
  },
  'Rick and Morty': {
    medium_type: 'Adult Animated Sci-Fi',
    structure_type: 'monster_of_week',
    pacing_type: 'rapid_fire',
    dynamics_type: 'rival_friends',
    mechanics_type: 'meta_commentary',
    thematic_mode: 'ambiguous_bittersweet',
    aesthetic_type: 'cutout_crude',
    title_format: "'[Sci-fi concept] [Morty pun]' or '[Movie parody title]'",
    logline_style: 'Rick drags Morty into [sci-fi scenario] which spirals into [existential crisis] while [family B-plot mirrors theme]',
    structure_label: 'Adventure A-Plot + Family B-Plot + Existential Gut Punch',
    transition_type: 'Portal jumps and sci-fi escalation',
    scene_count: '3-4',
    dialogue_style: 'Rick\'s stuttering nihilism, Morty\'s anxious objections, meta-awareness, improvised-feeling dialogue',
    resolution_type: 'Pyrrhic victory, emotional gut punch hidden under cynicism, or absurd non-resolution',
    recurring_bit_style: 'Portal gun, multiverse variants, "Wubba lubba dub dub", Mr. Meeseeks callbacks',
    custom_character_rules: 'Alien, multiverse variant, or interdimensional being; exists for one adventure then discarded',
  },
  "Bob's Burgers": {
    medium_type: 'Animated Family Sitcom',
    structure_type: 'sitcom_reset',
    pacing_type: 'mockumentary',
    dynamics_type: 'found_family',
    mechanics_type: 'earnest_sincerity',
    thematic_mode: 'earned_growth',
    aesthetic_type: 'minimalist_indie',
    title_format: "'[Burger pun]' or '[Food-related wordplay]'",
    logline_style: 'Bob [restaurant crisis] while the kids [scheme/adventure] and Linda [enthusiastically makes it worse]',
    structure_label: 'Family A-Plot + Kids B-Plot',
    transition_type: 'Kids scheme intersects restaurant chaos',
    scene_count: '3',
    dialogue_style: "Warm banter, musical numbers, Bob's deadpan, Louise's scheming, Gene's non-sequiturs, Tina's awkward honesty",
    resolution_type: 'Family comes together, small victory, heart over money',
    recurring_bit_style: "Burger of the Day, pest control van name, Louise's ears, Tina's groans",
    custom_character_rules: 'Customer, Wagstaff student, or neighboring business owner; brings problem that family solves together',
  },

  // ── TV Shows (Live Action) ─────────────────────────────────
  "It's Always Sunny": {
    medium_type: 'Live-Action Sitcom',
    structure_type: 'sitcom_reset',
    pacing_type: 'rapid_fire',
    dynamics_type: 'selfish_ensemble',
    mechanics_type: 'cringe_empathy',
    thematic_mode: 'no_lesson',
    aesthetic_type: 'sitcom_multi',
    title_format: "'The Gang [Does Something]'",
    logline_style: "The Gang's [scheme] goes wrong when [character's flaw] causes [disaster]",
    structure_label: 'Scheme Structure',
    transition_type: 'Scheme escalation',
    scene_count: '3',
    dialogue_style: 'Yelling over each other, no listening, increasingly desperate schemes',
    resolution_type: 'Everyone loses, no growth, often physically injured',
    recurring_bit_style: "Charlie illiteracy, Dennis narcissism, Dee's failure, Frank's degeneracy",
    custom_character_rules: "Mark/victim, often Dee's date or scheme target, horrified by Gang",
  },
  'The Sopranos': {
    medium_type: 'Serialized Drama',
    structure_type: 'serial_ensemble',
    pacing_type: 'slow_burn',
    dynamics_type: 'workplace_hierarchy',
    mechanics_type: 'dramatic_irony',
    thematic_mode: 'circular_poetry',
    aesthetic_type: 'gritty_real',
    title_format: "'[Italian phrase]' or '[Simple noun]'",
    logline_style: "Tony must [handle family business] while [personal problem] threatens [domestic stability]",
    structure_label: 'Crime Plot + Therapy + Family Drama',
    transition_type: 'Psychological cause-and-effect',
    scene_count: '3',
    dialogue_style: 'Subtext-heavy, food metaphors, sudden violence, therapy monologues',
    resolution_type: 'Temporary fix, deeper rot revealed, cut to black',
    recurring_bit_style: "Animal symbolism, dream sequences, 'Poor you'",
    custom_character_rules: "Victim, rival mobster, or family outsider; threatens Tony's control",
  },
  'Breaking Bad': {
    medium_type: 'Serialized Drama',
    structure_type: 'noir_twist',
    pacing_type: 'slow_burn',
    dynamics_type: 'rival_friends',
    mechanics_type: 'dramatic_irony',
    thematic_mode: 'earned_growth',
    aesthetic_type: 'gritty_real',
    title_format: "'[Chemistry/desert metaphor]' or '[Single ominous word]'",
    logline_style: "Walt's [scheme to solve problem] creates [bigger problem] while Jesse [suffers the consequences]",
    structure_label: 'Descent Arc — each victory costs more',
    transition_type: 'Consequence chains, time bombs ticking',
    scene_count: '3-4',
    dialogue_style: "Terse, loaded silences, Heisenberg monologues, Jesse's emotional outbursts, science metaphors",
    resolution_type: 'Pyrrhic victory, someone pays the ultimate price, moral reckoning',
    recurring_bit_style: "Cold open flash-forwards, desert wide shots, breakfast scenes, 'Say my name'",
    custom_character_rules: 'Buyer, rival cook, or DEA contact; exists in the drug world ecosystem',
  },
  'Game of Thrones': {
    medium_type: 'Epic Fantasy Drama',
    structure_type: 'serial_ensemble',
    pacing_type: 'slow_burn',
    dynamics_type: 'chosen_crew',
    mechanics_type: 'dramatic_irony',
    thematic_mode: 'ambiguous_bittersweet',
    aesthetic_type: 'gritty_real',
    title_format: "'[House words reference]' or '[Battle/event name]'",
    logline_style: '[Character] must [navigate political crisis] while [threat] approaches and [alliance] fractures',
    structure_label: 'Multi-POV with convergence at episode 9 climax',
    transition_type: 'Geographic cuts between storylines',
    scene_count: '4-5',
    dialogue_style: 'Shakespearean scheming, veiled threats, monologues about power, brutal honesty from Tyrion',
    resolution_type: 'Shocking death or betrayal, pyrrhic victory, "the game" continues',
    recurring_bit_style: "Throne room scheming, 'Winter is coming', feast before battle, raven messages",
    custom_character_rules: 'Minor lord, sellsword, or commoner caught between great houses',
  },
  'Stranger Things': {
    medium_type: 'Sci-Fi Horror Drama',
    structure_type: 'monster_of_week',
    pacing_type: 'anime_beats',
    dynamics_type: 'found_family',
    mechanics_type: 'earnest_sincerity',
    thematic_mode: 'friendship_power',
    aesthetic_type: 'cinematic_handheld',
    title_format: "'The [Supernatural noun]' or 'Chapter [Number]: [Title]'",
    logline_style: 'The kids discover [Upside Down threat] and must [overcome it] using [friendship/Eleven\'s powers] before [Hawkins falls]',
    structure_label: 'Three groups (kids/teens/adults) converge against Big Bad',
    transition_type: '80s movie homage beats',
    scene_count: '3-4',
    dialogue_style: "Kids' D&D metaphors, Eleven's broken speech, Hopper's gruff protectiveness, 80s references",
    resolution_type: 'Gate closed but at great cost, someone sacrificed, bittersweet epilogue',
    recurring_bit_style: "Christmas lights, Eleven's nosebleed, Dustin's catchphrases, walkie-talkies",
    custom_character_rules: 'New kid in Hawkins or lab escapee; joins the party or is a sympathetic antagonist',
  },
  'The Office': {
    medium_type: 'Mockumentary Sitcom',
    structure_type: 'sitcom_reset',
    pacing_type: 'mockumentary',
    dynamics_type: 'workplace_hierarchy',
    mechanics_type: 'cringe_empathy',
    thematic_mode: 'earned_growth',
    aesthetic_type: 'cinematic_handheld',
    title_format: "'[Office event]' or '[Single word describing episode theme]'",
    logline_style: "Michael's [misguided plan] to [improve morale/impress someone] backfires when [cringe escalation], while Jim and Dwight [prank subplot]",
    structure_label: 'A-Plot cringe + B-Plot prank/romance + Talking Heads',
    transition_type: 'Talking head confessionals bridge scenes',
    scene_count: '3',
    dialogue_style: "Michael's obliviousness, Dwight's intensity, Jim's deadpan to camera, Kevin's simplicity",
    resolution_type: 'Cringe resolves with unexpected sincerity, small human moment',
    recurring_bit_style: "That's what she said, Jim's camera looks, Dwight's beet farm, Kevin's chili",
    custom_character_rules: 'New hire, client, or corporate visitor; reacts to Dunder Mifflin absurdity with horror',
  },
  'Seinfeld': {
    medium_type: 'Observational Sitcom',
    structure_type: 'sitcom_reset',
    pacing_type: 'rapid_fire',
    dynamics_type: 'selfish_ensemble',
    mechanics_type: 'satirical_deconstruction',
    thematic_mode: 'no_lesson',
    aesthetic_type: 'sitcom_multi',
    title_format: "'The [Noun]'",
    logline_style: "Jerry's [observation about minor thing] spirals when George [lies], Elaine [social faux pas], and Kramer [scheme], all converging",
    structure_label: 'Four parallel stories converge at punchline',
    transition_type: 'Coincidence and convergence',
    scene_count: '4',
    dialogue_style: "Jerry's observational setup, George's neurotic spiraling, Elaine's exasperation, Kramer's physical comedy entrances",
    resolution_type: 'All four stories collide in ironic conclusion, no hugging no learning',
    recurring_bit_style: "Kramer's entrance, 'Not that there's anything wrong with that', shrinkage, Festivus",
    custom_character_rules: "George's date, Jerry's girlfriend with one flaw, or Newman ally",
  },
  'Friends': {
    medium_type: 'Ensemble Sitcom',
    structure_type: 'sitcom_reset',
    pacing_type: 'rapid_fire',
    dynamics_type: 'found_family',
    mechanics_type: 'cringe_empathy',
    thematic_mode: 'earned_growth',
    aesthetic_type: 'sitcom_multi',
    title_format: "'The One Where [Brief description]'",
    logline_style: '[Character] [romantic/career crisis] while [other characters] [comic B-plot] at Central Perk',
    structure_label: 'A-Plot romance/drama + B-Plot comedy + Central Perk scenes',
    transition_type: 'Apartment/coffee shop scene alternation',
    scene_count: '3',
    dialogue_style: "Ross's pedantic corrections, Chandler's sarcasm, Joey's lovable ignorance, Monica's competitiveness, Phoebe's weirdness, Rachel's growth",
    resolution_type: 'Romantic progress or setback, group hug energy, warmth',
    recurring_bit_style: "Pivot!, 'We were on a break!', Joey doesn't share food, smelly cat",
    custom_character_rules: 'Love interest, annoying neighbor, or Central Perk regular; tests group dynamics',
  },

  // ── Anime ──────────────────────────────────────────────────
  'My Hero Academia': {
    medium_type: 'Shonen Anime',
    structure_type: 'shonen_arc',
    pacing_type: 'anime_beats',
    dynamics_type: 'found_family',
    mechanics_type: 'earnest_sincerity',
    thematic_mode: 'friendship_power',
    aesthetic_type: 'anime_sakuga',
    title_format: "'[Arc Name]' or '[Villain/Challenge] [Number]'",
    logline_style: "Class 1-A must [face challenge] as [villain] threatens [stakes], testing Deku's [new power/resolve]",
    structure_label: 'Training → Battle → Power-up → Speech → Climax',
    transition_type: 'Power escalation',
    scene_count: '3',
    dialogue_style: 'Internal monologues, shouting attack names, friendship declarations',
    resolution_type: "Villain defeated, new power mastered, 'Plus Ultra' moment",
    recurring_bit_style: "All Might advice flashback, classmates cheering, 'I am here!'",
    custom_character_rules: 'Rival student or temporary ally; has quirk; challenges or aids Deku',
  },
  'Naruto': {
    medium_type: 'Shonen Anime',
    structure_type: 'shonen_arc',
    pacing_type: 'anime_beats',
    dynamics_type: 'rival_friends',
    mechanics_type: 'earnest_sincerity',
    thematic_mode: 'friendship_power',
    aesthetic_type: 'anime_sakuga',
    title_format: "'[Jutsu name]' or '[Character]'s [Challenge]'",
    logline_style: "Naruto must [prove himself/save friend] when [enemy] threatens [village/bond], unlocking [new power] through [determination]",
    structure_label: 'Flashback → Battle → Talk-no-jutsu → Power-up → Victory',
    transition_type: 'Flashback motivation reveals',
    scene_count: '3',
    dialogue_style: "Naruto's 'believe it!' determination, Sasuke's brooding, villains with tragic backstories, sensei wisdom",
    resolution_type: "Enemy converted through empathy (talk-no-jutsu), bond of pain acknowledged",
    recurring_bit_style: "Rasengan charge-up, 'I never go back on my word', ramen scenes, shadow clone spam",
    custom_character_rules: 'Rival ninja, reformed villain, or fellow jinchuuriki; has unique jutsu and tragic past',
  },
  'Dragon Ball Z': {
    medium_type: 'Shonen Anime',
    structure_type: 'shonen_arc',
    pacing_type: 'anime_beats',
    dynamics_type: 'found_family',
    mechanics_type: 'earnest_sincerity',
    thematic_mode: 'friendship_power',
    aesthetic_type: 'anime_sakuga',
    title_format: "'[Saga Name]' or '[Power Level Reference]'",
    logline_style: "[Villain] arrives with [impossible power] forcing Goku to [train/transform] while [Z-Fighters buy time]",
    structure_label: 'Villain arrives → Fighters fall → Goku trains → New form → Spirit Bomb/Kamehameha',
    transition_type: 'Power level escalation and transformations',
    scene_count: '3',
    dialogue_style: "Screaming power-ups, Vegeta's pride monologues, Goku's simple wisdom, villain taunting",
    resolution_type: "New transformation defeats villain, planet saved, peaceful epilogue",
    recurring_bit_style: "'It's over 9000!', charging for 3 episodes, Krillin dying, Senzu beans",
    custom_character_rules: 'New fighter or reformed enemy; has unique fighting style, eventually joins Z-Fighters',
  },
  'One Piece': {
    medium_type: 'Shonen Adventure Anime',
    structure_type: 'shonen_arc',
    pacing_type: 'anime_beats',
    dynamics_type: 'found_family',
    mechanics_type: 'earnest_sincerity',
    thematic_mode: 'friendship_power',
    aesthetic_type: 'anime_sakuga',
    title_format: "'[Island/Arc Name]'",
    logline_style: "The Straw Hats arrive at [island] where [oppressed people] need saving from [villain with Devil Fruit power]",
    structure_label: 'Arrive → Discover injustice → Crew splits to fight commanders → Luffy vs Boss',
    transition_type: 'Crew split for parallel battles',
    scene_count: '4',
    dialogue_style: "Luffy's simple declarations of friendship, Zoro's cool one-liners, crew banter, villain monologues about power",
    resolution_type: "'I'm gonna be King of the Pirates!' Punch defeats tyrant, people freed, feast, sail away",
    recurring_bit_style: "Luffy's meat obsession, Sanji's nosebleeds, Zoro getting lost, bounty reveals",
    custom_character_rules: 'Island local, marine, or pirate; has Devil Fruit or unique skill; joins allies or is rescued',
  },
  'Attack on Titan': {
    medium_type: 'Dark Fantasy Anime',
    structure_type: 'noir_twist',
    pacing_type: 'slow_burn',
    dynamics_type: 'chosen_crew',
    mechanics_type: 'dramatic_irony',
    thematic_mode: 'ambiguous_bittersweet',
    aesthetic_type: 'anime_sakuga',
    title_format: "'[Ominous phrase]' or '[Chapter reference]'",
    logline_style: "The Survey Corps discovers [horrifying truth] that forces [moral choice] while [titan threat] demands [sacrifice]",
    structure_label: 'Revelation → Moral crisis → Battle → Devastating cost',
    transition_type: 'Mystery reveals recontextualize everything',
    scene_count: '3',
    dialogue_style: "Eren's rage declarations, Levi's cold efficiency, Armin's strategic thinking, monologues about freedom",
    resolution_type: 'Victory at terrible cost, moral ambiguity, cycle of violence continues',
    recurring_bit_style: "ODM gear action, titan transformations, 'Dedicate your hearts!', walls as metaphor",
    custom_character_rules: 'Survey Corps recruit or Marleyan warrior; has allegiance conflict; may not survive',
  },
  'Demon Slayer': {
    medium_type: 'Shonen Anime',
    structure_type: 'shonen_arc',
    pacing_type: 'anime_beats',
    dynamics_type: 'found_family',
    mechanics_type: 'earnest_sincerity',
    thematic_mode: 'earned_growth',
    aesthetic_type: 'anime_sakuga',
    title_format: "'[Breathing technique name]' or '[Arc location]'",
    logline_style: "Tanjiro faces [demon] who [tragic backstory] while protecting [Nezuko/allies] using [new breathing form]",
    structure_label: 'Encounter demon → Struggle → Flashback empathy → New technique → Victory with tears',
    transition_type: 'Breathing form reveals and demon backstory reveals',
    scene_count: '3',
    dialogue_style: "Tanjiro's compassion even for demons, Zenitsu's cowardly screaming, Inosuke's wild boasting, demon tragedy",
    resolution_type: "Demon defeated but mourned, Tanjiro acknowledges their pain, bittersweet",
    recurring_bit_style: "Water/fire breathing visuals, Nezuko's box, forehead scar glow, Total Concentration",
    custom_character_rules: 'Demon Slayer or sympathetic demon; has unique breathing style or blood demon art',
  },
  'Death Note': {
    medium_type: 'Psychological Thriller Anime',
    structure_type: 'noir_twist',
    pacing_type: 'slow_burn',
    dynamics_type: 'rival_friends',
    mechanics_type: 'dramatic_irony',
    thematic_mode: 'circular_poetry',
    aesthetic_type: 'anime_sakuga',
    title_format: "'[Abstract concept]'",
    logline_style: "Light devises [scheme to eliminate threat] while L [closes in with deduction], each move raising [moral stakes]",
    structure_label: 'Move → Counter-move → Revelation → Escalation',
    transition_type: 'Chess-like move/counter-move logic',
    scene_count: '3',
    dialogue_style: "Internal monologue chess, dramatic 'keikaku' reveals, philosophical debates about justice, Ryuk commentary",
    resolution_type: "One genius outmaneuvers the other, Pyrrhic victory, 'was it worth it?' question",
    recurring_bit_style: "Dramatic potato chip eating, Ryuk's apples, 'Just as planned', dramatic pen writing",
    custom_character_rules: 'New Kira suspect, task force member, or Shinigami; becomes piece in Light/L chess game',
  },

  // ── Movies ─────────────────────────────────────────────────
  'The Matrix': {
    medium_type: 'Sci-Fi Action Film',
    structure_type: 'monster_of_week',
    pacing_type: 'anime_beats',
    dynamics_type: 'chosen_crew',
    mechanics_type: 'meta_commentary',
    thematic_mode: 'earned_growth',
    aesthetic_type: 'gritty_real',
    title_format: "'[Philosophical concept]'",
    logline_style: "Neo must [overcome limitation] within the Matrix while [Agent threat] forces [crew] to [sacrifice]",
    structure_label: 'Red pill choice → Training → Betrayal → "I know kung fu" → Transcendence',
    transition_type: 'Reality/simulation transitions',
    scene_count: '3-4',
    dialogue_style: "Morpheus's philosophical speeches, Neo's 'whoa', Trinity's efficiency, Agent Smith's contempt for humanity",
    resolution_type: "'The One' realization, transcend the rules, new mission begins",
    recurring_bit_style: "Bullet time, 'There is no spoon', phone booth exits, green code rain",
    custom_character_rules: 'Freed mind or rogue program; has unique Matrix abilities; tests Neo\'s beliefs',
  },
  'Star Wars': {
    medium_type: 'Space Opera',
    structure_type: 'shonen_arc',
    pacing_type: 'anime_beats',
    dynamics_type: 'chosen_crew',
    mechanics_type: 'earnest_sincerity',
    thematic_mode: 'friendship_power',
    aesthetic_type: 'gritty_real',
    title_format: "'[The/A] [Dramatic noun]'",
    logline_style: "[Hero] must [face dark side temptation] while [rebellion/allies] fight [Empire's new weapon]",
    structure_label: 'Call to adventure → Training → Trial → Confrontation → Sacrifice/Victory',
    transition_type: 'Wipe transitions, parallel action cross-cutting',
    scene_count: '4',
    dialogue_style: "Yoda's inverted wisdom, 'I have a bad feeling about this', villain monologues about power, droid bickering",
    resolution_type: "Light triumphs through hope/love, not violence; celebration; new threat hinted",
    recurring_bit_style: "'May the Force be with you', lightsaber duels, hologram messages, trash compactor situations",
    custom_character_rules: 'Force-sensitive or smuggler; has own ship or unique skill; joins the cause reluctantly',
  },

  // ── Law & Order (from Kimi) ────────────────────────────────
  'Law & Order SVU': {
    medium_type: 'Procedural Drama',
    structure_type: 'mystery_procedural',
    pacing_type: 'procedural_steady',
    dynamics_type: 'workplace_hierarchy',
    mechanics_type: 'dramatic_irony',
    thematic_mode: 'earned_growth',
    aesthetic_type: 'gritty_real',
    title_format: "'[Single evocative word]'",
    logline_style: "When a [victim] is found [condition], Benson and the squad must [investigate] before [stakes escalate]",
    structure_label: 'Cold Open + 4 Acts',
    transition_type: 'Evidence reveals',
    scene_count: '4',
    dialogue_style: "Exposition-heavy, 'ripped from headlines', interrogation room confessions",
    resolution_type: 'Justice served or bittersweet, personal cost to detectives',
    recurring_bit_style: "Benson's empathy, Ice-T reaction, 'These guys are sick'",
    custom_character_rules: 'Victim, perp, or witness; drives case but not series regular',
  },
};

// ─── HELPER: Build narrative genome prompt for a show ────────
export function buildNarrativeGenome(showTitle: string): string | null {
  const genome = SHOW_GENOME_DATABASE[showTitle];
  if (!genome) return null;

  const structure = STRUCTURE_LIBRARY[genome.structure_type];
  const pacing = PACING_LIBRARY[genome.pacing_type];
  const dynamics = DYNAMICS_LIBRARY[genome.dynamics_type];
  const mechanics = MECHANICS_LIBRARY[genome.mechanics_type];
  const thematic = THEMATIC_LIBRARY[genome.thematic_mode];
  const aesthetic = AESTHETIC_LIBRARY[genome.aesthetic_type];

  return `## NARRATIVE GENOME: ${showTitle}

### CORE STRUCTURE: ${structure?.label || genome.structure_type}
${structure?.description || ''}

### PACING: ${pacing?.label || genome.pacing_type}
${pacing?.description || ''}

### CHARACTER DYNAMICS: ${dynamics?.label || genome.dynamics_type}
${dynamics?.description || ''}

### TONE MECHANICS: ${mechanics?.label || genome.mechanics_type}
${mechanics?.description || ''}

### THEMATIC MODE: ${thematic?.label || genome.thematic_mode}
${thematic?.description || ''}

### AESTHETIC: ${aesthetic?.label || genome.aesthetic_type}
${aesthetic?.description || ''}

## SHOW-SPECIFIC RULES
- Title format: ${genome.title_format}
- Logline style: ${genome.logline_style}
- Scene count: ${genome.scene_count}
- Dialogue style: ${genome.dialogue_style}
- Resolution type: ${genome.resolution_type}
- Running element: ${genome.recurring_bit_style}
- Custom character rules: ${genome.custom_character_rules}`;
}

// ─── HELPER: Build full system prompt for script generation ──
export function buildShowWriterPrompt(showTitle: string, userTopic: string, customCharacter?: string, era?: string): string {
  const genome = SHOW_GENOME_DATABASE[showTitle];
  if (!genome) {
    return `You are a talented script writer. Write an episode/scene about: ${userTopic}`;
  }

  const narrativeGenome = buildNarrativeGenome(showTitle)!;

  let prompt = `SYSTEM ROLE: You are a master narrative architect specializing in ${genome.medium_type}. Your task is to generate episode outlines and scripts that perfectly replicate the formulaic DNA of ${showTitle} using the structural parameters below.

${narrativeGenome}`;

  if (customCharacter) {
    prompt += `\n\n## CUSTOM CHARACTER INTEGRATION\n${genome.custom_character_rules}\nCharacter details: ${customCharacter}`;
  } else {
    prompt += '\n\n## CUSTOM CHARACTER\nNone provided. Use only established series regulars.';
  }

  if (era) {
    prompt += `\n\n## ERA/SEASON CONTEXT\nWrite in the style of ${era}.`;
  }

  prompt += `\n\n## USER TOPIC\n${userTopic}

## OUTPUT FORMAT
1. **TITLE** (${genome.title_format})
2. **LOGLINE** (${genome.logline_style})
3. **STRUCTURE** (${genome.structure_label} using ${genome.transition_type} logic)
4. **KEY SCENES** (${genome.scene_count} scenes, ${genome.dialogue_style})
5. **THEMATIC RESOLUTION** (${genome.resolution_type})
6. **RUNNING ELEMENT** (${genome.recurring_bit_style})

Generate now following ${showTitle} formula exactly.`;

  return prompt;
}
