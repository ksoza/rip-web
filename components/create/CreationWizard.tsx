'use client';
// components/create/CreationWizard.tsx
// Full guided creation pipeline: Pick IP → Character → Prompt → Storyboard → Generate → Result
// Inspired by vidmuse.ai iterative Q&A flow
import { useState, useEffect, useRef } from 'react';
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
  imageUrl?: string | null;  // TMDB headshot URL
  tmdbId?: number;
}

interface StoryboardScene {
  id: string;
  sceneNum: number;
  description: string;
  duration: string;
  visual: string;
  emoji: string;
}

type WizardStep = 'character' | 'prompt' | 'storyboard' | 'generating' | 'result';

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
  'The Walking Dead': [{ id: 'wd1b', name: 'Rick Grimes', role: 'The Leader', emoji: '🔫' }, { id: 'wd2b', name: 'Daryl Dixon', role: 'The Survivor', emoji: '🏹' }, { id: 'wd3b', name: 'Negan', role: 'The Villain', emoji: '🏏' }, { id: 'wd4b', name: 'Michonne', role: 'The Warrior', emoji: '🗡️' }],
  'Black Mirror':     [{ id: 'bm1', name: 'Generic Protagonist', role: 'Every Episode\'s Victim', emoji: '📱' }, { id: 'bm2', name: 'The AI', role: 'Technology Gone Wrong', emoji: '🤖' }, { id: 'bm3', name: 'The Government', role: 'Big Brother', emoji: '👁️' }],
  'Westworld':        [{ id: 'ww1', name: 'Dolores Abernathy', role: 'The Awakened Host', emoji: '🤠' }, { id: 'ww2', name: 'Bernard Lowe', role: 'The Creator', emoji: '🧠' }, { id: 'ww3', name: 'The Man in Black', role: 'The Gunslinger', emoji: '🎩' }, { id: 'ww4', name: 'Maeve Millay', role: 'The Madam', emoji: '💃' }],
  'The Witcher':      [{ id: 'wi1', name: 'Geralt of Rivia', role: 'The Witcher', emoji: '🗡️' }, { id: 'wi2', name: 'Yennefer', role: 'The Sorceress', emoji: '🔮' }, { id: 'wi3', name: 'Ciri', role: 'The Princess', emoji: '👸' }, { id: 'wi4', name: 'Jaskier', role: 'The Bard', emoji: '🎵' }],
  'House of the Dragon': [{ id: 'hd1', name: 'Rhaenyra Targaryen', role: 'The Queen Who Never Was', emoji: '🐉' }, { id: 'hd2', name: 'Daemon Targaryen', role: 'The Rogue Prince', emoji: '⚔️' }, { id: 'hd3', name: 'Alicent Hightower', role: 'The Green Queen', emoji: '👑' }],
  // ── TV Shows: Comedy ──
  'The Office':       [{ id: 'of1', name: 'Michael Scott', role: 'World\'s Best Boss', emoji: '☕' }, { id: 'of2', name: 'Dwight Schrute', role: 'Assistant (to the) Regional Manager', emoji: '🥬' }, { id: 'of3', name: 'Jim Halpert', role: 'Prankster Salesman', emoji: '📎' }, { id: 'of4', name: 'Pam Beesly', role: 'Receptionist / Artist', emoji: '🎨' }, { id: 'of5', name: 'Kevin Malone', role: 'Accountant / Chili Guy', emoji: '🍲' }],
  'Friends':          [{ id: 'fr1', name: 'Ross Geller', role: 'The Paleontologist', emoji: '🦕' }, { id: 'fr2', name: 'Rachel Green', role: 'The Fashionista', emoji: '👗' }, { id: 'fr3', name: 'Joey Tribbiani', role: 'The Actor', emoji: '🍕' }, { id: 'fr4', name: 'Chandler Bing', role: 'The Funny One', emoji: '😂' }, { id: 'fr5', name: 'Monica Geller', role: 'The Chef', emoji: '🍳' }, { id: 'fr6', name: 'Phoebe Buffay', role: 'The Free Spirit', emoji: '🎸' }],
  'Seinfeld':         [{ id: 'se1', name: 'Jerry Seinfeld', role: 'The Comedian', emoji: '🎤' }, { id: 'se2', name: 'George Costanza', role: 'The Neurotic', emoji: '🥨' }, { id: 'se3', name: 'Elaine Benes', role: 'The Ex', emoji: '💃' }, { id: 'se4', name: 'Kramer', role: 'The Neighbor', emoji: '🚪' }],
  'It\'s Always Sunny': [{ id: 'ia1', name: 'Dennis Reynolds', role: 'The Golden God', emoji: '⭐' }, { id: 'ia2', name: 'Charlie Kelly', role: 'The Wild Card', emoji: '🐀' }, { id: 'ia3', name: 'Mac', role: 'The Muscle', emoji: '💪' }, { id: 'ia4', name: 'Dee Reynolds', role: 'Sweet Dee', emoji: '🦅' }, { id: 'ia5', name: 'Frank Reynolds', role: 'The Trash Man', emoji: '🗑️' }],
  'Malcolm in the Middle': [{ id: 'mm1', name: 'Malcolm', role: 'The Genius', emoji: '🧒' }, { id: 'mm2', name: 'Hal', role: 'The Dad', emoji: '🛀' }, { id: 'mm3', name: 'Lois', role: 'The Mom', emoji: '📢' }, { id: 'mm4', name: 'Reese', role: 'The Bully', emoji: '👊' }, { id: 'mm5', name: 'Dewey', role: 'The Youngest', emoji: '🎹' }],
  'Arrested Development': [{ id: 'ad1', name: 'Michael Bluth', role: 'The Responsible One', emoji: '📊' }, { id: 'ad2', name: 'GOB', role: 'The Magician', emoji: '🎩' }, { id: 'ad3', name: 'Lucille Bluth', role: 'The Matriarch', emoji: '🍸' }, { id: 'ad4', name: 'Buster Bluth', role: 'The Baby', emoji: '🦞' }],
  'The Simpsons':     [{ id: 'si1', name: 'Homer Simpson', role: 'D\'oh!', emoji: '🍩' }, { id: 'si2', name: 'Bart Simpson', role: 'The Troublemaker', emoji: '🛹' }, { id: 'si3', name: 'Lisa Simpson', role: 'The Genius', emoji: '🎷' }, { id: 'si4', name: 'Marge Simpson', role: 'The Mom', emoji: '💙' }, { id: 'si5', name: 'Mr. Burns', role: 'Excellent', emoji: '💰' }],
  'South Park':       [{ id: 'sop1', name: 'Eric Cartman', role: 'The Antagonist', emoji: '🎒' }, { id: 'sop2', name: 'Stan Marsh', role: 'The Normal One', emoji: '🧢' }, { id: 'sop3', name: 'Kyle Broflovski', role: 'The Voice of Reason', emoji: '🟢' }, { id: 'sop4', name: 'Kenny McCormick', role: 'The Immortal', emoji: '🟠' }],
  'Rick and Morty':   [{ id: 'rm1', name: 'Rick Sanchez', role: 'Mad Scientist', emoji: '🧪' }, { id: 'rm2', name: 'Morty Smith', role: 'The Sidekick', emoji: '😰' }, { id: 'rm3', name: 'Evil Morty', role: 'The Mastermind', emoji: '👁️' }, { id: 'rm4', name: 'Mr. Meeseeks', role: 'Look at Me!', emoji: '🔵' }],
  'Family Guy':       [{ id: 'fg1', name: 'Peter Griffin', role: 'The Dad', emoji: '🍺' }, { id: 'fg2', name: 'Stewie Griffin', role: 'Evil Genius Baby', emoji: '🧸' }, { id: 'fg3', name: 'Brian Griffin', role: 'The Dog', emoji: '🐕' }, { id: 'fg4', name: 'Quagmire', role: 'Giggity', emoji: '😏' }],
  'Archer':           [{ id: 'ar1', name: 'Sterling Archer', role: 'World\'s Most Dangerous Spy', emoji: '🕶️' }, { id: 'ar2', name: 'Lana Kane', role: 'The Better Agent', emoji: '💪' }, { id: 'ar3', name: 'Mallory Archer', role: 'The Boss / Mom', emoji: '🍸' }, { id: 'ar4', name: 'Cyril Figgis', role: 'The Accountant', emoji: '📁' }, { id: 'ar5', name: 'Pam Poovey', role: 'HR / Fighter', emoji: '🥊' }],
  'Bob\'s Burgers':   [{ id: 'bu1', name: 'Bob Belcher', role: 'Burger Dad', emoji: '🍔' }, { id: 'bu2', name: 'Tina Belcher', role: 'The Eldest', emoji: '📓' }, { id: 'bu3', name: 'Louise Belcher', role: 'The Schemer', emoji: '🐰' }, { id: 'bu4', name: 'Gene Belcher', role: 'The Musician', emoji: '🎹' }],
  'Parks and Recreation': [{ id: 'pr1', name: 'Leslie Knope', role: 'Deputy Director of Parks', emoji: '🌳' }, { id: 'pr2', name: 'Ron Swanson', role: 'Director / Libertarian', emoji: '🥩' }, { id: 'pr3', name: 'Andy Dwyer', role: 'Shoe-Shine / Rock Star', emoji: '🎸' }, { id: 'pr4', name: 'April Ludgate', role: 'The Intern', emoji: '🖤' }, { id: 'pr5', name: 'Ben Wyatt', role: 'The Numbers Guy', emoji: '🧮' }],
  'American Dad!':    [{ id: 'amd1', name: 'Stan Smith', role: 'CIA Agent / Dad', emoji: '🇺🇸' }, { id: 'amd2', name: 'Roger', role: 'The Alien', emoji: '👽' }, { id: 'amd3', name: 'Klaus', role: 'The Goldfish', emoji: '🐟' }, { id: 'amd4', name: 'Hayley Smith', role: 'The Liberal Daughter', emoji: '✌️' }, { id: 'amd5', name: 'Steve Smith', role: 'The Nerd Son', emoji: '🤓' }],
  'Celebrity Deathmatch': [{ id: 'cd1', name: 'Johnny Gomez', role: 'Announcer', emoji: '🎤' }, { id: 'cd2', name: 'Nick Diamond', role: 'Co-Announcer', emoji: '💎' }, { id: 'cd3', name: 'Mills Lane', role: 'The Referee', emoji: '🥊' }, { id: 'cd4', name: 'Any Celebrity', role: 'The Fighter', emoji: '⭐' }],
  'Robot Chicken':    [{ id: 'rc1', name: 'The Nerd', role: 'Captive Viewer', emoji: '🤓' }, { id: 'rc2', name: 'The Robot Chicken', role: 'Mad Cyborg Fowl', emoji: '🐔' }, { id: 'rc3', name: 'The Mad Scientist', role: 'Creator', emoji: '🧪' }],
  // ── TV Shows: Anime ──
  'Attack on Titan':  [{ id: 'at1', name: 'Eren Yeager', role: 'The Attack Titan', emoji: '⚡' }, { id: 'at2', name: 'Mikasa Ackerman', role: 'Elite Soldier', emoji: '🗡️' }, { id: 'at3', name: 'Levi Ackerman', role: 'Humanity\'s Strongest', emoji: '🧹' }, { id: 'at4', name: 'Armin Arlert', role: 'The Strategist', emoji: '📖' }],
  'Naruto':           [{ id: 'nr1', name: 'Naruto Uzumaki', role: 'Future Hokage', emoji: '🍥' }, { id: 'nr2', name: 'Sasuke Uchiha', role: 'The Avenger', emoji: '⚡' }, { id: 'nr3', name: 'Kakashi Hatake', role: 'Copy Ninja', emoji: '📕' }, { id: 'nr4', name: 'Sakura Haruno', role: 'Medical Ninja', emoji: '🌸' }],
  'One Piece':        [{ id: 'op1b', name: 'Monkey D. Luffy', role: 'Straw Hat Captain', emoji: '🏴‍☠️' }, { id: 'op2b', name: 'Roronoa Zoro', role: 'Swordsman', emoji: '🗡️' }, { id: 'op3b', name: 'Nami', role: 'Navigator', emoji: '🗺️' }, { id: 'op4b', name: 'Sanji', role: 'The Cook', emoji: '🍳' }],
  'Demon Slayer':     [{ id: 'ds1', name: 'Tanjiro Kamado', role: 'Demon Slayer', emoji: '🔥' }, { id: 'ds2', name: 'Nezuko Kamado', role: 'Demon Sister', emoji: '🎀' }, { id: 'ds3', name: 'Zenitsu', role: 'Thunder Breather', emoji: '⚡' }, { id: 'ds4', name: 'Inosuke', role: 'Boar Head', emoji: '🐗' }],
  'Death Note':       [{ id: 'dtn1', name: 'Light Yagami', role: 'Kira', emoji: '📓' }, { id: 'dtn2', name: 'L', role: 'World\'s Greatest Detective', emoji: '🍰' }, { id: 'dtn3', name: 'Ryuk', role: 'Shinigami', emoji: '🍎' }, { id: 'dtn4', name: 'Misa Amane', role: 'The Second Kira', emoji: '🖤' }],
  'Dragon Ball Z':    [{ id: 'db1', name: 'Goku', role: 'Earth\'s Protector', emoji: '🐲' }, { id: 'db2', name: 'Vegeta', role: 'Prince of Saiyans', emoji: '👑' }, { id: 'db3', name: 'Gohan', role: 'The Scholar', emoji: '📚' }, { id: 'db4', name: 'Frieza', role: 'The Emperor', emoji: '💜' }],
  'Jujutsu Kaisen':   [{ id: 'jj1', name: 'Yuji Itadori', role: 'Sukuna\'s Vessel', emoji: '👁️' }, { id: 'jj2', name: 'Megumi Fushiguro', role: 'Shadow User', emoji: '🐕' }, { id: 'jj3', name: 'Gojo Satoru', role: 'The Strongest', emoji: '💙' }, { id: 'jj4', name: 'Sukuna', role: 'King of Curses', emoji: '😈' }],
  'My Hero Academia': [{ id: 'mh1', name: 'Izuku Midoriya', role: 'Deku', emoji: '💪' }, { id: 'mh2', name: 'Katsuki Bakugo', role: 'Explosion Hero', emoji: '💥' }, { id: 'mh3', name: 'All Might', role: 'Symbol of Peace', emoji: '✊' }, { id: 'mh4', name: 'Shoto Todoroki', role: 'Ice & Fire', emoji: '🔥' }],
  // ── TV Shows: Cartoons ──
  'SpongeBob':        [{ id: 'sb1', name: 'SpongeBob SquarePants', role: 'Fry Cook', emoji: '🧽' }, { id: 'sb2', name: 'Patrick Star', role: 'Best Friend', emoji: '⭐' }, { id: 'sb3', name: 'Squidward', role: 'Grumpy Neighbor', emoji: '🎵' }, { id: 'sb4', name: 'Sandy Cheeks', role: 'Scientist Squirrel', emoji: '🐿️' }],
  'Avatar: The Last Airbender': [{ id: 'av1', name: 'Aang', role: 'The Avatar', emoji: '🌊' }, { id: 'av2', name: 'Zuko', role: 'The Banished Prince', emoji: '🔥' }, { id: 'av3', name: 'Katara', role: 'Waterbender', emoji: '💧' }, { id: 'av4', name: 'Toph', role: 'Earthbender', emoji: '🪨' }, { id: 'av5', name: 'Iroh', role: 'The Tea Uncle', emoji: '🍵' }],
  'Adventure Time':   [{ id: 'adv1', name: 'Finn', role: 'The Human', emoji: '⚔️' }, { id: 'adv2', name: 'Jake', role: 'The Dog', emoji: '🐕' }, { id: 'adv3', name: 'Princess Bubblegum', role: 'The Ruler', emoji: '👑' }, { id: 'adv4', name: 'Marceline', role: 'Vampire Queen', emoji: '🧛' }],
  'Gravity Falls':    [{ id: 'gf1', name: 'Dipper Pines', role: 'The Investigator', emoji: '🔍' }, { id: 'gf2', name: 'Mabel Pines', role: 'The Fun Twin', emoji: '🌈' }, { id: 'gf3', name: 'Grunkle Stan', role: 'The Con Man', emoji: '💰' }, { id: 'gf4', name: 'Bill Cipher', role: 'The Dream Demon', emoji: '🔺' }],
  'The Addams Family': [{ id: 'af1', name: 'Gomez Addams', role: 'The Patriarch', emoji: '🎩' }, { id: 'af2', name: 'Morticia Addams', role: 'The Matriarch', emoji: '🥀' }, { id: 'af3', name: 'Wednesday Addams', role: 'The Daughter', emoji: '🖤' }, { id: 'af4', name: 'Uncle Fester', role: 'The Uncle', emoji: '💡' }, { id: 'af5', name: 'Lurch', role: 'The Butler', emoji: '🚪' }],
  // ── TV Shows: Other ──
  'Squid Game':       [{ id: 'sg1', name: 'Seong Gi-hun (456)', role: 'The Player', emoji: '🔴' }, { id: 'sg2', name: 'Kang Sae-byeok (067)', role: 'North Korean Defector', emoji: '🔪' }, { id: 'sg3', name: 'Cho Sang-woo (218)', role: 'The Strategist', emoji: '💼' }, { id: 'sg4', name: 'The Front Man', role: 'Game Master', emoji: '🎭' }],
  'Money Heist':      [{ id: 'mhst1', name: 'The Professor', role: 'The Mastermind', emoji: '🧠' }, { id: 'mhst2', name: 'Tokyo', role: 'The Narrator', emoji: '🔥' }, { id: 'mhst3', name: 'Berlin', role: 'The Leader', emoji: '🎭' }, { id: 'mhst4', name: 'Denver', role: 'The Loose Cannon', emoji: '😂' }],
  'Dark':             [{ id: 'dk1b', name: 'Jonas Kahnwald', role: 'The Traveler', emoji: '⏰' }, { id: 'dk2b', name: 'Martha Nielsen', role: 'The Other', emoji: '🌀' }, { id: 'dk3b', name: 'Claudia Tiedemann', role: 'The White Devil', emoji: '📖' }],
  'Euphoria':         [{ id: 'eu1', name: 'Rue Bennett', role: 'The Narrator', emoji: '💊' }, { id: 'eu2', name: 'Jules Vaughn', role: 'The Dream', emoji: '🦋' }, { id: 'eu3', name: 'Nate Jacobs', role: 'The Villain', emoji: '🏈' }, { id: 'eu4', name: 'Maddy Perez', role: 'The It Girl', emoji: '💅' }],
  'Yellowstone':      [{ id: 'ys1', name: 'John Dutton', role: 'The Patriarch', emoji: '🐎' }, { id: 'ys2', name: 'Beth Dutton', role: 'The Fierce Daughter', emoji: '🥃' }, { id: 'ys3', name: 'Kayce Dutton', role: 'The Soldier Son', emoji: '🤠' }, { id: 'ys4', name: 'Rip Wheeler', role: 'The Loyal One', emoji: '🐎' }],
  // ── Movies ──
  'The Dark Knight':  [{ id: 'dk1', name: 'Batman / Bruce Wayne', role: 'The Dark Knight', emoji: '🦇' }, { id: 'dk2', name: 'The Joker', role: 'Agent of Chaos', emoji: '🃏' }, { id: 'dk3', name: 'Harvey Dent / Two-Face', role: 'Gotham\'s White Knight', emoji: '🪙' }, { id: 'dk4', name: 'Alfred', role: 'The Butler', emoji: '🎩' }],
  'Avengers: Endgame':[{ id: 'ae1', name: 'Tony Stark / Iron Man', role: 'Genius Billionaire', emoji: '🤖' }, { id: 'ae2', name: 'Steve Rogers / Cap', role: 'First Avenger', emoji: '🛡️' }, { id: 'ae3', name: 'Thor', role: 'God of Thunder', emoji: '⚡' }, { id: 'ae4', name: 'Thanos', role: 'The Mad Titan', emoji: '🟣' }],
  'Spider-Verse':     [{ id: 'sv1', name: 'Miles Morales', role: 'Spider-Man', emoji: '🕷️' }, { id: 'sv2', name: 'Gwen Stacy', role: 'Spider-Woman', emoji: '🩰' }, { id: 'sv3', name: 'Peter B. Parker', role: 'Tired Spider-Man', emoji: '🍕' }, { id: 'sv4', name: 'Miguel O\'Hara', role: 'Spider-Man 2099', emoji: '🔴' }],
  'Black Panther':    [{ id: 'bp1', name: 'T\'Challa', role: 'King of Wakanda', emoji: '🐾' }, { id: 'bp2', name: 'Killmonger', role: 'The Cousin', emoji: '🔥' }, { id: 'bp3', name: 'Shuri', role: 'Tech Genius', emoji: '🔬' }, { id: 'bp4', name: 'Okoye', role: 'General of the Dora Milaje', emoji: '🗡️' }],
  'Inception':        [{ id: 'ic1', name: 'Dom Cobb', role: 'Dream Thief', emoji: '🌀' }, { id: 'ic2', name: 'Mal', role: 'The Shade', emoji: '🖤' }, { id: 'ic3', name: 'Arthur', role: 'The Point Man', emoji: '🎯' }, { id: 'ic4', name: 'Eames', role: 'The Forger', emoji: '🎭' }],
  'Interstellar':     [{ id: 'is1', name: 'Cooper', role: 'Pilot / Father', emoji: '🚀' }, { id: 'is2', name: 'Murph', role: 'The Daughter', emoji: '📚' }, { id: 'is3', name: 'Dr. Brand', role: 'The Scientist', emoji: '🔬' }, { id: 'is4', name: 'TARS', role: 'The Robot', emoji: '🤖' }],
  'The Matrix':       [{ id: 'mx1', name: 'Neo', role: 'The One', emoji: '💊' }, { id: 'mx2', name: 'Morpheus', role: 'The Captain', emoji: '🕶️' }, { id: 'mx3', name: 'Trinity', role: 'The Hacker', emoji: '💻' }, { id: 'mx4', name: 'Agent Smith', role: 'The Program', emoji: '🕴️' }],
  'Dune':             [{ id: 'dn1', name: 'Paul Atreides', role: 'Muad\'Dib', emoji: '🏜️' }, { id: 'dn2', name: 'Chani', role: 'Fremen Warrior', emoji: '🗡️' }, { id: 'dn3', name: 'Lady Jessica', role: 'Bene Gesserit', emoji: '🔮' }, { id: 'dn4', name: 'Baron Harkonnen', role: 'The Villain', emoji: '🖤' }],
  'IT':               [{ id: 'it1', name: 'Pennywise', role: 'The Dancing Clown', emoji: '🎈' }, { id: 'it2', name: 'Bill Denbrough', role: 'The Leader', emoji: '🚲' }, { id: 'it3', name: 'Beverly Marsh', role: 'The Brave One', emoji: '🔥' }, { id: 'it4', name: 'Richie Tozier', role: 'The Comedian', emoji: '🤓' }],
  'Get Out':          [{ id: 'go1', name: 'Chris Washington', role: 'The Photographer', emoji: '📷' }, { id: 'go2', name: 'Rose Armitage', role: 'The Girlfriend', emoji: '🌹' }, { id: 'go3', name: 'Rod Williams', role: 'The Best Friend (TSA)', emoji: '🕵️' }],
  'The Shining':      [{ id: 'sh1', name: 'Jack Torrance', role: 'The Writer', emoji: '🪓' }, { id: 'sh2', name: 'Danny Torrance', role: 'The Shining Kid', emoji: '🧒' }, { id: 'sh3', name: 'Wendy Torrance', role: 'The Mother', emoji: '🏚️' }],
  'Pulp Fiction':     [{ id: 'pf1', name: 'Vincent Vega', role: 'Hitman', emoji: '💉' }, { id: 'pf2', name: 'Jules Winnfield', role: 'Philosophical Hitman', emoji: '📖' }, { id: 'pf3', name: 'Mia Wallace', role: 'The Gangster\'s Wife', emoji: '💃' }, { id: 'pf4', name: 'Butch Coolidge', role: 'The Boxer', emoji: '🥊' }],
  'Fight Club':       [{ id: 'fc1', name: 'The Narrator', role: 'Insomniac Office Worker', emoji: '😴' }, { id: 'fc2', name: 'Tyler Durden', role: 'Soap Salesman / Anarchist', emoji: '🧼' }, { id: 'fc3', name: 'Marla Singer', role: 'The Love Interest', emoji: '🚬' }],
  'Joker':            [{ id: 'jk1', name: 'Arthur Fleck / Joker', role: 'Failed Comedian', emoji: '🤡' }, { id: 'jk2', name: 'Murray Franklin', role: 'Talk Show Host', emoji: '📺' }],
  'Parasite':         [{ id: 'pa1', name: 'Ki-woo', role: 'The Son', emoji: '📚' }, { id: 'pa2', name: 'Ki-taek', role: 'The Father', emoji: '🚗' }, { id: 'pa3', name: 'Mr. Park', role: 'The Rich Man', emoji: '💼' }],
  'Oppenheimer':      [{ id: 'op1', name: 'J. Robert Oppenheimer', role: 'Father of the A-Bomb', emoji: '⚛️' }, { id: 'op2', name: 'General Groves', role: 'Military Director', emoji: '🎖️' }],
  'Everything Everywhere': [{ id: 'ee1', name: 'Evelyn Wang', role: 'Multiverse Jumper', emoji: '🌀' }, { id: 'ee2', name: 'Waymond Wang', role: 'The Kind Husband', emoji: '🫶' }, { id: 'ee3', name: 'Joy / Jobu Tupaki', role: 'The Daughter / Villain', emoji: '🌈' }],
  'The Godfather':    [{ id: 'gf1b', name: 'Vito Corleone', role: 'The Godfather', emoji: '🫒' }, { id: 'gf2b', name: 'Michael Corleone', role: 'The Reluctant Heir', emoji: '🖤' }, { id: 'gf3b', name: 'Sonny Corleone', role: 'The Hot Head', emoji: '🔫' }],
  'John Wick':        [{ id: 'jw1', name: 'John Wick', role: 'Baba Yaga', emoji: '🐕' }, { id: 'jw2', name: 'Winston', role: 'Manager of The Continental', emoji: '🏨' }, { id: 'jw3', name: 'The Bowery King', role: 'Underground King', emoji: '🐦' }],
  'Shrek':            [{ id: 'sk1', name: 'Shrek', role: 'The Ogre', emoji: '🧅' }, { id: 'sk2', name: 'Donkey', role: 'The Sidekick', emoji: '🫏' }, { id: 'sk3', name: 'Princess Fiona', role: 'The Princess', emoji: '👑' }, { id: 'sk4', name: 'Puss in Boots', role: 'The Swordsman', emoji: '🐱' }],
};

