'use client';
// components/create/CreationWizard.tsx
// Full guided creation pipeline: Pick IP → Character → Prompt → Script → Storyboard → Generate → Result
// Phase 2: Enhanced pipeline with AI script generation, fal.ai images, and video generation
import { useState, useEffect, useRef, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════════

export interface MediaItem {
  id: string;
  title: string;
  category: 'TV Show' | 'Movie' | 'Custom';
  year: string;
  genre: string;
  emoji: string;
  gradient: string;
}

interface CharacterOption {
  id: string;
  name: string;
  role: string;
  emoji: string;
  isCustom?: boolean;
  imageUrl?: string | null;
  tmdbId?: number;
}

interface ScriptDialogue {
  character: string;
  line: string;
  direction?: string;
}

interface ScriptScene {
  sceneNum: number;
  heading: string;
  description: string;
  action: string;
  dialogue: ScriptDialogue[];
  duration: string;
  mood: string;
  cameraNote: string;
}

interface StoryboardScene {
  id: string;
  sceneNum: number;
  description: string;
  duration: string;
  visual: string;
  emoji: string;
}

type WizardStep = 'character' | 'prompt' | 'script' | 'storyboard' | 'generating' | 'review-images' | 'review-videos' | 'result';

interface Props {
  user: User;
  selectedMedia: MediaItem;
  onClose: () => void;
  onOpenEditor: (resultData: ResultData) => void;
}

interface ResultData {
  title: string;
  media: MediaItem;
  character: CharacterOption;
  prompt: string;
  tone: string;
  format: string;
  scenes: StoryboardScene[];
  scriptScenes?: ScriptScene[];
  videoUrl?: string;
  thumbnailUrl?: string;
}

// ═══════════════════════════════════════════════════════════════
//  CHARACTER DATABASES (per show/movie)
// ═══════════════════════════════════════════════════════════════

const CHARACTER_DB: Record<string, CharacterOption[]> = {
  // ── TV Shows: Drama / Crime ──
  'Breaking Bad':     [{ id: 'bb1', name: 'Walter White', role: 'Chemistry Teacher / Heisenberg', emoji: '🧪' }, { id: 'bb2', name: 'Jesse Pinkman', role: 'Partner in Crime', emoji: '🎒' }, { id: 'bb3', name: 'Gus Fring', role: 'The Chicken Man', emoji: '🍗' }, { id: 'bb4', name: 'Saul Goodman', role: 'Criminal Lawyer', emoji: '⚖️' }, { id: 'bb5', name: 'Mike Ehrmantraut', role: 'The Fixer', emoji: '🔫' }],
  'Game of Thrones':  [{ id: 'gt1', name: 'Daenerys Targaryen', role: 'Mother of Dragons', emoji: '🐉' }, { id: 'gt2', name: 'Jon Snow', role: 'King in the North', emoji: '🐺' }, { id: 'gt3', name: 'Tyrion Lannister', role: 'The Imp', emoji: '🍷' }, { id: 'gt4', name: 'Arya Stark', role: 'No One', emoji: '🗡️' }, { id: 'gt5', name: 'Cersei Lannister', role: 'The Queen', emoji: '👑' }],
  'The Sopranos':     [{ id: 'sp1', name: 'Tony Soprano', role: 'Mob Boss', emoji: '🤌' }, { id: 'sp2', name: 'Carmela Soprano', role: 'The Wife', emoji: '💍' }, { id: 'sp3', name: 'Christopher Moltisanti', role: 'The Protégé', emoji: '🎬' }, { id: 'sp4', name: 'Dr. Melfi', role: 'The Therapist', emoji: '📋' }],
  'The Wire':         [{ id: 'tw1', name: 'Jimmy McNulty', role: 'Rogue Detective', emoji: '🔍' }, { id: 'tw2', name: 'Omar Little', role: 'The Robin Hood', emoji: '🎯' }, { id: 'tw3', name: 'Avon Barksdale', role: 'Drug Kingpin', emoji: '👑' }, { id: 'tw4', name: 'Stringer Bell', role: 'The Businessman', emoji: '📊' }],
  'Peaky Blinders':   [{ id: 'pb1', name: 'Thomas Shelby', role: 'Boss of the Peaky Blinders', emoji: '🎩' }, { id: 'pb2', name: 'Arthur Shelby', role: 'The Enforcer', emoji: '👊' }, { id: 'pb3', name: 'Polly Gray', role: 'The Matriarch', emoji: '🔮' }, { id: 'pb4', name: 'Alfie Solomons', role: 'Jewish Gang Leader', emoji: '🥊' }],
  'Better Call Saul': [{ id: 'bc1', name: 'Jimmy McGill / Saul', role: 'Slippin\' Jimmy', emoji: '⚖️' }, { id: 'bc2', name: 'Kim Wexler', role: 'The Partner', emoji: '📑' }, { id: 'bc3', name: 'Nacho Varga', role: 'Double Agent', emoji: '🎭' }, { id: 'bc4', name: 'Lalo Salamanca', role: 'Charismatic Villain', emoji: '😈' }],
  'Ozark':            [{ id: 'oz1', name: 'Marty Byrde', role: 'Money Launderer', emoji: '💰' }, { id: 'oz2', name: 'Wendy Byrde', role: 'The Ambitious Wife', emoji: '🏛️' }, { id: 'oz3', name: 'Ruth Langmore', role: 'The Local', emoji: '🔥' }],
  'Succession':       [{ id: 'su1', name: 'Logan Roy', role: 'The Patriarch', emoji: '🦁' }, { id: 'su2', name: 'Kendall Roy', role: 'The Heir', emoji: '💊' }, { id: 'su3', name: 'Shiv Roy', role: 'The Daughter', emoji: '👩‍💼' }, { id: 'su4', name: 'Roman Roy', role: 'The Youngest', emoji: '🤡' }],
  // ── TV Shows: Sci-Fi / Fantasy / Horror ──
  'Stranger Things':  [{ id: 'st1', name: 'Eleven', role: 'Psychokinetic Hero', emoji: '🧇' }, { id: 'st2', name: 'Dustin Henderson', role: 'The Brains', emoji: '🧢' }, { id: 'st3', name: 'Steve Harrington', role: 'Babysitter King', emoji: '🦇' }, { id: 'st4', name: 'Vecna', role: 'The Villain', emoji: '🕰️' }, { id: 'st5', name: 'Hopper', role: 'The Chief', emoji: '🚔' }],
  'The Last of Us':   [{ id: 'tl1', name: 'Joel Miller', role: 'Smuggler / Protector', emoji: '🔨' }, { id: 'tl2', name: 'Ellie Williams', role: 'The Immune One', emoji: '🍄' }, { id: 'tl3', name: 'Tess', role: 'Joel\'s Partner', emoji: '💪' }],
  'The Mandalorian':  [{ id: 'mn1', name: 'Din Djarin', role: 'The Mandalorian', emoji: '⚔️' }, { id: 'mn2', name: 'Grogu', role: 'The Child', emoji: '💚' }, { id: 'mn3', name: 'Bo-Katan', role: 'Mandalore Royalty', emoji: '👸' }, { id: 'mn4', name: 'Moff Gideon', role: 'Imperial Villain', emoji: '🦹' }],
  'Wednesday':        [{ id: 'wd1', name: 'Wednesday Addams', role: 'Nevermore Detective', emoji: '🖤' }, { id: 'wd2', name: 'Enid Sinclair', role: 'Bubbly Werewolf', emoji: '🐺' }, { id: 'wd3', name: 'Thing', role: 'Helpful Hand', emoji: '🫳' }, { id: 'wd4', name: 'Tyler Galpin', role: 'Barista with Secrets', emoji: '☕' }],
  'The Walking Dead': [{ id: 'wk1', name: 'Rick Grimes', role: 'The Leader', emoji: '🤠' }, { id: 'wk2', name: 'Daryl Dixon', role: 'The Tracker', emoji: '🏹' }, { id: 'wk3', name: 'Negan', role: 'The Villain', emoji: '🏏' }, { id: 'wk4', name: 'Michonne', role: 'The Samurai', emoji: '⚔️' }],
  'Black Mirror':     [{ id: 'bm1', name: 'Custom Character', role: 'Choose your own', emoji: '📱', isCustom: true }],
  'Westworld':        [{ id: 'ww1', name: 'Dolores Abernathy', role: 'The Awakened Host', emoji: '🤖' }, { id: 'ww2', name: 'Maeve Millay', role: 'The Madam', emoji: '🎭' }, { id: 'ww3', name: 'Bernard Lowe', role: 'The Creator', emoji: '🧠' }, { id: 'ww4', name: 'Man in Black', role: 'The Player', emoji: '🖤' }],
  'The Witcher':      [{ id: 'wt1', name: 'Geralt of Rivia', role: 'The Witcher', emoji: '⚔️' }, { id: 'wt2', name: 'Yennefer', role: 'Sorceress of Vengerberg', emoji: '🔮' }, { id: 'wt3', name: 'Ciri', role: 'The Lion Cub', emoji: '🦁' }, { id: 'wt4', name: 'Jaskier', role: 'The Bard', emoji: '🎶' }],
  'House of the Dragon': [{ id: 'hd1', name: 'Rhaenyra Targaryen', role: 'The Heir', emoji: '🐉' }, { id: 'hd2', name: 'Daemon Targaryen', role: 'The Rogue Prince', emoji: '⚔️' }, { id: 'hd3', name: 'Alicent Hightower', role: 'The Queen', emoji: '👑' }],
  // ── TV Shows: Comedy ──
  'The Office':       [{ id: 'of1', name: 'Michael Scott', role: 'World\'s Best Boss', emoji: '🏆' }, { id: 'of2', name: 'Dwight Schrute', role: 'Assistant (to the) Regional Manager', emoji: '🥬' }, { id: 'of3', name: 'Jim Halpert', role: 'The Prankster', emoji: '😏' }, { id: 'of4', name: 'Kevin Malone', role: 'Accountant / Chili Expert', emoji: '🍲' }],
  'Friends':          [{ id: 'fr1', name: 'Ross Geller', role: 'The Paleontologist', emoji: '🦕' }, { id: 'fr2', name: 'Rachel Green', role: 'The Fashionista', emoji: '👗' }, { id: 'fr3', name: 'Joey Tribbiani', role: 'The Actor', emoji: '🍕' }, { id: 'fr4', name: 'Chandler Bing', role: 'The Funny One', emoji: '😂' }],
  'Seinfeld':         [{ id: 'se1', name: 'Jerry Seinfeld', role: 'The Comedian', emoji: '🎤' }, { id: 'se2', name: 'George Costanza', role: 'The Neurotic', emoji: '😤' }, { id: 'se3', name: 'Elaine Benes', role: 'The No-Nonsense', emoji: '💅' }, { id: 'se4', name: 'Cosmo Kramer', role: 'The Wild Card', emoji: '🤪' }],
  "It's Always Sunny": [{ id: 'as1', name: 'Dennis Reynolds', role: 'The Golden God', emoji: '😎' }, { id: 'as2', name: 'Charlie Kelly', role: 'The Wild Card', emoji: '🐀' }, { id: 'as3', name: 'Frank Reynolds', role: 'The Dirty One', emoji: '💰' }, { id: 'as4', name: 'Sweet Dee', role: 'The Bird', emoji: '🦅' }],
  'Parks and Recreation': [{ id: 'pr1', name: 'Leslie Knope', role: 'Deputy Director', emoji: '📋' }, { id: 'pr2', name: 'Ron Swanson', role: 'Woodworking Libertarian', emoji: '🥩' }, { id: 'pr3', name: 'Andy Dwyer', role: 'Shoe-Shiner / Rockstar', emoji: '🎸' }],
  // ── TV Shows: Animated ──
  'The Simpsons':     [{ id: 'sm1', name: 'Homer Simpson', role: 'Nuclear Safety Inspector', emoji: '🍩' }, { id: 'sm2', name: 'Bart Simpson', role: 'The Troublemaker', emoji: '📛' }, { id: 'sm3', name: 'Marge Simpson', role: 'The Mom', emoji: '💙' }],
  'South Park':       [{ id: 'sp1', name: 'Eric Cartman', role: 'The Manipulator', emoji: '😡' }, { id: 'sp2', name: 'Kenny McCormick', role: 'The Immortal', emoji: '🧡' }, { id: 'sp3', name: 'Randy Marsh', role: 'The Dad', emoji: '🍷' }],
  'Rick and Morty':   [{ id: 'rm1', name: 'Rick Sanchez', role: 'Genius Scientist', emoji: '🧪' }, { id: 'rm2', name: 'Morty Smith', role: 'Reluctant Sidekick', emoji: '😰' }, { id: 'rm3', name: 'Mr. Meeseeks', role: 'Existence is Pain', emoji: '🔵' }],
  'Family Guy':       [{ id: 'fg1', name: 'Peter Griffin', role: 'Family Man', emoji: '🍺' }, { id: 'fg2', name: 'Stewie Griffin', role: 'Evil Baby Genius', emoji: '🧠' }, { id: 'fg3', name: 'Brian Griffin', role: 'The Dog / Writer', emoji: '🐕' }],
  // ── Anime ──
  'Naruto':            [{ id: 'na1', name: 'Naruto Uzumaki', role: 'Future Hokage', emoji: '🍥' }, { id: 'na2', name: 'Sasuke Uchiha', role: 'The Avenger', emoji: '⚡' }, { id: 'na3', name: 'Kakashi Hatake', role: 'Copy Ninja', emoji: '📖' }],
  'One Piece':         [{ id: 'op1', name: 'Monkey D. Luffy', role: 'Future Pirate King', emoji: '🏴‍☠️' }, { id: 'op2', name: 'Roronoa Zoro', role: 'Three-Sword Style', emoji: '⚔️' }, { id: 'op3', name: 'Nami', role: 'Navigator', emoji: '🗺️' }],
  'Attack on Titan':   [{ id: 'at1', name: 'Eren Yeager', role: 'The Attack Titan', emoji: '💢' }, { id: 'at2', name: 'Mikasa Ackerman', role: 'The Protector', emoji: '🗡️' }, { id: 'at3', name: 'Levi Ackerman', role: 'Humanity\'s Strongest', emoji: '⚔️' }],
  'Demon Slayer':      [{ id: 'ds1', name: 'Tanjiro Kamado', role: 'Water Breathing Slayer', emoji: '💧' }, { id: 'ds2', name: 'Nezuko Kamado', role: 'The Demon Sister', emoji: '🎋' }, { id: 'ds3', name: 'Zenitsu Agatsuma', role: 'Thunder Breathing', emoji: '⚡' }],
  'Death Note':        [{ id: 'dn1', name: 'Light Yagami', role: 'Kira', emoji: '📓' }, { id: 'dn2', name: 'L Lawliet', role: 'World\'s Greatest Detective', emoji: '🍬' }, { id: 'dn3', name: 'Ryuk', role: 'The Shinigami', emoji: '🍎' }],
  'Dragon Ball Z':     [{ id: 'db1', name: 'Goku', role: 'Super Saiyan', emoji: '🟡' }, { id: 'db2', name: 'Vegeta', role: 'Prince of All Saiyans', emoji: '👑' }, { id: 'db3', name: 'Frieza', role: 'Emperor of the Universe', emoji: '👿' }],
  'My Hero Academia':  [{ id: 'mh1', name: 'Izuku Midoriya', role: 'One For All', emoji: '💚' }, { id: 'mh2', name: 'Katsuki Bakugo', role: 'Explosion Hero', emoji: '💥' }, { id: 'mh3', name: 'All Might', role: 'Symbol of Peace', emoji: '💪' }],
  // ── Movies ──
  'The Dark Knight':   [{ id: 'dk1', name: 'Batman / Bruce Wayne', role: 'The Dark Knight', emoji: '🦇' }, { id: 'dk2', name: 'Joker', role: 'Agent of Chaos', emoji: '🃏' }, { id: 'dk3', name: 'Harvey Dent', role: 'Two-Face', emoji: '🪙' }],
  'Avengers: Endgame': [{ id: 'ae1', name: 'Tony Stark', role: 'Iron Man', emoji: '🤖' }, { id: 'ae2', name: 'Steve Rogers', role: 'Captain America', emoji: '🛡️' }, { id: 'ae3', name: 'Thor', role: 'God of Thunder', emoji: '⚡' }, { id: 'ae4', name: 'Thanos', role: 'The Mad Titan', emoji: '💜' }],
  'Spider-Verse':      [{ id: 'sv1', name: 'Miles Morales', role: 'Spider-Man', emoji: '🕷️' }, { id: 'sv2', name: 'Gwen Stacy', role: 'Spider-Gwen', emoji: '🩰' }, { id: 'sv3', name: 'Miguel O\'Hara', role: 'Spider-Man 2099', emoji: '🔴' }],
  'The Matrix':        [{ id: 'mx1', name: 'Neo', role: 'The One', emoji: '💊' }, { id: 'mx2', name: 'Morpheus', role: 'The Guide', emoji: '🕶️' }, { id: 'mx3', name: 'Agent Smith', role: 'The System', emoji: '🤵' }],
  'Pulp Fiction':      [{ id: 'pf1', name: 'Vincent Vega', role: 'Hitman', emoji: '💈' }, { id: 'pf2', name: 'Jules Winnfield', role: 'The Philosophical Hitman', emoji: '🍔' }, { id: 'pf3', name: 'Mia Wallace', role: 'The Boss\'s Wife', emoji: '💃' }],
  'The Godfather':     [{ id: 'gf1', name: 'Vito Corleone', role: 'The Godfather', emoji: '🌹' }, { id: 'gf2', name: 'Michael Corleone', role: 'The Heir', emoji: '🔫' }, { id: 'gf3', name: 'Sonny Corleone', role: 'The Hotheaded Son', emoji: '💢' }],
  'John Wick':         [{ id: 'jw1', name: 'John Wick', role: 'Baba Yaga', emoji: '🐶' }, { id: 'jw2', name: 'Winston', role: 'Continental Manager', emoji: '🎩' }, { id: 'jw3', name: 'Bowery King', role: 'Underground Leader', emoji: '🕊️' }],
  'Inception':         [{ id: 'ic1', name: 'Dom Cobb', role: 'The Extractor', emoji: '🎡' }, { id: 'ic2', name: 'Arthur', role: 'The Point Man', emoji: '🎯' }, { id: 'ic3', name: 'Mal', role: 'The Shade', emoji: '💀' }],
  'Interstellar':      [{ id: 'is1', name: 'Cooper', role: 'The Pilot', emoji: '🚀' }, { id: 'is2', name: 'Dr. Brand', role: 'The Scientist', emoji: '🔬' }, { id: 'is3', name: 'TARS', role: 'The Robot', emoji: '🤖' }],
  'Star Wars':         [{ id: 'sw1', name: 'Luke Skywalker', role: 'Jedi Knight', emoji: '⚔️' }, { id: 'sw2', name: 'Darth Vader', role: 'The Dark Lord', emoji: '🖤' }, { id: 'sw3', name: 'Han Solo', role: 'The Smuggler', emoji: '🔫' }, { id: 'sw4', name: 'Princess Leia', role: 'Rebel Leader', emoji: '👸' }],
};

// ── Tone & Format Presets ─────────────────────────────────────
const TONES = [
  { id: 'dramatic',   label: 'Dramatic',     emoji: '🎭' },
  { id: 'comedic',    label: 'Comedic',      emoji: '😂' },
  { id: 'horror',     label: 'Horror',       emoji: '👻' },
  { id: 'action',     label: 'Action',       emoji: '💥' },
  { id: 'romantic',   label: 'Romantic',     emoji: '❤️' },
  { id: 'mystery',    label: 'Mystery',      emoji: '🔍' },
  { id: 'scifi',      label: 'Sci-Fi',       emoji: '🚀' },
  { id: 'wholesome',  label: 'Wholesome',    emoji: '🥰' },
  { id: 'dark',       label: 'Dark / Gritty', emoji: '🌑' },
  { id: 'absurd',     label: 'Absurdist',    emoji: '🤪' },
];

const FORMATS = [
  { id: 'short',     label: 'Short (15-60s)',  desc: 'TikTok / Reels / Shorts', emoji: '📱' },
  { id: 'scene',     label: 'Scene (1-3 min)', desc: 'Key moment / clip', emoji: '🎬' },
  { id: 'episode',   label: 'Episode (5-15 min)', desc: 'Full fan episode', emoji: '📺' },
  { id: 'music_vid', label: 'Music Video',     desc: 'Soundtrack + visuals', emoji: '🎵' },
  { id: 'trailer',   label: 'Trailer',         desc: 'Hype / teaser', emoji: '🎞️' },
];

// ── Art Style Presets ────────────────────────────────────────────
const STYLES = [
  { id: 'cinematic',   label: 'Cinematic',     emoji: '🎬', prompt: 'cinematic film still, professional cinematography, dramatic lighting, shallow depth of field, anamorphic lens, color graded' },
  { id: 'anime',       label: 'Anime',         emoji: '🌸', prompt: 'anime style, Studio Ghibli inspired, vibrant colors, detailed cel shading, Japanese animation' },
  { id: 'comic',       label: 'Comic Book',    emoji: '💥', prompt: 'comic book art style, bold outlines, halftone dots, vibrant panels, dynamic composition, speech bubble aesthetic' },
  { id: 'photorealistic', label: 'Photorealistic', emoji: '📷', prompt: 'photorealistic, ultra HD, 8k, raw photo, hyperrealistic detail, natural lighting' },
  { id: 'watercolor',  label: 'Watercolor',    emoji: '🎨', prompt: 'watercolor painting, soft edges, flowing colors, artistic brush strokes, paper texture' },
  { id: 'noir',        label: 'Film Noir',     emoji: '🌑', prompt: 'film noir style, high contrast black and white, dramatic shadows, venetian blinds lighting, 1940s aesthetic' },
  { id: '3d_render',   label: '3D Render',     emoji: '🧊', prompt: '3D rendered, Pixar quality, subsurface scattering, global illumination, octane render' },
  { id: 'retro',       label: 'Retro/VHS',     emoji: '📼', prompt: 'retro VHS aesthetic, scan lines, chromatic aberration, 80s color palette, CRT screen effect' },
  { id: 'pixel',       label: 'Pixel Art',     emoji: '👾', prompt: '16-bit pixel art style, retro game aesthetic, clean pixel work, limited color palette' },
  { id: 'oil_paint',   label: 'Oil Painting',  emoji: '🖼️', prompt: 'oil painting masterpiece, rich impasto texture, museum quality, classical fine art composition' },
];

// ── Aspect Ratios ────────────────────────────────────────────────
const ASPECT_RATIOS = [
  { id: '16:9',  label: '16:9',  desc: 'YouTube / Widescreen',  emoji: '🖥️', width: 1024, height: 576 },
  { id: '9:16',  label: '9:16',  desc: 'TikTok / Reels / Shorts', emoji: '📱', width: 576, height: 1024 },
  { id: '1:1',   label: '1:1',   desc: 'Instagram / Twitter',   emoji: '⬛', width: 1024, height: 1024 },
  { id: '4:3',   label: '4:3',   desc: 'Classic TV',            emoji: '📺', width: 1024, height: 768 },
  { id: '21:9',  label: '21:9',  desc: 'Ultra-Wide / Cinema',   emoji: '🎞️', width: 1024, height: 440 },
];

// ── fal.ai Image Models ──────────────────────────────────────────
const IMAGE_MODELS = [
  { id: 'flux-schnell', name: 'Flux Schnell',   desc: 'Fast & free',       emoji: '⚡', tier: 'free' },
  { id: 'sdxl',         name: 'Stable Diffusion XL', desc: 'Classic SDXL', emoji: '🖼️', tier: 'free' },
  { id: 'flux-dev',     name: 'Flux 2 Dev',     desc: 'High quality',      emoji: '🎨', tier: 'starter' },
  { id: 'ideogram',     name: 'Ideogram 3.0',   desc: 'Best text rendering', emoji: '✏️', tier: 'starter' },
  { id: 'flux-pro',     name: 'Flux 2 Pro',     desc: 'Best photorealism', emoji: '📸', tier: 'creator' },
  { id: 'recraft',      name: 'Recraft V3',     desc: 'Professional design', emoji: '🎯', tier: 'creator' },
];

// ── Video Models ─────────────────────────────────────────────────
const VIDEO_MODELS = [
  { id: 'wan',      name: 'Wan 2.6',         desc: 'Affordable quality', emoji: '🎬', tier: 'starter' },
  { id: 'ltx-video', name: 'LTX Video 2.0',  desc: 'Fast & cheap',      emoji: '⚡', tier: 'starter' },
  { id: 'seedance', name: 'Seedance 1.5 Pro', desc: 'Best motion',      emoji: '💃', tier: 'creator' },
  { id: 'kling',    name: 'Kling 2.6 Pro',   desc: 'Professional',      emoji: '🎥', tier: 'creator' },
  { id: 'hailuo',   name: 'Hailuo 2.3',      desc: 'Realistic motion',  emoji: '🌊', tier: 'creator' },
  { id: 'seedance-2', name: 'Seedance 2',     desc: 'Cinematic + audio', emoji: '🎭', tier: 'creator' },
  { id: 'kling-3',  name: 'Kling 3.0 Pro',   desc: 'Top-tier cinematic', emoji: '🏆', tier: 'creator' },
];

// ═══════════════════════════════════════════════════════════════
//  MAIN WIZARD COMPONENT
// ═══════════════════════════════════════════════════════════════

export function CreationWizard({ user, selectedMedia, onClose, onOpenEditor }: Props) {
  const [step, setStep] = useState<WizardStep>('character');

  // ── Character selection ──
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterOption | null>(null);
  const [customCharName, setCustomCharName]       = useState('');
  const [customCharRole, setCustomCharRole]       = useState('');
  const [showCustomForm, setShowCustomForm]       = useState(false);

  // ── Custom IP / Mashup mode ──
  const [isCustomIP, setIsCustomIP]   = useState(selectedMedia.category === 'Custom');
  const [isMashup, setIsMashup]       = useState(false);
  const [customIPName, setCustomIPName]   = useState('');
  const [customIPGenre, setCustomIPGenre] = useState('');
  const [customIPDesc, setCustomIPDesc]   = useState('');
  const [mashupShows, setMashupShows]     = useState<string[]>(['', '']);

  // ── Prompt details ──
  const [prompt, setPrompt]       = useState('');
  const [tone, setTone]           = useState('dramatic');
  const [format, setFormat]       = useState('short');
  const [crossover, setCrossover] = useState('');

  // ── AI Q&A (vidmuse-style refinement) ──
  const [aiQuestions, setAiQuestions]   = useState<{ q: string; a: string }[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [questionPhase, setQuestionPhase] = useState(0);

  // ── Script (NEW in Phase 2) ──
  const [scriptScenes, setScriptScenes] = useState<ScriptScene[]>([]);
  const [scriptTitle, setScriptTitle]   = useState('');
  const [scriptLogline, setScriptLogline] = useState('');
  const [scriptLoading, setScriptLoading] = useState(false);
  const [scriptError, setScriptError]     = useState('');
  const [editingScript, setEditingScript] = useState<number | null>(null);
  const [scriptEditText, setScriptEditText] = useState('');

  // ── Storyboard ──
  const [scenes, setScenes]             = useState<StoryboardScene[]>([]);
  const [editingScene, setEditingScene] = useState<string | null>(null);
  const [sceneEditText, setSceneEditText] = useState('');

  // ── Generation progress ──
  const [genProgress, setGenProgress]   = useState(0);
  const [genStage, setGenStage]         = useState('');

  // ── Result ──
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareToast, setShareToast] = useState('');

  // ── Image generation config ──
  const [imageModel, setImageModel] = useState('flux-schnell');
  const [storyboardLoading, setStoryboardLoading] = useState(false);
  const [storyboardError, setStoryboardError] = useState('');
  const [sceneImages, setSceneImages] = useState<Record<string, string>>({});
  const [sceneImageUrls, setSceneImageUrls] = useState<Record<string, string>>({});
  const [genError, setGenError] = useState('');

  // ── Art & aspect config ──
  const [artStyle, setArtStyle]           = useState('cinematic');
  const [aspectRatio, setAspectRatio]     = useState('16:9');
  const [negativePrompt, setNegativePrompt] = useState('blurry, low quality, distorted, watermark, text, ugly, deformed');
  const [showAdvanced, setShowAdvanced]   = useState(false);
  const [genElapsed, setGenElapsed]       = useState(0);
  const [sceneNarration, setSceneNarration] = useState<Record<string, string>>({});
  const [narrationLoading, setNarrationLoading] = useState(false);
  const [regeneratingScene, setRegeneratingScene] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Video generation (NEW in Phase 2) ──
  const [videoModel, setVideoModel] = useState('wan');
  const [sceneVideos, setSceneVideos] = useState<Record<string, string>>({});
  const [videoGenerating, setVideoGenerating] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoStage, setVideoStage] = useState('');
  const [videoError, setVideoError] = useState('');
  const [showVideoGen, setShowVideoGen] = useState(false);

  // ── Parallel batch runner (Showrunner-style concurrency) ──────
  // Runs tasks in batches of `concurrency`, calling `onProgress` after each.
  async function runParallelBatches<T, R>(
    items: T[],
    task: (item: T, index: number) => Promise<R>,
    { concurrency = 3, onProgress }: { concurrency?: number; onProgress?: (completed: number, total: number, result: R | null, index: number, error?: string) => void } = {}
  ): Promise<(R | null)[]> {
    const results: (R | null)[] = new Array(items.length).fill(null);
    let completed = 0;

    for (let batchStart = 0; batchStart < items.length; batchStart += concurrency) {
      const batch = items.slice(batchStart, batchStart + concurrency);
      const batchPromises = batch.map(async (item, batchIdx) => {
        const globalIdx = batchStart + batchIdx;
        try {
          const result = await task(item, globalIdx);
          results[globalIdx] = result;
          completed++;
          onProgress?.(completed, items.length, result, globalIdx);
          return result;
        } catch (err: any) {
          completed++;
          onProgress?.(completed, items.length, null, globalIdx, err?.message || String(err));
          console.error(`Parallel task ${globalIdx + 1} failed:`, err);
          return null;
        }
      });
      await Promise.allSettled(batchPromises);
    }
    return results;
  }

  // ── TMDB Characters (real images, full cast) ──
  const [tmdbCharacters, setTmdbCharacters] = useState<CharacterOption[]>([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [charSearch, setCharSearch] = useState('');
  const charScrollRef = useRef<HTMLDivElement>(null);

  // Fetch FULL cast from TMDB API on mount
  useEffect(() => {
    if (isCustomIP || !selectedMedia?.id) return;
    setTmdbLoading(true);
    fetch(`/api/tmdb?action=cast&id=${selectedMedia.id}&v=2`, { cache: 'no-cache' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.characters?.length) {
          setTmdbCharacters(data.characters.map((c: any) => ({
            id: c.id,
            name: c.character || c.name,   // Show CHARACTER name (e.g. "Walter White"), not actor
            role: c.name ? `Played by ${c.name}` : '',  // Actor name as subtitle
            emoji: '🎭',
            imageUrl: c.imageUrl,
            tmdbId: c.tmdbId,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setTmdbLoading(false));
  }, [selectedMedia?.id, isCustomIP]);

  // Use TMDB characters if available, fall back to CHARACTER_DB
  const fallbackChars = CHARACTER_DB[selectedMedia.title] || [];
  const allCharacters = tmdbCharacters.length > 0 ? tmdbCharacters : fallbackChars;

  // Filter by search
  const characters = charSearch
    ? allCharacters.filter(c =>
        c.name.toLowerCase().includes(charSearch.toLowerCase()) ||
        c.role.toLowerCase().includes(charSearch.toLowerCase())
      )
    : allCharacters;

  // Display title
  const displayTitle = isCustomIP ? (customIPName || 'Your Original IP') : isMashup ? (mashupShows.filter(Boolean).join(' × ') || 'Mashup') : selectedMedia.title;

  // ── Step progression ──
  const STEP_ORDER: WizardStep[] = ['character', 'prompt', 'script', 'storyboard', 'generating', 'review-images', 'review-videos', 'result'];
  const stepIndex = STEP_ORDER.indexOf(step);

  // ── AI Questions (vidmuse-style) ──
  const AI_QUESTIONS = isCustomIP ? [
    `Tell us about your original IP — what's the world, the rules, the vibe?`,
    `What's the main conflict or inciting incident in your story?`,
    `Describe the look and feel — dark and gritty? Colorful and whimsical? Retro-futuristic?`,
  ] : isMashup ? [
    `How do the worlds of ${mashupShows.filter(Boolean).join(' and ')} collide? What brings them together?`,
    `Which characters meet and what's the dynamic — allies, rivals, frenemies?`,
    `What's the tone of this crossover — epic showdown, comedy of errors, or something else?`,
  ] : [
    `What's the main conflict or twist in your ${selectedMedia.title} reimagining?`,
    `How does ${selectedCharacter?.name || 'the character'} react to the situation? What emotions drive them?`,
    `Describe the setting — is it the original world, a new universe, or a mashup?`,
  ];

  // ═══════════════════════════════════════════════════════════════
  //  AI GENERATION FUNCTIONS
  // ═══════════════════════════════════════════════════════════════

  // ── Generate Script (Phase 2 — with retry + timeout) ──────────
  async function generateScript() {
    setScriptLoading(true);
    setScriptError('');

    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 55000; // 55s — under the 60s server limit

    const payload = JSON.stringify({
      mediaTitle: displayTitle,
      character: selectedCharacter,
      prompt,
      tone: TONES.find(t => t.id === tone)?.label || 'Dramatic',
      format,
      crossover: crossover || (isMashup ? mashupShows.filter(Boolean).join(' + ') : ''),
      qaAnswers: aiQuestions.filter(q => q.a),
      isCustomIP,
      isMashup,
      customIPDesc,
    });

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      try {
        const res = await fetch('/api/create/script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({ error: 'Script generation failed' }));
          throw new Error(errData.error || `Generation failed (${res.status})`);
        }

        const data = await res.json();
        setScriptTitle(data.title || '');
        setScriptLogline(data.logline || '');
        setScriptScenes(data.scenes || []);
        setStep('script');
        return; // success — exit the retry loop
      } catch (err: any) {
        clearTimeout(timer);
        const isNetworkError = err.name === 'AbortError' || err.name === 'TypeError' || !err.message || err.message.includes('onnect');

        if (isNetworkError && attempt < MAX_RETRIES) {
          // Retry after a short delay
          await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
          continue;
        }

        console.error('Script error:', err);
        if (err.name === 'AbortError') {
          setScriptError('Request timed out — please try again or pick a shorter format.');
        } else if (err.name === 'TypeError' || err.message?.includes('onnect')) {
          setScriptError('Network error — check your connection and try again.');
        } else {
          setScriptError(err.message || 'Failed to generate script');
        }
      }
    }
    setScriptLoading(false);
  }

  // ── Generate Storyboard (from script) ─────────────────────────
  async function generateStoryboard() {
    setStoryboardLoading(true);

    setStoryboardError('');

    try {
      const res = await fetch('/api/create/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaTitle: displayTitle,
          character: selectedCharacter,
          prompt,
          tone: TONES.find(t => t.id === tone)?.label || 'Dramatic',
          format,
          crossover: crossover || (isMashup ? mashupShows.filter(Boolean).join(' + ') : ''),
          qaAnswers: aiQuestions.filter(q => q.a),
          isCustomIP,
          isMashup,
          customIPDesc,
          artStyle,
          artStylePrompt: STYLES.find(s => s.id === artStyle)?.prompt,
          // Pass script context for better storyboard
          scriptScenes: scriptScenes.length > 0 ? scriptScenes : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'AI generation failed' }));
        throw new Error(errData.error || `Generation failed (${res.status})`);
      }

      const data = await res.json();
      const aiScenes: StoryboardScene[] = (data.scenes || []).map((s: any, i: number) => ({
        id: `sc_${i + 1}`,
        sceneNum: s.sceneNum || i + 1,
        description: s.description || '',
        duration: s.duration || '',
        visual: s.visual || '',
        emoji: s.emoji || ['🎬', '💫', '🔥', '🌟', '🎭', '💎'][i % 6],
      }));

      if (aiScenes.length === 0) {
        throw new Error('AI returned no scenes — try rephrasing your prompt');
      }

      setScenes(aiScenes);
      setStep('storyboard');
    } catch (err: any) {
      console.error('Storyboard error:', err);
      setStoryboardError(err.message || 'Failed to generate storyboard');
    } finally {
      setStoryboardLoading(false);
    }
  }

  // ── Build enhanced prompt with style + aspect info ────────────
  function buildImagePrompt(sceneVisual: string): string {
    const style = STYLES.find(s => s.id === artStyle);
    return `${sceneVisual}, ${style?.prompt || 'cinematic lighting, high detail, professional quality'}`;
  }

  // ── Generate a single scene image ─────────────────────────────
  async function generateSceneImage(scene: StoryboardScene): Promise<{ image: string; imageUrl?: string } | null> {
    const arInfo = ASPECT_RATIOS.find(a => a.id === aspectRatio) || ASPECT_RATIOS[0];
    let attempts = 0;
    while (attempts < 3) {
      const res = await fetch('/api/create/imagine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: buildImagePrompt(scene.visual),
          model: imageModel,
          sceneId: scene.id,
          negative_prompt: negativePrompt,
          width: arInfo.width,
          height: arInfo.height,
        }),
      });

      if (res.status === 503) {
        const data = await res.json().catch(() => ({}));
        const wait = Math.min((data.estimated_time || 20) * 1000, 60000);
        await new Promise(r => setTimeout(r, wait));
        attempts++;
        continue;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.error || errData.details || `Image generation failed (${res.status})`;
        throw new Error(msg);
      }

      const data = await res.json();
      if (data.image) return { image: data.image, imageUrl: data.imageUrl };
      throw new Error('No image returned');
    }
    return null;
  }

  // ── Regenerate a single scene ─────────────────────────────────
  async function regenerateScene(sceneId: string) {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;
    setRegeneratingScene(sceneId);
    try {
      const result = await generateSceneImage(scene);
      if (result) {
        setSceneImages(prev => ({ ...prev, [sceneId]: result.image }));
        if (result.imageUrl) {
          setSceneImageUrls(prev => ({ ...prev, [sceneId]: result.imageUrl! }));
        }
      }
    } catch (err: any) {
      console.error('Regen error:', err);
    } finally {
      setRegeneratingScene(null);
    }
  }

  // ── Generate character dialogue audio for all scenes ────────────
  async function generateNarration() {
    setNarrationLoading(true);

    await runParallelBatches(
      scenes,
      async (scene) => {
        // Find matching script scene for dialogue data
        const scriptScene = scriptScenes.find(ss => ss.sceneNum === scene.sceneNum);
        const dialogue = scriptScene?.dialogue?.filter(d => d.line?.trim());

        // Build request body — dialogue mode (character voices) or fallback to description
        const bodyPayload = dialogue && dialogue.length > 0
          ? { dialogue: dialogue.map(d => ({ character: d.character, line: d.line })), sceneId: scene.id }
          : { text: scene.description, sceneId: scene.id };

        const res = await fetch('/api/create/narrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bodyPayload),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.audio) {
            setSceneNarration(prev => ({ ...prev, [scene.id]: data.audio }));
            return data.audio;
          }
        }
        return null;
      },
      { concurrency: 2 }
    );

    setNarrationLoading(false);
  }

  // ── Animate a single scene (submit + poll if pending) ─────────
  async function animateScene(scene: any, idx: number, totalScenes: number): Promise<string | null> {
    setVideoStage(`🎬 Animating Scene ${idx + 1}/${totalScenes}: ${scene.description.slice(0, 40)}...`);

    try {
      const res = await fetch('/api/create/animate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: sceneImageUrls[scene.id] || undefined,
          imageBase64: !sceneImageUrls[scene.id] ? sceneImages[scene.id] : undefined,
          prompt: scene.visual,
          model: videoModel,
          sceneId: scene.id,
          duration: '5',
          aspectRatio,
        }),
      });

      const data = await res.json();
      console.log(`[animate] Scene ${idx + 1} POST response (HTTP ${res.status}):`, JSON.stringify(data).slice(0, 300));

      // Direct success
      if (data.videoUrl) {
        setSceneVideos(prev => ({ ...prev, [scene.id]: data.videoUrl }));
        return data.videoUrl;
      }

      // Pending — poll until done (up to 5 min for Wan t2v)
      if (data.pending && data.taskId) {
        setVideoStage(`🎬 Scene ${idx + 1}: generating video (${data.model})...`);
        const deadline = Date.now() + 300_000; // 5 min — Wan t2v needs 60-180s
        while (Date.now() < deadline) {
          await new Promise(r => setTimeout(r, 5000));
          try {
            const pollRes = await fetch(`/api/create/animate?taskId=${data.taskId}&provider=${data.provider}`);
            const pollData = await pollRes.json();
            if (pollData.done && pollData.videoUrl) {
              setSceneVideos(prev => ({ ...prev, [scene.id]: pollData.videoUrl }));
              return pollData.videoUrl;
            }
            if (pollData.done && pollData.error) {
              setVideoError(prev => prev ? prev + ' | ' + pollData.error : pollData.error);
              return null;
            }
            if (pollData.progress) {
              setVideoStage(`🎬 Scene ${idx + 1}: ${pollData.progress}% (${data.model})`);
            }
          } catch {}
        }
        setVideoError(prev => prev ? prev + ` | Scene ${idx + 1}: timed out` : `Scene ${idx + 1}: timed out`);
        return null;
      }

      // Error response
      if (data.error) {
        setVideoError(prev => prev ? prev + ` | Scene ${idx + 1}: ${data.error}` : `Scene ${idx + 1}: ${data.error}`);
        return null;
      }

      // Unexpected response — show it so we can debug
      const debugMsg = `Scene ${idx + 1}: unexpected response (HTTP ${res.status}): ${JSON.stringify(data).slice(0, 150)}`;
      console.error('[animate]', debugMsg);
      setVideoError(prev => prev ? prev + ' | ' + debugMsg : debugMsg);
      return null;
    } catch (err: any) {
      setVideoError(prev => prev ? prev + ` | Scene ${idx + 1}: ${err.message}` : `Scene ${idx + 1}: ${err.message}`);
      return null;
    }
  }

  // ── Parallel video generation for all scenes ──────────────────
  async function generateVideos() {
    setVideoGenerating(true);
    setVideoProgress(0);
    setVideoError('');
    const totalScenes = scenes.length;
    const CONCURRENCY = Math.min(2, totalScenes);

    setVideoStage(`🎬 Generating ${totalScenes} videos (${CONCURRENCY} in parallel)...`);

    await runParallelBatches(
      scenes,
      (scene, idx) => animateScene(scene, idx, totalScenes),
      {
        concurrency: CONCURRENCY,
        onProgress: (completed, total) => {
          setVideoProgress(Math.round((completed / total) * 100));
        },
      }
    );

    const videoCount = Object.keys(sceneVideos).length;
    setVideoStage(videoCount > 0 ? `${videoCount} videos ready! 🎉` : 'Video generation finished');
    setVideoGenerating(false);
  }

  // ── Download all scene images ─────────────────────────────────
  function downloadAllImages() {
    setDownloadingAll(true);
    Object.entries(sceneImages).forEach(([, dataUrl], idx) => {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${displayTitle.replace(/[^a-zA-Z0-9]/g, '_')}_scene_${idx + 1}.png`;
      link.click();
    });
    setTimeout(() => setDownloadingAll(false), 1000);
  }

  // ── Parallel AI image generation for all scenes ────────────────
  async function startGeneration() {
    setStep('generating');
    setGenProgress(0);
    setGenError('');
    setSceneImages({});
    setSceneImageUrls({});
    setGenElapsed(0);

    elapsedRef.current = setInterval(() => {
      setGenElapsed(prev => prev + 1);
    }, 1000);

    const totalScenes = scenes.length;
    const CONCURRENCY = Math.min(3, totalScenes); // 3 scenes at a time

    setGenStage(`🎨 Generating ${totalScenes} scenes (${CONCURRENCY} in parallel)...`);

    await runParallelBatches(
      scenes,
      async (scene, idx) => {
        setGenStage(`🎨 Scene ${idx + 1}/${totalScenes}: ${scene.description.slice(0, 50)}...`);
        const result = await generateSceneImage(scene);
        if (result) {
          setSceneImages(prev => ({ ...prev, [scene.id]: result.image }));
          if (result.imageUrl) {
            setSceneImageUrls(prev => ({ ...prev, [scene.id]: result.imageUrl! }));
          }
        }
        return result;
      },
      {
        concurrency: CONCURRENCY,
        onProgress: (completed, total, result, idx, error) => {
          setGenProgress(Math.round((completed / total) * 100));
          if (!result) {
            const errMsg = error || 'Unknown error';
            setGenError(prev => prev ? `${prev}\nScene ${idx + 1}: ${errMsg}` : `Scene ${idx + 1}: ${errMsg}`);
          }
        },
      }
    );

    if (elapsedRef.current) clearInterval(elapsedRef.current);

    setGenStage('Complete! ✨');
    setGenProgress(100);

    setTimeout(() => {
      setStep('review-images');
    }, 600);
  }

  // ── Share handlers ──
  const SOCIAL_PLATFORMS = [
    { id: 'x',        name: 'X (Twitter)', icon: '𝕏',  color: '#000',    url: 'https://x.com/intent/tweet?text=' },
    { id: 'facebook',  name: 'Facebook',   icon: 'f',  color: '#1877F2', url: 'https://www.facebook.com/sharer/sharer.php?u=' },
    { id: 'instagram', name: 'Instagram',  icon: '📷', color: '#E4405F', url: '' },
    { id: 'threads',   name: 'Threads',    icon: '🧵', color: '#000',    url: '' },
    { id: 'tiktok',    name: 'TikTok',     icon: '🎵', color: '#000',    url: '' },
    { id: 'youtube',   name: 'YouTube',    icon: '▶️', color: '#FF0000', url: '' },
    { id: 'reddit',    name: 'Reddit',     icon: '🤖', color: '#FF5700', url: 'https://reddit.com/submit?title=' },
  ];

  function handleShare(platformId: string) {
    const platform = SOCIAL_PLATFORMS.find(p => p.id === platformId);
    if (!platform) return;
    setShareToast(`Shared to ${platform.name}!`);
    setShowShareMenu(false);
    setTimeout(() => setShareToast(''), 2500);
  }

  // ═══════════════════════════════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════════════════════════════

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[100] flex flex-col">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-border bg-bg/95 backdrop-blur px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted hover:text-white text-sm transition">← Back</button>
          <div className="w-px h-5 bg-border" />
          <span className="text-xl">{selectedMedia.emoji}</span>
          <div>
            <h2 className="font-display text-lg text-white tracking-wide">{displayTitle}</h2>
            <p className="text-[10px] text-muted">{selectedMedia.category} · {selectedMedia.year} · {selectedMedia.genre}</p>
          </div>
        </div>

        {/* Step indicator */}
        <div className="hidden sm:flex items-center gap-1">
          {STEP_ORDER.filter(s => s !== 'generating' && s !== 'review-videos').map((s, i) => (
            <div key={s} className={`flex items-center gap-1 ${i > 0 ? '' : ''}`}>
              {i > 0 && <div className={`w-4 h-px ${
                stepIndex > i || (s === 'result' && step === 'result')
                  ? 'bg-lime' : step === s || (step === 'generating' && s === 'storyboard') || (step === 'review-images' && s === 'review-images') || (step === 'review-videos' && s === 'review-images') ? 'bg-rip' : 'bg-border'
              }`} />}
              <div className={`w-2 h-2 rounded-full transition-all ${
                stepIndex > i || (s === 'result' && step === 'result')
                  ? 'bg-lime scale-100'
                  : step === s || (step === 'generating' && s === 'storyboard')
                    ? 'bg-rip scale-125'
                    : 'bg-border scale-100'
              }`} />
            </div>
          ))}
        </div>
      </div>

      {/* ── Body (scrollable) ─────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
        <div className="max-w-2xl mx-auto">

          {/* ════════════════════════════════════════════════════════
               STEP 1: CHARACTER SELECTION
             ════════════════════════════════════════════════════════ */}
          {step === 'character' && (
            <div>
              <h3 className="font-display text-2xl text-white mb-1">Choose Your Character</h3>
              <p className="text-sm text-muted mb-6">
                {isCustomIP ? 'Create your original character' : `Pick a character from ${selectedMedia.title} — or create your own`}
              </p>

              {/* Search bar */}
              {!isCustomIP && allCharacters.length > 5 && (
                <div className="mb-4">
                  <input value={charSearch} onChange={e => setCharSearch(e.target.value)}
                    placeholder="🔍 Search characters..."
                    className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rip placeholder:text-muted2" />
                </div>
              )}

              {/* TMDB loading spinner */}
              {tmdbLoading && (
                <div className="flex items-center gap-2 mb-4 text-muted text-xs">
                  <span className="animate-spin">🔄</span> Loading cast from TMDB...
                </div>
              )}

              {/* Character grid */}
              <div ref={charScrollRef} className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 max-h-[50vh] overflow-y-auto pr-1">
                {characters.map(c => (
                  <button key={c.id} onClick={() => { setSelectedCharacter(c); setShowCustomForm(false); }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedCharacter?.id === c.id
                        ? 'border-rip bg-rip/5 scale-[1.02]'
                        : 'border-border bg-bg2 hover:border-bord2'
                    }`}>
                    <div className="flex items-center gap-2 mb-1.5">
                      {c.imageUrl ? (
                        <img src={c.imageUrl} alt={c.name} referrerPolicy="no-referrer"
                          className="w-8 h-8 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: `linear-gradient(135deg, hsl(${(c.name || '').charCodeAt(0) * 7 % 360}, 70%, 45%), hsl(${((c.name || '').charCodeAt(0) * 7 + 60) % 360}, 70%, 55%))` }}>
                          {(c.name || '?')[0].toUpperCase()}
                        </div>
                      )}
                      <span className="text-xs font-bold text-white truncate">{c.name}</span>
                    </div>
                    <p className="text-[10px] text-muted truncate">{c.role}</p>
                  </button>
                ))}

                {/* Custom character button */}
                <button onClick={() => { setShowCustomForm(true); setSelectedCharacter(null); }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    showCustomForm ? 'border-cyan bg-cyan/5' : 'border-dashed border-border bg-bg2 hover:border-cyan'
                  }`}>
                  <span className="text-xl block mb-1">✨</span>
                  <span className="text-xs font-bold text-white">Create Custom</span>
                  <p className="text-[10px] text-muted">Your own character</p>
                </button>
              </div>

              {/* Custom character form */}
              {showCustomForm && (
                <div className="bg-bg2 border border-cyan/30 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span>✨</span>
                    <span className="text-[9px] text-cyan uppercase tracking-widest font-bold">Custom Character</span>
                  </div>
                  <div className="space-y-2">
                    <input value={customCharName} onChange={e => setCustomCharName(e.target.value)}
                      placeholder="Character name..."
                      className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-cyan placeholder:text-muted2" />
                    <input value={customCharRole} onChange={e => setCustomCharRole(e.target.value)}
                      placeholder="Role / description..."
                      className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-cyan placeholder:text-muted2" />
                    <button onClick={() => {
                      if (customCharName.trim()) {
                        setSelectedCharacter({
                          id: 'custom_' + Date.now(),
                          name: customCharName,
                          role: customCharRole || 'Custom character',
                          emoji: '✨',
                          isCustom: true,
                        });
                      }
                    }}
                      disabled={!customCharName.trim()}
                      className="w-full py-2 rounded-lg bg-cyan/10 border border-cyan text-cyan text-xs font-bold disabled:opacity-40 hover:bg-cyan/20 transition-all">
                      Create Character
                    </button>
                  </div>
                </div>
              )}

              {/* Next button */}
              <button onClick={() => setStep('prompt')}
                disabled={!selectedCharacter}
                className={`w-full py-3.5 rounded-xl font-display text-lg tracking-wide transition-all ${
                  selectedCharacter
                    ? 'text-white hover:brightness-110'
                    : 'text-muted bg-bg3 border border-border cursor-not-allowed'
                }`}
                style={selectedCharacter ? { background: 'linear-gradient(90deg,#ff2d78,#a855f7)' } : {}}>
                {selectedCharacter ? `Continue with ${selectedCharacter.name} →` : 'Select a character'}
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
               STEP 2: PROMPT / VISION
             ════════════════════════════════════════════════════════ */}
          {step === 'prompt' && (
            <div>
              <h3 className="font-display text-2xl text-white mb-1">Describe Your Vision</h3>
              <p className="text-sm text-muted mb-6">Tell us your idea — AI will write a full script for you to review</p>

              {/* Main prompt */}
              <div className="mb-4">
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">Your Idea *</label>
                <textarea value={prompt} onChange={e => setPrompt(e.target.value)}
                  placeholder={`e.g. "${selectedCharacter?.name} discovers they're in a simulation and must convince everyone to escape..."`}
                  rows={4}
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rip placeholder:text-muted2 resize-none" />
              </div>

              {/* Tone selection */}
              <div className="mb-4">
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-2">Tone / Style</label>
                <div className="flex flex-wrap gap-2">
                  {TONES.map(t => (
                    <button key={t.id} onClick={() => setTone(t.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        tone === t.id
                          ? 'bg-rip/15 border border-rip text-rip'
                          : 'bg-bg2 border border-border text-muted hover:text-white'
                      }`}>
                      <span>{t.emoji}</span> {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Format selection */}
              <div className="mb-4">
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-2">Format</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {FORMATS.map(f => (
                    <button key={f.id} onClick={() => setFormat(f.id)}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        format === f.id
                          ? 'border-cyan bg-cyan/5'
                          : 'border-border bg-bg2 hover:border-bord2'
                      }`}>
                      <div className="text-lg mb-1">{f.emoji}</div>
                      <div className="text-xs font-bold text-white">{f.label}</div>
                      <div className="text-[10px] text-muted">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Crossover (optional) */}
              <div className="mb-4">
                <label className="text-[9px] font-bold text-muted uppercase tracking-widest block mb-1.5">Crossover (optional)</label>
                <input value={crossover} onChange={e => setCrossover(e.target.value)}
                  placeholder="Mix with another IP... e.g. 'SpongeBob meets Breaking Bad'"
                  className="w-full bg-bg2 border border-border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-rip placeholder:text-muted2" />
              </div>

              {/* AI Q&A Section (vidmuse-style) */}
              {prompt.trim() && (
                <div className="mb-4 bg-bg2 border border-purple/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">🧠</span>
                    <div className="text-[9px] text-purple uppercase tracking-widest font-bold">AI Refinement Questions</div>
                  </div>

                  {AI_QUESTIONS.slice(0, questionPhase + 1).map((q, i) => (
                    <div key={i} className="mb-3">
                      <div className="flex items-start gap-2 mb-1.5">
                        <span className="text-purple text-xs mt-0.5">Q{i + 1}:</span>
                        <p className="text-sm text-white">{q}</p>
                      </div>
                      {aiQuestions[i]?.a ? (
                        <div className="ml-6 bg-bg3 border border-border rounded-lg px-3 py-2">
                          <p className="text-xs text-muted">{aiQuestions[i].a}</p>
                        </div>
                      ) : i === questionPhase ? (
                        <div className="ml-6 flex gap-2">
                          <input value={currentAnswer} onChange={e => setCurrentAnswer(e.target.value)}
                            placeholder="Your answer..."
                            className="flex-1 bg-bg3 border border-border rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-purple placeholder:text-muted2"
                            onKeyDown={e => {
                              if (e.key === 'Enter' && currentAnswer.trim()) {
                                setAiQuestions([...aiQuestions, { q, a: currentAnswer }]);
                                setCurrentAnswer('');
                                setQuestionPhase(prev => prev + 1);
                              }
                            }} />
                          <button onClick={() => {
                            if (currentAnswer.trim()) {
                              setAiQuestions([...aiQuestions, { q, a: currentAnswer }]);
                              setCurrentAnswer('');
                              setQuestionPhase(prev => prev + 1);
                            }
                          }}
                            disabled={!currentAnswer.trim()}
                            className="px-3 py-2 rounded-lg bg-purple/20 border border-purple text-purple text-xs font-bold hover:bg-purple/30 transition-all disabled:opacity-40">
                            →
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ))}

                  {questionPhase >= AI_QUESTIONS.length && (
                    <div className="flex items-center gap-2 text-lime text-xs mt-2">
                      <span>✓</span> All questions answered — your vision is clear!
                    </div>
                  )}

                  {questionPhase < AI_QUESTIONS.length && (
                    <button onClick={() => setQuestionPhase(AI_QUESTIONS.length)}
                      className="text-[10px] text-muted hover:text-white mt-2 underline transition">
                      Skip remaining questions →
                    </button>
                  )}
                </div>
              )}

              {/* Art Style */}
              <div className="mb-4">
                <label className="text-[10px] text-muted font-bold uppercase tracking-widest block mb-2">🎨 Art Style</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {STYLES.map(s => (
                    <button key={s.id} onClick={() => setArtStyle(s.id)}
                      className={`p-2.5 rounded-xl text-center transition-all ${
                        artStyle === s.id
                          ? 'bg-rip/15 border-2 border-rip text-white scale-[1.02]'
                          : 'bg-bg2 border border-border text-muted hover:text-white hover:border-bord2'
                      }`}>
                      <span className="text-xl block mb-1">{s.emoji}</span>
                      <span className="text-[10px] font-bold">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Aspect Ratio */}
              <div className="mb-4">
                <label className="text-[10px] text-muted font-bold uppercase tracking-widest block mb-2">📐 Aspect Ratio</label>
                <div className="flex flex-wrap gap-2">
                  {ASPECT_RATIOS.map(a => (
                    <button key={a.id} onClick={() => setAspectRatio(a.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        aspectRatio === a.id
                          ? 'bg-cyan/15 border border-cyan text-cyan'
                          : 'bg-bg2 border border-border text-muted hover:text-white'
                      }`}>
                      <span>{a.emoji}</span> {a.label}
                      <span className="text-[9px] text-muted font-normal hidden sm:inline">· {a.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Engine + Model selection */}
              <div className="mb-4 bg-bg2 border border-lime/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🤖</span>
                  <div className="text-[9px] text-lime uppercase tracking-widest font-bold">AI Engine</div>
                  <button onClick={() => setShowAdvanced(!showAdvanced)}
                    className="ml-auto text-[9px] text-muted hover:text-white transition-all">
                    {showAdvanced ? '▲ Hide Advanced' : '▼ Advanced'}
                  </button>
                </div>

                {/* Image model selector — fal.ai models */}
                <div className="mb-3">
                  <label className="text-[10px] text-muted font-bold block mb-1.5">Image Generation Model</label>
                  <div className="flex flex-wrap gap-2">
                    {IMAGE_MODELS.map(m => (
                      <button key={m.id} onClick={() => setImageModel(m.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                          imageModel === m.id
                            ? 'bg-lime/15 border border-lime text-lime'
                            : 'bg-bg3 border border-border text-muted hover:text-white'
                        }`}>
                        <span>{m.emoji}</span> {m.name}
                        {m.tier !== 'free' && (
                          <span className="text-[8px] px-1 py-0.5 rounded bg-rip/20 text-rip">{m.tier}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {showAdvanced && (
                  <div className="mt-3 pt-3 border-t border-border space-y-3">
                    <div>
                      <label className="text-[10px] text-muted font-bold block mb-1">Negative Prompt</label>
                      <textarea value={negativePrompt}
                        onChange={e => setNegativePrompt(e.target.value)}
                        placeholder="Things to avoid..."
                        className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-muted/50 resize-none focus:border-lime/50 focus:outline-none"
                        rows={2} />
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-muted mt-3">
                  📝 <span className="text-purple font-bold">Claude Sonnet</span> →
                  ✍️ <span className="text-orange-400 font-bold">Script</span> →
                  🎨 <span className="text-lime font-bold">{IMAGE_MODELS.find(m => m.id === imageModel)?.name || imageModel}</span> →
                  🎬 <span className="text-rip font-bold">{STYLES.find(s => s.id === artStyle)?.label || 'Cinematic'}</span>
                </div>
              </div>

              {/* Script error */}
              {scriptError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
                  <span>❌</span>
                  <p className="text-xs text-red-400">{scriptError}</p>
                  <button onClick={() => setScriptError('')} className="ml-auto text-muted hover:text-white text-xs">✕</button>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3">
                <button onClick={() => setStep('character')}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-muted border border-border hover:border-bord2 transition-all">
                  ← Back
                </button>
                <button onClick={generateScript}
                  disabled={!prompt.trim() || scriptLoading}
                  className={`flex-1 py-3.5 rounded-xl font-display text-lg tracking-wide transition-all ${
                    prompt.trim() && !scriptLoading
                      ? 'text-white hover:brightness-110'
                      : 'text-muted bg-bg3 border border-border cursor-not-allowed'
                  }`}
                  style={prompt.trim() && !scriptLoading ? { background: 'linear-gradient(90deg,#ff2d78,#a855f7)' } : {}}>
                  {scriptLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">✍️</span> AI Writing Script...
                    </span>
                  ) : (
                    'Generate Script →'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
               STEP 3: SCRIPT REVIEW (NEW — Phase 2)
             ════════════════════════════════════════════════════════ */}
          {step === 'script' && (
            <div>
              <h3 className="font-display text-2xl text-white mb-1">📜 Your Script</h3>
              <p className="text-sm text-muted mb-2">Review and edit the AI-generated screenplay. Click any scene to modify it.</p>

              {/* Script header */}
              {scriptTitle && (
                <div className="bg-bg2 border border-rip/30 rounded-xl p-4 mb-4">
                  <h4 className="font-display text-xl text-white mb-1">{scriptTitle}</h4>
                  {scriptLogline && <p className="text-sm text-muted italic">{scriptLogline}</p>}
                  <div className="flex flex-wrap gap-2 mt-3">
                    <span className="px-2 py-1 rounded-full bg-rip/10 border border-rip/30 text-rip text-[10px] font-bold">
                      {selectedCharacter?.emoji} {selectedCharacter?.name}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-purple/10 border border-purple/30 text-purple text-[10px] font-bold">
                      🎭 {scriptScenes.length} scenes
                    </span>
                    <span className="px-2 py-1 rounded-full bg-cyan/10 border border-cyan/30 text-cyan text-[10px] font-bold">
                      {TONES.find(t => t.id === tone)?.emoji} {TONES.find(t => t.id === tone)?.label}
                    </span>
                  </div>
                </div>
              )}

              {/* Script scenes */}
              <div className="space-y-4 mb-6">
                {scriptScenes.map((scene, idx) => (
                  <div key={idx}
                    className={`bg-bg2 border rounded-xl overflow-hidden transition-all ${
                      editingScript === idx ? 'border-rip' : 'border-border hover:border-bord2'
                    }`}>
                    {/* Scene heading */}
                    <div className="bg-bg3 px-4 py-2 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-rip text-xs font-bold">Scene {scene.sceneNum}</span>
                        <span className="text-[10px] text-muted font-mono">{scene.duration}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple/10 text-purple font-bold">{scene.mood}</span>
                      </div>
                      <button onClick={() => {
                        if (editingScript === idx) {
                          setEditingScript(null);
                        } else {
                          setEditingScript(idx);
                          setScriptEditText(JSON.stringify(scene, null, 2));
                        }
                      }}
                        className="text-muted hover:text-white text-xs transition">
                        {editingScript === idx ? '✕' : '✏️'}
                      </button>
                    </div>

                    {editingScript === idx ? (
                      <div className="p-4 space-y-2">
                        <textarea value={scriptEditText}
                          onChange={e => setScriptEditText(e.target.value)}
                          rows={12}
                          className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-white text-xs font-mono outline-none focus:border-rip resize-none" />
                        <div className="flex gap-2">
                          <button onClick={() => {
                            try {
                              const updated = JSON.parse(scriptEditText);
                              setScriptScenes(scriptScenes.map((s, i) => i === idx ? updated : s));
                              setEditingScript(null);
                            } catch {
                              // If JSON is invalid, just update the action text
                              setScriptScenes(scriptScenes.map((s, i) =>
                                i === idx ? { ...s, action: scriptEditText } : s
                              ));
                              setEditingScript(null);
                            }
                          }}
                            className="px-3 py-1.5 rounded-lg bg-lime/10 border border-lime text-lime text-[10px] font-bold">
                            Save
                          </button>
                          <button onClick={() => setEditingScript(null)}
                            className="px-3 py-1.5 rounded-lg text-[10px] text-muted hover:text-white">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4">
                        {/* Scene heading (INT/EXT) */}
                        <p className="text-xs font-bold text-cyan mb-2 font-mono uppercase">{scene.heading}</p>

                        {/* Description */}
                        <p className="text-xs text-muted italic mb-3">{scene.description}</p>

                        {/* Action */}
                        <p className="text-xs text-white mb-3">{scene.action}</p>

                        {/* Dialogue */}
                        {scene.dialogue?.length > 0 && (
                          <div className="space-y-2 pl-4 border-l-2 border-rip/20">
                            {scene.dialogue.map((d, di) => (
                              <div key={di}>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-rip uppercase">{d.character}</span>
                                  {d.direction && (
                                    <span className="text-[9px] text-muted italic">({d.direction})</span>
                                  )}
                                </div>
                                <p className="text-xs text-white/90 ml-2">&ldquo;{d.line}&rdquo;</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Camera note */}
                        {scene.cameraNote && (
                          <p className="text-[10px] text-muted/60 mt-3 italic">
                            🎥 {scene.cameraNote}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-3">
                <button onClick={() => setStep('prompt')}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-muted border border-border hover:border-bord2 transition-all">
                  ← Edit Prompt
                </button>
                <button onClick={generateStoryboard}
                  disabled={storyboardLoading}
                  className="flex-1 py-3.5 rounded-xl font-display text-lg tracking-wide text-white transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
                  {storyboardLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">🎨</span> Creating Storyboard...
                    </span>
                  ) : (
                    'Approve → Storyboard →'
                  )}
                </button>
              </div>

              {storyboardError && (
                <div className="mt-3 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
                  <span>❌</span>
                  <p className="text-xs text-red-400">{storyboardError}</p>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
               STEP 4: STORYBOARD REVIEW
             ════════════════════════════════════════════════════════ */}
          {step === 'storyboard' && (
            <div>
              <h3 className="font-display text-2xl text-white mb-1">Storyboard</h3>
              <p className="text-sm text-muted mb-2">Review and edit your visual scenes before generation.</p>

              {/* Config summary */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-2.5 py-1 rounded-full bg-rip/10 border border-rip/30 text-rip text-[10px] font-bold">
                  🎨 {STYLES.find(s => s.id === artStyle)?.label || 'Cinematic'}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-cyan/10 border border-cyan/30 text-cyan text-[10px] font-bold">
                  📐 {aspectRatio}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-lime/10 border border-lime/30 text-lime text-[10px] font-bold">
                  🤖 {IMAGE_MODELS.find(m => m.id === imageModel)?.name || imageModel}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-purple/10 border border-purple/30 text-purple text-[10px] font-bold">
                  🎭 {scenes.length} scenes
                </span>
              </div>

              <div className="space-y-3 mb-6">
                {scenes.map((scene) => (
                  <div key={scene.id}
                    className={`bg-bg2 border rounded-xl p-4 transition-all ${
                      editingScene === scene.id ? 'border-rip' : 'border-border hover:border-bord2'
                    }`}>
                    <div className="flex items-start gap-3">
                      <div className="shrink-0 w-10 h-10 rounded-lg bg-bg3 border border-border flex items-center justify-center text-lg">
                        {scene.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-rip">Scene {scene.sceneNum}</span>
                          <span className="text-[10px] text-muted font-mono">{scene.duration}</span>
                        </div>
                        {editingScene === scene.id ? (
                          <div className="space-y-2">
                            <textarea value={sceneEditText} onChange={e => setSceneEditText(e.target.value)}
                              rows={3}
                              className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-rip resize-none" />
                            <div className="flex gap-2">
                              <button onClick={() => {
                                setScenes(scenes.map(s => s.id === scene.id ? { ...s, description: sceneEditText } : s));
                                setEditingScene(null);
                              }}
                                className="px-3 py-1.5 rounded-lg bg-lime/10 border border-lime text-lime text-[10px] font-bold">Save</button>
                              <button onClick={() => setEditingScene(null)}
                                className="px-3 py-1.5 rounded-lg text-[10px] text-muted hover:text-white">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-white leading-relaxed">{scene.description}</p>
                            <p className="text-[10px] text-muted2 mt-1 italic">Visual: {scene.visual}</p>
                          </>
                        )}
                      </div>
                      {editingScene !== scene.id && (
                        <button onClick={() => { setEditingScene(scene.id); setSceneEditText(scene.description); }}
                          className="shrink-0 text-muted hover:text-white text-xs transition">✏️</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add scene */}
              <button onClick={() => {
                const newScene: StoryboardScene = {
                  id: 'sc_' + Date.now(),
                  sceneNum: scenes.length + 1,
                  description: 'New scene — click edit to describe it',
                  duration: '0:00-0:00',
                  visual: 'Describe the visual style',
                  emoji: '🎬',
                };
                setScenes([...scenes, newScene]);
              }}
                className="w-full py-2.5 rounded-xl border border-dashed border-border text-xs text-muted hover:text-white hover:border-bord2 transition-all mb-6">
                + Add Scene
              </button>

              {/* Navigation */}
              <div className="flex gap-3">
                <button onClick={() => setStep('script')}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-muted border border-border hover:border-bord2 transition-all">
                  ← Back to Script
                </button>
                <button onClick={startGeneration}
                  className="flex-1 py-3.5 rounded-xl font-display text-lg tracking-wide text-white transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
                  ☽ Generate Images →
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
               STEP 5: GENERATING (animated progress)
             ════════════════════════════════════════════════════════ */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="text-6xl mb-6 animate-pulse">🎬</div>
              <h3 className="font-display text-3xl text-white mb-2">Creating Your Vision</h3>
              <p className="text-sm text-muted mb-4 text-center max-w-md">
                Bringing {selectedCharacter?.name}&apos;s story to life in the {displayTitle} universe...
              </p>

              {/* Elapsed timer */}
              <div className="flex items-center gap-2 mb-6">
                <span className="text-xs text-muted">⏱️ Elapsed:</span>
                <span className="font-mono text-sm text-white font-bold">
                  {Math.floor(genElapsed / 60)}:{String(genElapsed % 60).padStart(2, '0')}
                </span>
                <span className="mx-2 text-muted">·</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rip/10 border border-rip/30 text-rip font-bold">
                  {STYLES.find(s => s.id === artStyle)?.label}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-lime/10 border border-lime/30 text-lime font-bold">
                  {IMAGE_MODELS.find(m => m.id === imageModel)?.name}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full max-w-md mb-4">
                <div className="h-3 bg-bg3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${genProgress}%`, background: 'linear-gradient(90deg,#ff2d78,#a855f7,#00d4ff)' }} />
                </div>
              </div>
              <div className="flex items-center justify-between w-full max-w-md">
                <p className="text-xs text-muted">{genStage}</p>
                <p className="text-xs font-bold text-white">{Math.round(genProgress)}%</p>
              </div>

              {genError && (
                <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 w-full max-w-md">
                  <span>❌</span>
                  <p className="text-xs text-red-400">{genError}</p>
                </div>
              )}

              {/* Scene images as they generate */}
              <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 gap-3 w-full max-w-lg">
                {scenes.map((scene, i) => (
                  <div key={scene.id} className="relative">
                    {sceneImages[scene.id] ? (
                      <img src={sceneImages[scene.id]} alt={`Scene ${i + 1}`}
                        className="aspect-video object-cover rounded-lg border border-lime/30" />
                    ) : (
                      <div className={`aspect-video bg-bg2 border border-border rounded-lg flex items-center justify-center text-2xl ${
                        i <= Math.ceil((genProgress / 100) * scenes.length) ? 'animate-pulse' : 'opacity-30'
                      }`}>
                        {scene.emoji}
                      </div>
                    )}
                    <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 rounded text-[9px] text-white font-bold">
                      {scene.sceneNum}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
               STEP 5b: REVIEW IMAGES — Approve / Edit / Regenerate
             ════════════════════════════════════════════════════════ */}
          {step === 'review-images' && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🎨</div>
                <h3 className="font-display text-3xl text-white mb-1">Review Your Scenes</h3>
                <p className="text-sm text-muted">Approve, regenerate, or edit each scene before animating</p>
              </div>

              {genError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3">
                  <p className="text-xs text-red-400 font-bold mb-1">⚠️ Some scenes failed:</p>
                  <p className="text-xs text-red-400 whitespace-pre-line">{genError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {scenes.map((scene, i) => (
                  <div key={scene.id} className="bg-bg2 border border-border rounded-xl overflow-hidden group">
                    <div className="relative">
                      {sceneImages[scene.id] ? (
                        <img src={sceneImages[scene.id]} alt={`Scene ${i + 1}`}
                          className="aspect-video object-cover w-full" />
                      ) : (
                        <div className="aspect-video bg-bg3 flex items-center justify-center">
                          <span className="text-2xl opacity-40">{scene.emoji} ❌</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <span className="text-xs text-white font-bold">Scene {scene.sceneNum}</span>
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-muted mb-2 line-clamp-2">{scene.description}</p>
                      <div className="flex gap-2">
                        <button onClick={() => regenerateScene(scene.id)}
                          disabled={regeneratingScene === scene.id}
                          className="flex-1 px-2 py-1.5 rounded-lg bg-rip/10 border border-rip/30 text-rip text-[10px] font-bold hover:bg-rip/20 disabled:opacity-50">
                          {regeneratingScene === scene.id ? '🔄 Regenerating...' : '🔄 Regenerate'}
                        </button>
                        <button onClick={() => {
                          if (!sceneImages[scene.id]) return;
                          const link = document.createElement('a');
                          link.href = sceneImages[scene.id];
                          link.download = `scene-${scene.sceneNum}.png`;
                          link.click();
                        }}
                          className="px-2 py-1.5 rounded-lg bg-lime/10 border border-lime/30 text-lime text-[10px] font-bold hover:bg-lime/20">
                          ⬇️
                        </button>
                      </div>
                    </div>
                    {regeneratingScene === scene.id && (
                      <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                        <span className="text-2xl animate-spin">🎨</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Video model selector */}
              <div className="bg-bg2 border border-cyan/30 rounded-xl p-4 mb-4">
                <label className="text-[10px] text-muted font-bold block mb-2">🎥 Choose Video Model for Animation</label>
                <div className="flex flex-wrap gap-2">
                  {VIDEO_MODELS.map(m => (
                    <button key={m.id} onClick={() => setVideoModel(m.id)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                        videoModel === m.id
                          ? 'bg-cyan/15 border border-cyan text-cyan'
                          : 'bg-bg3 border border-border text-muted hover:text-white'
                      }`}>
                      <span>{m.emoji}</span> {m.name}
                      <span className="text-[8px] px-1 py-0.5 rounded bg-rip/20 text-rip">{m.tier}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('storyboard')}
                  className="px-4 py-3 rounded-xl bg-bg2 border border-border text-sm text-muted hover:text-white transition-all">
                  ← Back
                </button>
                <button onClick={async () => {
                  setStep('review-videos');
                  setVideoGenerating(true);
                  setVideoProgress(0);
                  setVideoError('');
                  const totalScenes = scenes.length;
                  setVideoStage(`🎬 Generating ${totalScenes} videos...`);
                  await runParallelBatches(
                    scenes,
                    (scene, idx) => animateScene(scene, idx, totalScenes),
                    {
                      concurrency: 2,
                      onProgress: (completed, total) => {
                        setVideoProgress(Math.round((completed / total) * 100));
                      },
                    }
                  );
                  setVideoGenerating(false);
                  const videoCount = Object.keys(sceneVideos).length;
                  setVideoStage(videoCount > 0 ? `${videoCount} videos ready! 🎉` : 'Video generation finished');
                }}
                  disabled={Object.keys(sceneImages).length === 0}
                  className="flex-1 py-3 rounded-xl font-display text-sm tracking-wide text-white transition-all hover:brightness-110 disabled:opacity-50"
                  style={{ background: 'linear-gradient(90deg,#00d4ff,#a855f7)' }}>
                  🎬 Animate All Scenes → Video
                </button>
                <button onClick={() => {
                  setResultData({
                    title: scriptTitle || `${selectedCharacter?.name || 'Character'}: ${prompt.slice(0, 40)}`,
                    media: selectedMedia,
                    character: selectedCharacter!,
                    prompt, tone, format, scenes,
                    scriptScenes: scriptScenes.length > 0 ? scriptScenes : undefined,
                  });
                  setStep('result');
                }}
                  className="px-4 py-3 rounded-xl bg-lime/10 border border-lime/30 text-lime text-sm font-bold hover:bg-lime/20 transition-all">
                  Skip Video →
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
               STEP 5c: REVIEW VIDEOS — Approve / Edit clips
             ════════════════════════════════════════════════════════ */}
          {step === 'review-videos' && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🎬</div>
                <h3 className="font-display text-3xl text-white mb-1">Review Video Clips</h3>
                <p className="text-sm text-muted">Approve each clip, then assemble your final video</p>
              </div>

              {videoGenerating && (
                <div className="mb-6">
                  <div className="h-3 bg-bg3 rounded-full overflow-hidden mb-2">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${videoProgress}%`, background: 'linear-gradient(90deg,#00d4ff,#a855f7)' }} />
                  </div>
                  <p className="text-xs text-muted text-center">{videoStage} {videoProgress}%</p>
                </div>
              )}

              {videoError && !videoGenerating && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                  <p className="text-xs text-red-400 font-bold mb-1">⚠️ Video generation errors:</p>
                  <p className="text-xs text-red-300">{videoError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                {scenes.map((scene, i) => (
                  <div key={scene.id} className="bg-bg2 border border-border rounded-xl overflow-hidden">
                    <div className="relative">
                      {sceneVideos[scene.id] ? (
                        <video src={sceneVideos[scene.id]}
                          className="aspect-video object-cover w-full rounded-t-xl"
                          controls muted loop playsInline />
                      ) : sceneImages[scene.id] ? (
                        <div className="relative">
                          <img src={sceneImages[scene.id]} alt={`Scene ${i + 1}`}
                            className="aspect-video object-cover w-full opacity-50" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            {videoGenerating ? (
                              <span className="text-2xl animate-spin">🎬</span>
                            ) : (
                              <span className="text-sm text-muted">No video yet</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="aspect-video bg-bg3 flex items-center justify-center">
                          <span className="text-2xl opacity-40">{scene.emoji}</span>
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <span className="text-xs text-white font-bold">Scene {scene.sceneNum}</span>
                        {sceneVideos[scene.id] && <span className="ml-2 text-[9px] text-lime">✅ Ready</span>}
                      </div>
                    </div>
                    <div className="p-3">
                      <p className="text-xs text-muted line-clamp-1">{scene.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep('review-images')}
                  className="px-4 py-3 rounded-xl bg-bg2 border border-border text-sm text-muted hover:text-white transition-all">
                  ← Back to Images
                </button>
                <button onClick={() => {
                  setResultData({
                    title: scriptTitle || `${selectedCharacter?.name || 'Character'}: ${prompt.slice(0, 40)}`,
                    media: selectedMedia,
                    character: selectedCharacter!,
                    prompt, tone, format, scenes,
                    scriptScenes: scriptScenes.length > 0 ? scriptScenes : undefined,
                  });
                  setStep('result');
                }}
                  disabled={videoGenerating}
                  className="flex-1 py-3 rounded-xl font-display text-sm tracking-wide text-white transition-all hover:brightness-110 disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#ff2d78,#a855f7,#00d4ff)' }}>
                  {videoGenerating ? '⏳ Generating...' : `✅ Finalize (${Object.keys(sceneVideos).length} clips ready)`}
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
               STEP 6: RESULT — Download / Video / NFT / Share
             ════════════════════════════════════════════════════════ */}
          {step === 'result' && resultData && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="font-display text-3xl text-white mb-1">Your Creation is Ready!</h3>
                <p className="text-sm text-muted">{resultData.media.title} × {resultData.character.name}</p>
              </div>

              {/* Preview card */}
              <div className="bg-bg2 border border-border rounded-2xl overflow-hidden mb-6">
                <div className="aspect-video flex items-center justify-center relative overflow-hidden"
                  style={Object.keys(sceneImages).length > 0 ? {} : { background: resultData.media.gradient }}>
                  {Object.keys(sceneImages).length > 0 ? (
                    <img src={sceneImages[scenes[0]?.id] || Object.values(sceneImages)[0]}
                      alt="Hero scene" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-8xl opacity-30">{resultData.media.emoji}</span>
                  )}
                  <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
                    <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-bold">{resultData.media.category}</span>
                    <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-bold">{TONES.find(t => t.id === resultData.tone)?.label}</span>
                    <span className="px-2 py-1 rounded-full bg-rip/40 backdrop-blur text-white text-[10px] font-bold">🎨 {STYLES.find(s => s.id === artStyle)?.label}</span>
                  </div>
                  <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/40 backdrop-blur text-white/70 text-[8px] font-mono">
                    FAN-MADE · remixip.icu
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="font-display text-xl text-white mb-1">{resultData.title}</h4>
                  <p className="text-xs text-muted">{resultData.character.emoji} {resultData.character.name} · {resultData.prompt.slice(0, 80)}...</p>
                </div>
              </div>

              {/* Generated scene gallery */}
              {Object.keys(sceneImages).length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-muted uppercase tracking-widest">🎬 Generated Scenes</h4>
                    <div className="flex gap-2">
                      <button onClick={generateNarration} disabled={narrationLoading}
                        className="px-3 py-1.5 rounded-lg bg-purple/10 border border-purple/30 text-purple text-[10px] font-bold hover:bg-purple/20 transition-all disabled:opacity-50">
                        {narrationLoading ? '🗣️ Generating...' : '🗣️ Voice Dialogue'}
                      </button>
                      <button onClick={downloadAllImages} disabled={downloadingAll}
                        className="px-3 py-1.5 rounded-lg bg-lime/10 border border-lime/30 text-lime text-[10px] font-bold hover:bg-lime/20 transition-all disabled:opacity-50">
                        {downloadingAll ? '⏳...' : '⬇️ Download All'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {scenes.map((scene, i) => (
                      <div key={scene.id} className="relative group">
                        {sceneImages[scene.id] ? (
                          <>
                            {sceneVideos[scene.id] ? (
                              <video src={sceneVideos[scene.id]}
                                className="aspect-video object-cover rounded-xl border border-lime/30"
                                controls muted loop playsInline />
                            ) : (
                              <img src={sceneImages[scene.id]} alt={`Scene ${i + 1}`}
                                className="aspect-video object-cover rounded-xl border border-border group-hover:border-rip transition-all" />
                            )}
                          </>
                        ) : (
                          <div className="aspect-video bg-bg3 border border-border rounded-xl flex items-center justify-center text-2xl opacity-40">
                            {scene.emoji}
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent rounded-b-xl">
                          <span className="text-[10px] text-white font-bold">Scene {scene.sceneNum}</span>
                          <p className="text-[9px] text-white/60 line-clamp-1">{scene.description.slice(0, 60)}</p>
                        </div>
                        {/* Action buttons */}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => regenerateScene(scene.id)}
                            disabled={regeneratingScene === scene.id}
                            title="Regenerate"
                            className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur border border-white/20 flex items-center justify-center text-xs hover:border-rip transition-all disabled:animate-spin">
                            🔄
                          </button>
                          <button onClick={() => {
                            const dataUrl = sceneImages[scene.id];
                            if (!dataUrl) return;
                            const link = document.createElement('a');
                            link.href = dataUrl;
                            link.download = `scene-${scene.sceneNum}-${displayTitle.replace(/\s+/g, '-').slice(0, 20)}.png`;
                            link.click();
                          }}
                            title="Download"
                            className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur border border-white/20 flex items-center justify-center text-xs hover:border-lime transition-all">
                            ⬇️
                          </button>
                        </div>
                        {sceneNarration[scene.id] && (
                          <div className="absolute top-1 left-1">
                            <audio src={sceneNarration[scene.id]} controls
                              className="w-24 h-6 opacity-80 hover:opacity-100" />
                          </div>
                        )}
                        {regeneratingScene === scene.id && (
                          <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center">
                            <span className="text-2xl animate-spin">🎨</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Video Generation Panel (NEW — Phase 2) ── */}
              <div className="bg-bg2 border border-cyan/30 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🎥</span>
                    <div>
                      <div className="text-[9px] text-cyan uppercase tracking-widest font-bold">Bring to Life — Video Generation</div>
                      <p className="text-[10px] text-muted">Animate your storyboard images into video clips</p>
                    </div>
                  </div>
                  <button onClick={() => setShowVideoGen(!showVideoGen)}
                    className="text-xs text-muted hover:text-white transition">
                    {showVideoGen ? '▲ Hide' : '▼ Expand'}
                  </button>
                </div>

                {showVideoGen && (
                  <div className="mt-3 pt-3 border-t border-border">
                    {/* Video model selector */}
                    <label className="text-[10px] text-muted font-bold block mb-2">Video Model</label>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {VIDEO_MODELS.map(m => (
                        <button key={m.id} onClick={() => setVideoModel(m.id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                            videoModel === m.id
                              ? 'bg-cyan/15 border border-cyan text-cyan'
                              : 'bg-bg3 border border-border text-muted hover:text-white'
                          }`}>
                          <span>{m.emoji}</span> {m.name}
                          <span className="text-[8px] px-1 py-0.5 rounded bg-rip/20 text-rip">{m.tier}</span>
                        </button>
                      ))}
                    </div>

                    {/* Video progress */}
                    {videoGenerating && (
                      <div className="mb-3">
                        <div className="h-2 bg-bg3 rounded-full overflow-hidden mb-2">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${videoProgress}%`, background: 'linear-gradient(90deg,#00d4ff,#a855f7)' }} />
                        </div>
                        <p className="text-xs text-muted">{videoStage}</p>
                      </div>
                    )}

                    {/* Generate videos button */}
                    <button onClick={generateVideos}
                      disabled={videoGenerating || Object.keys(sceneImages).length === 0}
                      className="w-full py-3 rounded-xl font-display text-sm tracking-wide text-white transition-all hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(90deg,#00d4ff,#a855f7)' }}>
                      {videoGenerating ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="animate-spin">🎬</span> Generating Videos... {videoProgress}%
                        </span>
                      ) : Object.keys(sceneVideos).length > 0 ? (
                        `✅ ${Object.keys(sceneVideos).length} Videos Generated — Regenerate?`
                      ) : (
                        '🎬 Generate Video Clips'
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Action buttons grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button onClick={downloadAllImages} disabled={downloadingAll}
                  className="p-4 bg-bg2 border border-border rounded-xl hover:border-lime transition-all group text-left disabled:opacity-50">
                  <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">{downloadingAll ? '⏳' : '⬇️'}</span>
                  <div className="text-sm font-bold text-white">{downloadingAll ? 'Downloading...' : 'Download'}</div>
                  <div className="text-[10px] text-muted">{Object.keys(sceneImages).length} scene images</div>
                </button>

                <button onClick={() => onOpenEditor(resultData)}
                  className="p-4 bg-bg2 border border-border rounded-xl hover:border-cyan transition-all group text-left">
                  <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">✂️</span>
                  <div className="text-sm font-bold text-white">Edit</div>
                  <div className="text-[10px] text-muted">CapCut-style editor</div>
                </button>

                <button className="p-4 bg-bg2 border border-border rounded-xl hover:border-purple transition-all group text-left">
                  <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">💎</span>
                  <div className="text-sm font-bold text-white">Mint NFT</div>
                  <div className="text-[10px] text-muted">Solo or Collection</div>
                </button>

                <div className="relative">
                  <button onClick={() => setShowShareMenu(!showShareMenu)}
                    className="w-full p-4 bg-bg2 border border-border rounded-xl hover:border-rip transition-all group text-left">
                    <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">📤</span>
                    <div className="text-sm font-bold text-white">Share</div>
                    <div className="text-[10px] text-muted">Social media</div>
                  </button>

                  {showShareMenu && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-bg3 border border-bord2 rounded-xl p-2 shadow-2xl z-50">
                      {SOCIAL_PLATFORMS.map(p => (
                        <button key={p.id} onClick={() => handleShare(p.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-muted hover:text-white hover:bg-bg2 transition-all">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
                            style={{ backgroundColor: p.color + '30', color: p.color || '#fff' }}>{p.icon}</span>
                          {p.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Publish to RemixIP */}
              <button className="w-full py-4 rounded-xl font-display text-xl tracking-wide text-white transition-all hover:brightness-110 mb-3"
                style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7,#00d4ff)' }}>
                ☽ Publish to RemixIP
              </button>
              <p className="text-center text-[10px] text-muted">
                Published creations appear on RxTV / RxMovies with a shareable link and optional NFT minting
              </p>

              {/* Toast */}
              {shareToast && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-lime text-black px-4 py-2 rounded-full text-xs font-bold shadow-2xl z-[200] animate-bounce">
                  {shareToast}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