// ═══════════════════════════════════════════════════════════════
//  TONE & FORMAT OPTIONS
// ═══════════════════════════════════════════════════════════════

const TONES = [
  { id: 'dramatic',   label: 'Dramatic',     emoji: '🎭' },
  { id: 'comedy',     label: 'Comedy',       emoji: '😂' },
  { id: 'horror',     label: 'Horror',       emoji: '😱' },
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

// ── Art Style Presets (what Runway/Pika/Midjourney offer) ────────
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

// ── Aspect Ratios (critical for TikTok/IG vs YouTube) ────────
const ASPECT_RATIOS = [
  { id: '16:9',  label: '16:9',  desc: 'YouTube / Widescreen',  emoji: '🖥️', width: 1024, height: 576 },
  { id: '9:16',  label: '9:16',  desc: 'TikTok / Reels / Shorts', emoji: '📱', width: 576, height: 1024 },
  { id: '1:1',   label: '1:1',   desc: 'Instagram / Twitter',   emoji: '⬛', width: 1024, height: 1024 },
  { id: '4:3',   label: '4:3',   desc: 'Classic TV',            emoji: '📺', width: 1024, height: 768 },
  { id: '21:9',  label: '21:9',  desc: 'Ultra-Wide / Cinema',   emoji: '🎞️', width: 1024, height: 440 },
];

// ═══════════════════════════════════════════════════════════════
//  MAIN WIZARD COMPONENT
// ═══════════════════════════════════════════════════════════════

export function CreationWizard({ user, selectedMedia, onClose, onOpenEditor }: Props) {
  const [step, setStep] = useState<WizardStep>('character');

  // Character step
  const [selectedCharacter, setSelectedCharacter] = useState<CharacterOption | null>(null);
  const [customCharName, setCustomCharName]       = useState('');
  const [customCharRole, setCustomCharRole]       = useState('');
  const [showCustomForm, setShowCustomForm]       = useState(false);

  // Custom IP / Mashup state
  const isCustomIP = selectedMedia.id === 'create-your-own';
  const isMashup   = selectedMedia.id === 'mashup-builder';
  const [customIPName, setCustomIPName]   = useState('');
  const [customIPGenre, setCustomIPGenre] = useState('');
  const [customIPDesc, setCustomIPDesc]   = useState('');
  const [mashupShows, setMashupShows]     = useState<string[]>(['', '']);

  // Prompt step
  const [prompt, setPrompt]       = useState('');
  const [tone, setTone]           = useState('dramatic');
  const [format, setFormat]       = useState('short');
  const [crossover, setCrossover] = useState('');

  // AI Q&A step (vidmuse-style iterative refinement)
  const [aiQuestions, setAiQuestions]   = useState<{ q: string; a: string }[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [questionPhase, setQuestionPhase] = useState(0);

  // Storyboard step
  const [scenes, setScenes]             = useState<StoryboardScene[]>([]);
  const [editingScene, setEditingScene] = useState<string | null>(null);
  const [sceneEditText, setSceneEditText] = useState('');

  // Generation step
  const [genProgress, setGenProgress]   = useState(0);
  const [genStage, setGenStage]         = useState('');

  // Result step
  const [resultData, setResultData] = useState<ResultData | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareToast, setShareToast] = useState('');

  // AI Model selection
  const [imageModel, setImageModel] = useState('flux-schnell');
  const [storyboardLoading, setStoryboardLoading] = useState(false);
  const [storyboardError, setStoryboardError] = useState('');
  const [sceneImages, setSceneImages] = useState<Record<string, string>>({});
  const [genError, setGenError] = useState('');

  // ── Pro features state ───────────────────────────────────────
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

  // ── TMDB Characters (real images, full cast, no limits) ──────
  const [tmdbCharacters, setTmdbCharacters] = useState<CharacterOption[]>([]);
  const [tmdbLoading, setTmdbLoading] = useState(false);
  const [charSearch, setCharSearch] = useState('');
  const charScrollRef = useRef<HTMLDivElement>(null);

  // Fetch FULL cast from TMDB API on mount (all characters, not just 4-5)
  useEffect(() => {
    if (isCustomIP || !selectedMedia?.id) return;
    setTmdbLoading(true);
    fetch(`/api/tmdb?action=cast&id=${selectedMedia.id}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.characters?.length) {
          setTmdbCharacters(data.characters.map((c: any) => ({
            id: c.id,
            name: c.name,
            role: c.character,
            emoji: '🎭',
            imageUrl: c.imageUrl,
            tmdbId: c.tmdbId,
          })));
        }
      })
      .catch(() => {})
      .finally(() => setTmdbLoading(false));
  }, [selectedMedia?.id, isCustomIP]);

  // Use TMDB characters if available, fall back to hardcoded CHARACTER_DB
  const fallbackChars = CHARACTER_DB[selectedMedia.title] || [];
  const allCharacters = tmdbCharacters.length > 0 ? tmdbCharacters : fallbackChars;

  // Filter characters by search
  const characters = charSearch
    ? allCharacters.filter(c =>
        c.name.toLowerCase().includes(charSearch.toLowerCase()) ||
        c.role.toLowerCase().includes(charSearch.toLowerCase())
      )
    : allCharacters;

  // Display title (accounts for custom)
  const displayTitle = isCustomIP ? (customIPName || 'Your Original IP') : isMashup ? (mashupShows.filter(Boolean).join(' × ') || 'Mashup') : selectedMedia.title;

  // ── Step progression ────────────────────────────────────────
  const STEP_ORDER: WizardStep[] = ['character', 'prompt', 'storyboard', 'generating', 'result'];
  const stepIndex = STEP_ORDER.indexOf(step);

  // ── AI Questions (vidmuse-style) ────────────────────────────
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

  // ── Generate storyboard from answers (REAL AI) ───────────────
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

  // ── Generate a single scene image (used for gen + regen) ─────
  async function generateSceneImage(scene: StoryboardScene): Promise<string | null> {
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
        throw new Error(errData.error || `Image generation failed (${res.status})`);
      }

      const data = await res.json();
      if (data.image) return data.image;
      throw new Error('No image returned');
    }
    return null;
  }

  // ── Regenerate a single scene ────────────────────────────────
  async function regenerateScene(sceneId: string) {
    const scene = scenes.find(s => s.id === sceneId);
    if (!scene) return;
    setRegeneratingScene(sceneId);
    try {
      const img = await generateSceneImage(scene);
      if (img) {
        setSceneImages(prev => ({ ...prev, [sceneId]: img }));
      }
    } catch (err: any) {
      console.error('Regen error:', err);
    } finally {
      setRegeneratingScene(null);
    }
  }

  // ── Generate narration for all scenes ────────────────────────
  async function generateNarration() {
    setNarrationLoading(true);
    for (const scene of scenes) {
      try {
        const res = await fetch('/api/create/narrate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: scene.description, sceneId: scene.id }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.audio) {
            setSceneNarration(prev => ({ ...prev, [scene.id]: data.audio }));
          }
        }
      } catch (err) {
        console.error(`Narration error scene ${scene.sceneNum}:`, err);
      }
    }
    setNarrationLoading(false);
  }

  // ── Download all scene images ────────────────────────────────
  function downloadAllImages() {
    setDownloadingAll(true);
    Object.entries(sceneImages).forEach(([sceneId, dataUrl], idx) => {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `${displayTitle.replace(/[^a-zA-Z0-9]/g, '_')}_scene_${idx + 1}.png`;
      link.click();
    });
    setTimeout(() => setDownloadingAll(false), 1000);
  }

  // ── Download single image ───────────────────────────────────
  function downloadImage(sceneId: string, idx: number) {
    const dataUrl = sceneImages[sceneId];
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${displayTitle.replace(/[^a-zA-Z0-9]/g, '_')}_scene_${idx + 1}.png`;
    link.click();
  }

  // ── Real AI image generation for each scene ──────────────────
  async function startGeneration() {
    setStep('generating');
    setGenProgress(0);
    setGenError('');
    setSceneImages({});
    setGenElapsed(0);

    // Start elapsed timer
    elapsedRef.current = setInterval(() => {
      setGenElapsed(prev => prev + 1);
    }, 1000);

    const totalScenes = scenes.length;
    let completed = 0;

    for (let i = 0; i < totalScenes; i++) {
      const scene = scenes[i];
      setGenStage(`🎨 Scene ${i + 1}/${totalScenes}: ${scene.description.slice(0, 50)}...`);

      try {
        const img = await generateSceneImage(scene);
        if (img) {
          setSceneImages(prev => ({ ...prev, [scene.id]: img }));
        }
      } catch (err: any) {
        console.error(`Scene ${i + 1} generation error:`, err);
        setGenError(prev => prev ? `${prev}, Scene ${i + 1}` : `Failed: Scene ${i + 1}`);
      }

      completed++;
      setGenProgress(Math.round((completed / totalScenes) * 100));
    }

    // Stop elapsed timer
    if (elapsedRef.current) clearInterval(elapsedRef.current);

    setGenStage('Complete! ✨');
    setGenProgress(100);

    setTimeout(() => {
      setResultData({
        title: `${selectedCharacter?.name || 'Character'}: ${prompt.slice(0, 40)}`,
        media: selectedMedia,
        character: selectedCharacter!,
        prompt,
        tone,
        format,
        scenes,
      });
      setStep('result');
    }, 600);
  }

  // ── Share handlers ──────────────────────────────────────────
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
          {STEP_ORDER.filter(s => s !== 'generating').map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                stepIndex > i || (s === 'result' && step === 'result')
                  ? 'bg-lime text-black'
                  : step === s || (step === 'generating' && s === 'storyboard')
                    ? 'bg-rip text-white'
                    : 'bg-bg3 text-muted'
              }`}>{i + 1}</div>
              {i < 3 && <div className={`w-6 h-px ${stepIndex > i ? 'bg-lime' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <button onClick={onClose} className="text-muted hover:text-white text-xl transition">✕</button>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">

          {/* ════════════════════════════════════════════════════════
               STEP 1: CHARACTER SELECTION
             ════════════════════════════════════════════════════════ */}
          {step === 'character' && (
            <div>
              {/* ── Custom IP builder ─────────────────────────────── */}
              {isCustomIP && (
                <>
                  <h3 className="font-display text-2xl text-white mb-1">✨ Create Your Own IP</h3>
                  <p className="text-sm text-muted mb-6">Build an original show, movie, or universe from scratch</p>

                  <div className="bg-bg2 border border-rip/30 rounded-xl p-4 mb-5 space-y-3">
                    <input value={customIPName} onChange={e => setCustomIPName(e.target.value)}
                      placeholder="Name your IP (e.g. 'Neon Ronin', 'The Midnight Bakery')"
                      className="w-full bg-bg3 border border-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-rip placeholder:text-muted2" />
                    <input value={customIPGenre} onChange={e => setCustomIPGenre(e.target.value)}
                      placeholder="Genre (e.g. 'Cyberpunk Western', 'Cozy Horror')"
                      className="w-full bg-bg3 border border-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-rip placeholder:text-muted2" />
                    <textarea value={customIPDesc} onChange={e => setCustomIPDesc(e.target.value)}
                      placeholder="Describe your world in a few sentences..."
                      rows={3}
                      className="w-full bg-bg3 border border-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-rip placeholder:text-muted2 resize-none" />
                  </div>

                  <p className="text-xs text-muted mb-3">Now create your main character:</p>
                </>
              )}

              {/* ── Mashup builder ────────────────────────────────── */}
              {isMashup && (
                <>
                  <h3 className="font-display text-2xl text-white mb-1">🔀 Mashup / Crossover</h3>
                  <p className="text-sm text-muted mb-6">Combine two or more shows/movies into one universe</p>

                  <div className="bg-bg2 border border-lime/30 rounded-xl p-4 mb-5 space-y-3">
                    <div className="text-[9px] text-lime uppercase tracking-widest font-bold mb-2">Shows / Movies to Combine</div>
                    {mashupShows.map((show, i) => (
                      <div key={i} className="flex gap-2">
                        <input value={show} onChange={e => {
                          const updated = [...mashupShows];
                          updated[i] = e.target.value;
                          setMashupShows(updated);
                        }}
                          placeholder={`Show or Movie #${i + 1} (e.g. '${i === 0 ? 'Breaking Bad' : 'The Office'}')`}
                          className="flex-1 bg-bg3 border border-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-lime placeholder:text-muted2" />
                        {mashupShows.length > 2 && (
                          <button onClick={() => setMashupShows(mashupShows.filter((_, j) => j !== i))}
                            className="text-muted hover:text-red-400 text-sm px-2">✕</button>
                        )}
                      </div>
                    ))}
                    {mashupShows.length < 5 && (
                      <button onClick={() => setMashupShows([...mashupShows, ''])}
                        className="text-xs text-lime hover:text-lime/80 font-bold">+ Add another</button>
                    )}
                  </div>

                  <p className="text-xs text-muted mb-3">Choose or create a character for this crossover:</p>
                </>
              )}

              {/* ── Normal IP — character selection ───────────────── */}
              {!isCustomIP && !isMashup && (
                <>
                  <h3 className="font-display text-2xl text-white mb-1">Choose a Character</h3>
                  <p className="text-sm text-muted mb-2">
                    {tmdbCharacters.length > 0
                      ? `${characters.length} characters from ${selectedMedia.title} · Swipe to browse all`
                      : `Pick an existing character from ${selectedMedia.title} or create your own`}
                  </p>
                  {/* Character search */}
                  {characters.length > 8 && (
                    <div className="relative mb-4">
                      <input
                        value={charSearch}
                        onChange={e => setCharSearch(e.target.value)}
                        placeholder={`Search ${characters.length} characters...`}
                        className="w-full bg-bg2 border border-border rounded-lg pl-8 pr-8 py-2 text-sm text-white outline-none focus:border-rip placeholder:text-muted2"
                      />
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted text-sm">🔍</span>
                      {charSearch && (
                        <button onClick={() => setCharSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-white text-xs">✕</button>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Loading state */}
              {tmdbLoading && !isCustomIP && (
                <div className="flex items-center gap-2 mb-4 text-sm text-muted">
                  <span className="animate-spin">⏳</span> Loading full cast from TMDB...
                </div>
              )}

              {/* ── Character Carousel (swipeable, with images) ────── */}
              {characters.length > 0 && !isCustomIP && (
                <>
                  {/* Horizontal scroll carousel */}
                  <div
                    ref={charScrollRef}
                    className="flex gap-3 overflow-x-auto scroll-smooth pb-3 mb-2 snap-x"
                    style={{ scrollbarWidth: 'none' }}
                  >
                    {characters.map(char => (
                      <button
                        key={char.id}
                        onClick={() => { setSelectedCharacter(char); setShowCustomForm(false); }}
                        className={`snap-start shrink-0 w-[120px] sm:w-[140px] group relative rounded-xl overflow-hidden border text-center transition-all hover:scale-[1.03] active:scale-[0.97] ${
                          selectedCharacter?.id === char.id
                            ? 'border-rip ring-2 ring-rip/50 bg-rip/5'
                            : 'border-border bg-bg2 hover:border-bord2'
                        }`}
                      >
                        {/* Character portrait */}
                        <div className="aspect-square relative bg-bg3 overflow-hidden">
                          {char.imageUrl ? (
                            <img
                              src={char.imageUrl}
                              alt={char.name}
                              loading="lazy"
                              className="w-full h-full object-cover object-top"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                              }}
                            />
                          ) : null}
                          {/* Emoji fallback (shown when no image or image fails) */}
                          <div className={`absolute inset-0 flex items-center justify-center ${char.imageUrl ? 'hidden' : ''}`}>
                            <span className="text-4xl">{char.emoji}</span>
                          </div>
                          {/* Selection check */}
                          {selectedCharacter?.id === char.id && (
                            <div className="absolute top-1.5 right-1.5 w-6 h-6 bg-rip rounded-full flex items-center justify-center text-white text-xs shadow-lg">✓</div>
                          )}
                        </div>
                        {/* Name and role */}
                        <div className="p-2">
                          <div className="text-xs font-bold text-white truncate">{char.name}</div>
                          <div className="text-[9px] text-muted truncate">{char.role}</div>
                        </div>
                      </button>
                    ))}

                    {/* Create custom character button (at end of carousel) */}
                    <button
                      onClick={() => { setShowCustomForm(true); setSelectedCharacter(null); }}
                      className={`snap-start shrink-0 w-[120px] sm:w-[140px] rounded-xl overflow-hidden border-2 border-dashed transition-all hover:scale-[1.03] ${
                        showCustomForm ? 'border-cyan bg-cyan/5' : 'border-border bg-bg2 hover:border-bord2'
                      }`}
                    >
                      <div className="aspect-square flex flex-col items-center justify-center">
                        <span className="text-3xl mb-1">✨</span>
                        <span className="text-xs font-bold text-white">Create New</span>
                      </div>
                      <div className="p-2">
                        <div className="text-[9px] text-muted text-center">Original character</div>
                      </div>
                    </button>
                  </div>

                  {/* Character count indicator */}
                  <div className="text-[10px] text-muted2 mb-4">
                    {tmdbCharacters.length > 0
                      ? `⟵ Swipe to see all ${characters.length} characters ⟶`
                      : `${characters.length} characters available`
                    }
                  </div>
                </>
              )}

              {/* Custom character form (shown for custom IP, mashup, or when "Create New" is clicked) */}
              {(showCustomForm || isCustomIP || (isMashup && characters.length === 0)) && (
                <div className="bg-bg2 border border-cyan/30 rounded-xl p-4 mb-4 space-y-3">
                  <div className="text-[9px] text-cyan uppercase tracking-widest font-bold">
                    {isCustomIP ? 'Your Main Character' : isMashup ? 'Crossover Character' : 'New Character'}
                  </div>
                  <input value={customCharName} onChange={e => setCustomCharName(e.target.value)}
                    placeholder="Character name"
                    className="w-full bg-bg3 border border-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-cyan placeholder:text-muted2" />
                  <input value={customCharRole} onChange={e => setCustomCharRole(e.target.value)}
                    placeholder="Role or description (e.g. 'A time-traveling chef')"
                    className="w-full bg-bg3 border border-border rounded-lg px-3 py-2.5 text-white text-sm outline-none focus:border-cyan placeholder:text-muted2" />
                  <button onClick={() => {
                    if (customCharName.trim()) {
                      const custom: CharacterOption = { id: 'custom_' + Date.now(), name: customCharName, role: customCharRole || 'Original Character', emoji: '✨', isCustom: true };
                      setSelectedCharacter(custom);
                    }
                  }}
                    disabled={!customCharName.trim()}
                    className="px-4 py-2 rounded-lg bg-cyan/10 border border-cyan text-cyan text-xs font-bold hover:bg-cyan/20 transition-all disabled:opacity-40">
                    Create Character
                  </button>
                </div>
              )}

              {/* Next button */}
              <button onClick={() => setStep('prompt')}
                disabled={!selectedCharacter || (isCustomIP && !customIPName.trim()) || (isMashup && mashupShows.filter(Boolean).length < 2)}
                className={`w-full py-3.5 rounded-xl font-display text-lg tracking-wide transition-all ${
                  selectedCharacter && (!isCustomIP || customIPName.trim()) && (!isMashup || mashupShows.filter(Boolean).length >= 2)
                    ? 'text-white hover:brightness-110'
                    : 'text-muted bg-bg3 border border-border cursor-not-allowed'
                }`}
                style={selectedCharacter && (!isCustomIP || customIPName.trim()) && (!isMashup || mashupShows.filter(Boolean).length >= 2) ? { background: 'linear-gradient(90deg,#ff2d78,#a855f7)' } : {}}>
                Continue with {selectedCharacter?.name || '...'} →
              </button>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
               STEP 2: PROMPT + AI Q&A (vidmuse style)
             ════════════════════════════════════════════════════════ */}
          {step === 'prompt' && (
            <div>
              <h3 className="font-display text-2xl text-white mb-1">Describe Your Vision</h3>
              <p className="text-sm text-muted mb-6">Tell us your idea — then we'll ask a few questions to refine it (like vidmuse.ai)</p>

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

              {/* ── Art Style ──────────────────────────────────────── */}
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

              {/* ── Aspect Ratio ────────────────────────────────────── */}
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

              {/* ── AI Model + Advanced ────────────────────────────── */}
              <div className="mb-4 bg-bg2 border border-lime/30 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🤖</span>
                  <div className="text-[9px] text-lime uppercase tracking-widest font-bold">AI Engine</div>
                  <button onClick={() => setShowAdvanced(!showAdvanced)}
                    className="ml-auto text-[9px] text-muted hover:text-white transition-all">
                    {showAdvanced ? '▲ Hide Advanced' : '▼ Advanced'}
                  </button>
                </div>

                <div className="mb-3">
                  <label className="text-[10px] text-muted font-bold block mb-1.5">Image Generation Model</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'flux-schnell', name: 'FLUX.1 Schnell', desc: 'Fast', emoji: '⚡' },
                      { id: 'flux-dev', name: 'FLUX.1 Dev', desc: 'Best quality', emoji: '🎨' },
                      { id: 'sdxl', name: 'SDXL', desc: 'Stable Diffusion', emoji: '🖼️' },
                      { id: 'playground', name: 'Playground v2.5', desc: 'Aesthetic', emoji: '✨' },
                    ].map(m => (
                      <button key={m.id} onClick={() => setImageModel(m.id)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                          imageModel === m.id
                            ? 'bg-lime/15 border border-lime text-lime'
                            : 'bg-bg3 border border-border text-muted hover:text-white'
                        }`}>
                        <span>{m.emoji}</span> {m.name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Advanced settings (collapsible) */}
                {showAdvanced && (
                  <div className="mt-3 pt-3 border-t border-border space-y-3">
                    <div>
                      <label className="text-[10px] text-muted font-bold block mb-1">Negative Prompt</label>
                      <textarea value={negativePrompt}
                        onChange={e => setNegativePrompt(e.target.value)}
                        placeholder="Things to avoid in generation..."
                        className="w-full bg-bg3 border border-border rounded-lg px-3 py-2 text-xs text-white placeholder:text-muted/50 resize-none focus:border-lime/50 focus:outline-none"
                        rows={2} />
                      <p className="text-[9px] text-muted mt-1">Comma-separated list of things to exclude from generated images</p>
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-muted mt-3">
                  📝 <span className="text-purple font-bold">Claude Sonnet</span> → 
                  🎨 <span className="text-lime font-bold">{
                    { 'flux-schnell': 'FLUX.1 Schnell', 'flux-dev': 'FLUX.1 Dev', 'sdxl': 'SDXL', 'playground': 'Playground v2.5' }[imageModel] || imageModel
                  }</span> → 
                  🖼️ <span className="text-cyan font-bold">{aspectRatio}</span> → 
                  🎬 <span className="text-rip font-bold">{STYLES.find(s => s.id === artStyle)?.label || 'Cinematic'}</span>
                </div>
              </div>

              {/* Storyboard error */}
              {storyboardError && (
                <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2">
                  <span>❌</span>
                  <p className="text-xs text-red-400">{storyboardError}</p>
                  <button onClick={() => setStoryboardError('')} className="ml-auto text-muted hover:text-white text-xs">✕</button>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3">
                <button onClick={() => setStep('character')}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-muted border border-border hover:border-bord2 transition-all">
                  ← Back
                </button>
                <button onClick={generateStoryboard}
                  disabled={!prompt.trim() || storyboardLoading}
                  className={`flex-1 py-3.5 rounded-xl font-display text-lg tracking-wide transition-all ${
                    prompt.trim() && !storyboardLoading
                      ? 'text-white hover:brightness-110'
                      : 'text-muted bg-bg3 border border-border cursor-not-allowed'
                  }`}
                  style={prompt.trim() && !storyboardLoading ? { background: 'linear-gradient(90deg,#ff2d78,#a855f7)' } : {}}>
                  {storyboardLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="animate-spin">🧠</span> AI Writing Scenes...
                    </span>
                  ) : (
                    'Generate Storyboard →'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
               STEP 3: STORYBOARD REVIEW
             ════════════════════════════════════════════════════════ */}
          {step === 'storyboard' && (
            <div>
              <h3 className="font-display text-2xl text-white mb-1">Storyboard</h3>
              <p className="text-sm text-muted mb-2">Review and edit your scenes before generation. Click any scene to modify it.</p>

              {/* Config summary bar */}
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="px-2.5 py-1 rounded-full bg-rip/10 border border-rip/30 text-rip text-[10px] font-bold">
                  🎨 {STYLES.find(s => s.id === artStyle)?.label || 'Cinematic'}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-cyan/10 border border-cyan/30 text-cyan text-[10px] font-bold">
                  📐 {aspectRatio}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-lime/10 border border-lime/30 text-lime text-[10px] font-bold">
                  🤖 {({ 'flux-schnell': 'FLUX Schnell', 'flux-dev': 'FLUX Dev', 'sdxl': 'SDXL', 'playground': 'Playground' } as Record<string, string>)[imageModel] || imageModel}
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
                <button onClick={() => setStep('prompt')}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-muted border border-border hover:border-bord2 transition-all">
                  ← Edit Prompt
                </button>
                <button onClick={startGeneration}
                  className="flex-1 py-3.5 rounded-xl font-display text-lg tracking-wide text-white transition-all hover:brightness-110"
                  style={{ background: 'linear-gradient(90deg,#ff2d78,#a855f7)' }}>
                  ☽ Generate →
                </button>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════
               STEP 4: GENERATING (animated progress)
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
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan/10 border border-cyan/30 text-cyan font-bold">
                  {aspectRatio}
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

              {/* Generation error */}
              {genError && (
                <div className="mt-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex items-center gap-2 w-full max-w-md">
                  <span>❌</span>
                  <p className="text-xs text-red-400">{genError}</p>
                </div>
              )}

              {/* Scene images appearing as they generate */}
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
               STEP 5: RESULT — Download / NFT / Share / Edit
             ════════════════════════════════════════════════════════ */}
          {step === 'result' && resultData && (
            <div>
              <div className="text-center mb-6">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="font-display text-3xl text-white mb-1">Your Creation is Ready!</h3>
                <p className="text-sm text-muted">{resultData.media.title} × {resultData.character.name}</p>
              </div>

              {/* Preview card — show hero image or fallback gradient */}
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
                    <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-bold">{FORMATS.find(f => f.id === resultData.format)?.label}</span>
                    <span className="px-2 py-1 rounded-full bg-rip/40 backdrop-blur text-white text-[10px] font-bold">🎨 {STYLES.find(s => s.id === artStyle)?.label}</span>
                    <span className="px-2 py-1 rounded-full bg-cyan/40 backdrop-blur text-white text-[10px] font-bold">📐 {aspectRatio}</span>
                  </div>
                  {/* Fan-made watermark */}
                  <div className="absolute top-3 right-3 px-2 py-1 rounded bg-black/40 backdrop-blur text-white/70 text-[8px] font-mono">
                    FAN-MADE · remixip.com
                  </div>
                </div>
                <div className="p-4">
                  <h4 className="font-display text-xl text-white mb-1">{resultData.title}</h4>
                  <p className="text-xs text-muted">{resultData.character.emoji} {resultData.character.name} · {resultData.prompt.slice(0, 80)}...</p>
                </div>
              </div>

              {/* Generated scene gallery — with regen, download, narration per scene */}
              {Object.keys(sceneImages).length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-muted uppercase tracking-widest">🎬 Generated Scenes</h4>
                    <div className="flex gap-2">
                      <button onClick={generateNarration} disabled={narrationLoading}
                        className="px-3 py-1.5 rounded-lg bg-purple/10 border border-purple/30 text-purple text-[10px] font-bold hover:bg-purple/20 transition-all disabled:opacity-50">
                        {narrationLoading ? '🔊 Generating...' : '🔊 Narrate All'}
                      </button>
                      <button onClick={downloadAllImages} disabled={downloadingAll}
                        className="px-3 py-1.5 rounded-lg bg-lime/10 border border-lime/30 text-lime text-[10px] font-bold hover:bg-lime/20 transition-all disabled:opacity-50">
                        {downloadingAll ? '⏳ Downloading...' : '⬇️ Download All'}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {scenes.map((scene, i) => (
                      <div key={scene.id} className="relative group">
                        {sceneImages[scene.id] ? (
                          <img src={sceneImages[scene.id]} alt={`Scene ${i + 1}`}
                            className="aspect-video object-cover rounded-xl border border-border group-hover:border-rip transition-all" />
                        ) : (
                          <div className="aspect-video bg-bg3 border border-border rounded-xl flex items-center justify-center text-2xl opacity-40">
                            {scene.emoji}
                          </div>
                        )}
                        {/* Overlay label */}
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent rounded-b-xl">
                          <span className="text-[10px] text-white font-bold">Scene {scene.sceneNum}</span>
                          <p className="text-[9px] text-white/60 line-clamp-1">{scene.description.slice(0, 60)}</p>
                        </div>
                        {/* Action buttons overlay */}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button onClick={() => regenerateScene(scene.id)}
                            disabled={regeneratingScene === scene.id}
                            title="Regenerate"
                            className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur border border-white/20 flex items-center justify-center text-xs hover:border-rip transition-all disabled:animate-spin">
                            🔄
                          </button>
                          <button onClick={() => {
                            const link = document.createElement('a');
                            link.href = sceneImages[scene.id];
                            link.download = `scene-${scene.sceneNum}-${displayTitle.replace(/\s+/g, '-').slice(0, 20)}.png`;
                            link.click();
                          }}
                            title="Download"
                            className="w-7 h-7 rounded-lg bg-black/70 backdrop-blur border border-white/20 flex items-center justify-center text-xs hover:border-lime transition-all">
                            ⬇️
                          </button>
                        </div>
                        {/* Narration audio player */}
                        {sceneNarration[scene.id] && (
                          <div className="absolute top-1 left-1">
                            <audio src={sceneNarration[scene.id]} controls
                              className="w-24 h-6 opacity-80 hover:opacity-100" />
                          </div>
                        )}
                        {/* Regen spinner overlay */}
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

              {/* Watermark notice */}
              <div className="bg-[#1a1a08] border border-gold/30 rounded-xl p-3 mb-6 flex items-center gap-3">
                <span className="text-lg">⚠️</span>
                <div className="flex-1">
                  <p className="text-xs text-gold font-bold">Fan-Made Watermark Active</p>
                  <p className="text-[10px] text-muted">Remove watermark with the $5/mo Creator+ plan</p>
                </div>
                <button className="px-3 py-1.5 rounded-lg bg-gold/10 border border-gold/30 text-gold text-[10px] font-bold hover:bg-gold/20 transition-all">
                  Upgrade
                </button>
              </div>

              {/* Action buttons grid */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                {/* Download */}
                <button onClick={downloadAllImages} disabled={downloadingAll}
                  className="p-4 bg-bg2 border border-border rounded-xl hover:border-lime transition-all group text-left disabled:opacity-50">
                  <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">{downloadingAll ? '⏳' : '⬇️'}</span>
                  <div className="text-sm font-bold text-white">{downloadingAll ? 'Downloading...' : 'Download'}</div>
                  <div className="text-[10px] text-muted">{Object.keys(sceneImages).length} scene images</div>
                </button>

                {/* Edit (opens timeline editor) */}
                <button onClick={() => onOpenEditor(resultData)}
                  className="p-4 bg-bg2 border border-border rounded-xl hover:border-cyan transition-all group text-left">
                  <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">✂️</span>
                  <div className="text-sm font-bold text-white">Edit</div>
                  <div className="text-[10px] text-muted">CapCut-style editor</div>
                </button>

                {/* Mint NFT */}
                <button className="p-4 bg-bg2 border border-border rounded-xl hover:border-purple transition-all group text-left">
                  <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">💎</span>
                  <div className="text-sm font-bold text-white">Mint NFT</div>
                  <div className="text-[10px] text-muted">Solo or Collection</div>
                </button>

                {/* Share */}
                <div className="relative">
                  <button onClick={() => setShowShareMenu(!showShareMenu)}
                    className="w-full p-4 bg-bg2 border border-border rounded-xl hover:border-rip transition-all group text-left">
                    <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">📤</span>
                    <div className="text-sm font-bold text-white">Share</div>
                    <div className="text-[10px] text-muted">Social media</div>
                  </button>

                  {/* Share dropdown */}
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
                Published creations appear on the RemixIP viewing platform with a shareable link and optional NFT minting link
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
