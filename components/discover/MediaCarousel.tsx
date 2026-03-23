'use client';
// components/discover/MediaCarousel.tsx
// Horizontal carousel of TV shows and movies for creators to select and reimagine
// Massive library + Create Your Own IP + Mashup builder
import { useState, useRef } from 'react';

// ── Types ───────────────────────────────────────────────────────
export type MediaItem = {
  id: string;
  title: string;
  year: string;
  genre: string;
  category: 'TV Show' | 'Movie' | 'Custom';
  gradient: string;
  emoji: string;
  description: string;
  tags: string[];
};

// ═══════════════════════════════════════════════════════════════
//  TV SHOWS — 40+ titles across genres
// ═══════════════════════════════════════════════════════════════
export const TV_SHOWS: MediaItem[] = [
  // Drama / Crime
  { id: 'breaking-bad',     title: 'Breaking Bad',       year: '2008–2013', genre: 'Crime Drama',      category: 'TV Show', gradient: 'linear-gradient(135deg, #1a5e1a, #0a2f0a)', emoji: '🧪', description: 'A chemistry teacher turned meth kingpin',        tags: ['drama','crime','heisenberg'] },
  { id: 'game-of-thrones',  title: 'Game of Thrones',    year: '2011–2019', genre: 'Epic Fantasy',     category: 'TV Show', gradient: 'linear-gradient(135deg, #1a1a3e, #0d0d1a)', emoji: '⚔️', description: 'Noble families battle for the Iron Throne',       tags: ['fantasy','medieval','dragons'] },
  { id: 'the-sopranos',     title: 'The Sopranos',       year: '1999–2007', genre: 'Crime Drama',      category: 'TV Show', gradient: 'linear-gradient(135deg, #2a1a0a, #150d05)', emoji: '🤌', description: 'A mob boss balances family and organized crime',   tags: ['crime','mafia','drama'] },
  { id: 'the-wire',         title: 'The Wire',           year: '2002–2008', genre: 'Crime Drama',      category: 'TV Show', gradient: 'linear-gradient(135deg, #1a2a3e, #0d1520)', emoji: '🏙️', description: 'Baltimore\'s drug trade from all angles',          tags: ['crime','urban','social'] },
  { id: 'peaky-blinders',   title: 'Peaky Blinders',     year: '2013–2022', genre: 'Crime Drama',      category: 'TV Show', gradient: 'linear-gradient(135deg, #2a1a0a, #0f0a05)', emoji: '🎩', description: 'Birmingham gang in post-WWI England',             tags: ['crime','period','british'] },
  { id: 'better-call-saul', title: 'Better Call Saul',   year: '2015–2022', genre: 'Crime Drama',      category: 'TV Show', gradient: 'linear-gradient(135deg, #3a2a0a, #1d1505)', emoji: '⚖️', description: 'How Jimmy McGill became Saul Goodman',            tags: ['crime','legal','prequel'] },
  { id: 'ozark',            title: 'Ozark',              year: '2017–2022', genre: 'Crime Thriller',   category: 'TV Show', gradient: 'linear-gradient(135deg, #0a2a3e, #051520)', emoji: '💰', description: 'Money laundering in the Missouri Ozarks',         tags: ['crime','thriller','family'] },
  { id: 'succession',       title: 'Succession',         year: '2018–2023', genre: 'Drama',            category: 'TV Show', gradient: 'linear-gradient(135deg, #2a2a1a, #15150d)', emoji: '🏦', description: 'A media dynasty\'s power struggle',               tags: ['drama','wealth','family'] },

  // Sci-Fi / Fantasy / Horror
  { id: 'stranger-things',  title: 'Stranger Things',    year: '2016–2025', genre: 'Sci-Fi Horror',    category: 'TV Show', gradient: 'linear-gradient(135deg, #8b0000, #2d0a0a)', emoji: '🔦', description: 'Kids vs the Upside Down in 1980s Hawkins',        tags: ['scifi','horror','80s'] },
  { id: 'the-last-of-us',   title: 'The Last of Us',     year: '2023–',     genre: 'Post-Apocalyptic', category: 'TV Show', gradient: 'linear-gradient(135deg, #3d5a1f, #1a2a0a)', emoji: '🍄', description: 'Survival in a fungal apocalypse',                 tags: ['drama','survival','adaptation'] },
  { id: 'the-mandalorian',  title: 'The Mandalorian',    year: '2019–',     genre: 'Sci-Fi Western',   category: 'TV Show', gradient: 'linear-gradient(135deg, #3a2a0a, #1a1205)', emoji: '🪖', description: 'A lone bounty hunter in the Star Wars galaxy',    tags: ['starwars','scifi','western'] },
  { id: 'wednesday',        title: 'Wednesday',          year: '2022–',     genre: 'Mystery Comedy',   category: 'TV Show', gradient: 'linear-gradient(135deg, #1a1a2e, #0a0a14)', emoji: '🖤', description: 'Wednesday Addams at Nevermore Academy',           tags: ['mystery','comedy','gothic'] },
  { id: 'the-walking-dead', title: 'The Walking Dead',   year: '2010–2022', genre: 'Horror Drama',     category: 'TV Show', gradient: 'linear-gradient(135deg, #2a1a1a, #150d0d)', emoji: '🧟', description: 'Surviving in a zombie apocalypse',                tags: ['horror','zombie','survival'] },
  { id: 'black-mirror',     title: 'Black Mirror',       year: '2011–',     genre: 'Sci-Fi Anthology', category: 'TV Show', gradient: 'linear-gradient(135deg, #0a0a1e, #050510)', emoji: '📱', description: 'Dark tales of technology gone wrong',              tags: ['scifi','anthology','dystopia'] },
  { id: 'westworld',        title: 'Westworld',          year: '2016–2022', genre: 'Sci-Fi',           category: 'TV Show', gradient: 'linear-gradient(135deg, #3a2a1a, #1d150d)', emoji: '🤠', description: 'AI hosts in a wild west theme park',              tags: ['scifi','ai','western'] },
  { id: 'the-witcher',      title: 'The Witcher',        year: '2019–',     genre: 'Dark Fantasy',     category: 'TV Show', gradient: 'linear-gradient(135deg, #1a1a2e, #0d0d17)', emoji: '🗡️', description: 'A mutant monster hunter roams the Continent',     tags: ['fantasy','monsters','medieval'] },
  { id: 'house-of-dragon',  title: 'House of the Dragon',year: '2022–',     genre: 'Epic Fantasy',     category: 'TV Show', gradient: 'linear-gradient(135deg, #3e1a1a, #200d0d)', emoji: '🐉', description: 'The Targaryen civil war',                         tags: ['fantasy','dragons','prequel'] },

  // Comedy
  { id: 'the-office',       title: 'The Office',         year: '2005–2013', genre: 'Comedy',           category: 'TV Show', gradient: 'linear-gradient(135deg, #2d4a2d, #1a2e1a)', emoji: '📎', description: 'Life at Dunder Mifflin Paper Company',            tags: ['comedy','mockumentary','workplace'] },
  { id: 'friends',          title: 'Friends',            year: '1994–2004', genre: 'Sitcom',           category: 'TV Show', gradient: 'linear-gradient(135deg, #4a2d4a, #2e1a2e)', emoji: '☕', description: 'Six friends navigate life in NYC',                tags: ['comedy','sitcom','nyc'] },
  { id: 'seinfeld',         title: 'Seinfeld',          year: '1989–1998', genre: 'Sitcom',           category: 'TV Show', gradient: 'linear-gradient(135deg, #4a4a2d, #2e2e1a)', emoji: '🥨', description: 'A show about nothing in New York City',           tags: ['comedy','sitcom','iconic'] },
  { id: 'its-always-sunny', title: 'It\'s Always Sunny', year: '2005–',     genre: 'Dark Comedy',      category: 'TV Show', gradient: 'linear-gradient(135deg, #4a3a0a, #2e2405)', emoji: '🍺', description: 'Five terrible people run a bar in Philly',        tags: ['comedy','dark','bar'] },
  { id: 'malcolm-middle',   title: 'Malcolm in the Middle', year: '2000–2006', genre: 'Sitcom',        category: 'TV Show', gradient: 'linear-gradient(135deg, #2d4a4a, #1a2e2e)', emoji: '🧒', description: 'A genius kid in a dysfunctional family',          tags: ['comedy','family','coming-of-age'] },
  { id: 'arrested-dev',     title: 'Arrested Development', year: '2003–2019', genre: 'Sitcom',         category: 'TV Show', gradient: 'linear-gradient(135deg, #4a3a2d, #2e241a)', emoji: '🍌', description: 'A wealthy family loses everything',               tags: ['comedy','satire','family'] },
  { id: 'the-simpsons',     title: 'The Simpsons',       year: '1989–',     genre: 'Animated Comedy',  category: 'TV Show', gradient: 'linear-gradient(135deg, #cccc00, #3a3a00)', emoji: '🍩', description: 'America\'s favorite dysfunctional family',        tags: ['cartoon','comedy','satire'] },
  { id: 'south-park',       title: 'South Park',         year: '1997–',     genre: 'Animated Comedy',  category: 'TV Show', gradient: 'linear-gradient(135deg, #2d4a2d, #172517)', emoji: '🎒', description: 'Four foul-mouthed kids in a Colorado town',       tags: ['cartoon','satire','adult'] },
  { id: 'rick-and-morty',   title: 'Rick and Morty',     year: '2013–',     genre: 'Animated Sci-Fi',  category: 'TV Show', gradient: 'linear-gradient(135deg, #00cc44, #003a12)', emoji: '🧪', description: 'Interdimensional adventures of a mad scientist',   tags: ['cartoon','scifi','adult'] },
  { id: 'family-guy',       title: 'Family Guy',         year: '1999–',     genre: 'Animated Comedy',  category: 'TV Show', gradient: 'linear-gradient(135deg, #2d3a4a, #1a2430)', emoji: '🐕', description: 'The Griffins\' absurd adventures in Quahog',       tags: ['cartoon','comedy','adult'] },
  { id: 'archer',           title: 'Archer',             year: '2009–2023', genre: 'Animated Comedy',  category: 'TV Show', gradient: 'linear-gradient(135deg, #1a1a3e, #0d0d20)', emoji: '🕶️', description: 'A narcissistic spy and his dysfunctional team',    tags: ['cartoon','spy','comedy'] },
  { id: 'bobs-burgers',     title: 'Bob\'s Burgers',     year: '2011–',     genre: 'Animated Comedy',  category: 'TV Show', gradient: 'linear-gradient(135deg, #cc3300, #3a0e00)', emoji: '🍔', description: 'A family runs a burger joint next to a crematorium', tags: ['cartoon','family','comedy'] },
  { id: 'parks-and-rec',    title: 'Parks and Recreation', year: '2009–2015', genre: 'Comedy',          category: 'TV Show', gradient: 'linear-gradient(135deg, #2d6a2d, #1a3e1a)', emoji: '🌳', description: 'Leslie Knope runs the Parks Department in Pawnee', tags: ['comedy','mockumentary','government'] },
  { id: 'american-dad',     title: 'American Dad!',      year: '2005–',     genre: 'Animated Comedy',  category: 'TV Show', gradient: 'linear-gradient(135deg, #0a2a5e, #05152f)', emoji: '🇺🇸', description: 'A CIA agent and his alien, goldfish, and family',  tags: ['cartoon','comedy','adult','satire'] },
  { id: 'celebrity-deathmatch', title: 'Celebrity Deathmatch', year: '1998–2007', genre: 'Animated Comedy', category: 'TV Show', gradient: 'linear-gradient(135deg, #cc0000, #3a0000)', emoji: '🥊', description: 'Claymation celebrities fight to the death',       tags: ['cartoon','comedy','claymation','fighting'] },
  { id: 'robot-chicken',    title: 'Robot Chicken',      year: '2005–',     genre: 'Animated Comedy',  category: 'TV Show', gradient: 'linear-gradient(135deg, #4a4a0a, #252505)', emoji: '🐔', description: 'Stop-motion sketches parodying pop culture',       tags: ['cartoon','sketch','adult','parody'] },

  // Anime
  { id: 'attack-on-titan',  title: 'Attack on Titan',    year: '2013–2023', genre: 'Action Anime',     category: 'TV Show', gradient: 'linear-gradient(135deg, #4a1a0a, #200a05)', emoji: '⚡', description: 'Humanity fights giant humanoid Titans',            tags: ['anime','action','dark'] },
  { id: 'naruto',           title: 'Naruto',             year: '2002–2017', genre: 'Shōnen Anime',     category: 'TV Show', gradient: 'linear-gradient(135deg, #cc6600, #3a1e00)', emoji: '🍥', description: 'A young ninja\'s path to becoming Hokage',        tags: ['anime','ninja','shonen'] },
  { id: 'one-piece',        title: 'One Piece',          year: '1999–',     genre: 'Adventure Anime',  category: 'TV Show', gradient: 'linear-gradient(135deg, #cc0000, #3a0000)', emoji: '🏴‍☠️', description: 'Pirates search for the ultimate treasure',        tags: ['anime','adventure','pirates'] },
  { id: 'demon-slayer',     title: 'Demon Slayer',       year: '2019–',     genre: 'Action Anime',     category: 'TV Show', gradient: 'linear-gradient(135deg, #2a0a3e, #150520)', emoji: '🔥', description: 'A boy fights demons to save his sister',           tags: ['anime','action','supernatural'] },
  { id: 'death-note',       title: 'Death Note',         year: '2006–2007', genre: 'Thriller Anime',   category: 'TV Show', gradient: 'linear-gradient(135deg, #0a0a1e, #050510)', emoji: '📓', description: 'A notebook that kills anyone whose name is written in it', tags: ['anime','thriller','psychological'] },
  { id: 'dragon-ball-z',    title: 'Dragon Ball Z',      year: '1989–1996', genre: 'Action Anime',     category: 'TV Show', gradient: 'linear-gradient(135deg, #cc8800, #3a2600)', emoji: '🐲', description: 'Warriors protect Earth from powerful foes',        tags: ['anime','action','classic'] },
  { id: 'jujutsu-kaisen',   title: 'Jujutsu Kaisen',     year: '2020–',     genre: 'Action Anime',     category: 'TV Show', gradient: 'linear-gradient(135deg, #1a0a3e, #0d0520)', emoji: '👁️', description: 'Sorcerers battle cursed spirits',                 tags: ['anime','action','supernatural'] },
  { id: 'my-hero-academia', title: 'My Hero Academia',   year: '2016–',     genre: 'Superhero Anime',  category: 'TV Show', gradient: 'linear-gradient(135deg, #0a3a0a, #051d05)', emoji: '💪', description: 'A quirkless boy aims to be the greatest hero',     tags: ['anime','superhero','school'] },

  // Cartoons / Kids
  { id: 'spongebob',        title: 'SpongeBob',          year: '1999–',     genre: 'Cartoon Comedy',   category: 'TV Show', gradient: 'linear-gradient(135deg, #cccc00, #3a3a00)', emoji: '🧽', description: 'Adventures under the sea in Bikini Bottom',       tags: ['cartoon','comedy','kids'] },
  { id: 'avatar-tla',       title: 'Avatar: The Last Airbender', year: '2005–2008', genre: 'Animated Fantasy', category: 'TV Show', gradient: 'linear-gradient(135deg, #0a3a5e, #051d2f)', emoji: '🌊', description: 'The Avatar must master all four elements', tags: ['cartoon','fantasy','epic'] },
  { id: 'adventure-time',   title: 'Adventure Time',     year: '2010–2018', genre: 'Animated Fantasy',  category: 'TV Show', gradient: 'linear-gradient(135deg, #0088cc, #002a3a)', emoji: '⚔️', description: 'Finn and Jake\'s adventures in the Land of Ooo',   tags: ['cartoon','fantasy','absurd'] },
  { id: 'gravity-falls',    title: 'Gravity Falls',      year: '2012–2016', genre: 'Animated Mystery',  category: 'TV Show', gradient: 'linear-gradient(135deg, #2d4a2d, #172517)', emoji: '🔺', description: 'Twins uncover supernatural secrets in Oregon',     tags: ['cartoon','mystery','supernatural'] },
  { id: 'addams-family',    title: 'The Addams Family',  year: '1964–1966', genre: 'Comedy Horror',     category: 'TV Show', gradient: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)', emoji: '🪦', description: 'A macabre family who delight in the grotesque',    tags: ['comedy','horror','classic','gothic'] },

  // Reality / Thriller / Other
  { id: 'squid-game',       title: 'Squid Game',         year: '2021–',     genre: 'Thriller',         category: 'TV Show', gradient: 'linear-gradient(135deg, #ff2d78, #3a0a1e)', emoji: '🔺', description: 'Deadly children\'s games for cash prizes',        tags: ['thriller','korean','survival'] },
  { id: 'money-heist',      title: 'Money Heist',        year: '2017–2021', genre: 'Heist Thriller',   category: 'TV Show', gradient: 'linear-gradient(135deg, #cc0000, #3a0000)', emoji: '🎭', description: 'Robbers take on the Royal Mint of Spain',         tags: ['thriller','heist','spanish'] },
  { id: 'dark',             title: 'Dark',               year: '2017–2020', genre: 'Sci-Fi Mystery',   category: 'TV Show', gradient: 'linear-gradient(135deg, #0a0a2e, #050517)', emoji: '⏰', description: 'Time travel secrets in a German town',             tags: ['scifi','mystery','german'] },
  { id: 'euphoria',         title: 'Euphoria',           year: '2019–',     genre: 'Teen Drama',       category: 'TV Show', gradient: 'linear-gradient(135deg, #4a0a4a, #250525)', emoji: '💊', description: 'Teens navigate love, drugs and identity',         tags: ['drama','teen','visual'] },
  { id: 'yellowstone',      title: 'Yellowstone',        year: '2018–',     genre: 'Neo-Western',      category: 'TV Show', gradient: 'linear-gradient(135deg, #3a2a0a, #1d1505)', emoji: '🐎', description: 'A ranching family fights to protect their land',   tags: ['western','drama','family'] },
];

// ═══════════════════════════════════════════════════════════════
//  MOVIES — 40+ titles across genres
// ═══════════════════════════════════════════════════════════════
export const MOVIES: MediaItem[] = [
  // Superhero / Action
  { id: 'the-dark-knight',   title: 'The Dark Knight',              year: '2008', genre: 'Superhero',       category: 'Movie', gradient: 'linear-gradient(135deg, #0a0a2e, #050514)', emoji: '🦇', description: 'Batman faces the Joker in Gotham City',           tags: ['superhero','action','thriller'] },
  { id: 'avengers-endgame',  title: 'Avengers: Endgame',            year: '2019', genre: 'Superhero',       category: 'Movie', gradient: 'linear-gradient(135deg, #2a0a3e, #140520)', emoji: '🛡️', description: 'The Avengers assemble one final time',            tags: ['marvel','superhero','epic'] },
  { id: 'spider-verse',      title: 'Spider-Verse',                 year: '2023', genre: 'Animated Superhero', category: 'Movie', gradient: 'linear-gradient(135deg, #cc0044, #3a0012)', emoji: '🕷️', description: 'Miles Morales swings across the multiverse',       tags: ['animated','superhero','multiverse'] },
  { id: 'black-panther',     title: 'Black Panther',                year: '2018', genre: 'Superhero',       category: 'Movie', gradient: 'linear-gradient(135deg, #1a0a3e, #0d0520)', emoji: '🐾', description: 'The king of Wakanda defends his nation',           tags: ['superhero','marvel','afrofuturism'] },
  { id: 'logan',             title: 'Logan',                        year: '2017', genre: 'Superhero Drama',  category: 'Movie', gradient: 'linear-gradient(135deg, #2a2a1a, #15150d)', emoji: '🔪', description: 'An aging Wolverine protects a young mutant',       tags: ['superhero','western','emotional'] },
  { id: 'john-wick',         title: 'John Wick',                    year: '2014', genre: 'Action',           category: 'Movie', gradient: 'linear-gradient(135deg, #0a0a2e, #050514)', emoji: '🐕', description: 'A retired hitman seeks vengeance',                 tags: ['action','assassin','stylish'] },
  { id: 'mad-max-fury-road', title: 'Mad Max: Fury Road',           year: '2015', genre: 'Action',           category: 'Movie', gradient: 'linear-gradient(135deg, #cc6600, #3a1e00)', emoji: '🔥', description: 'High-speed chase across a wasteland',              tags: ['action','dystopia','vehicles'] },

  // Sci-Fi
  { id: 'inception',         title: 'Inception',                    year: '2010', genre: 'Sci-Fi Thriller',  category: 'Movie', gradient: 'linear-gradient(135deg, #1a2a4a, #0a1020)', emoji: '🌀', description: 'Thieves who steal secrets from dreams',            tags: ['scifi','mindbending','heist'] },
  { id: 'interstellar',      title: 'Interstellar',                 year: '2014', genre: 'Sci-Fi Drama',     category: 'Movie', gradient: 'linear-gradient(135deg, #0a1a2e, #050d17)', emoji: '🕳️', description: 'A journey through space to save humanity',         tags: ['scifi','space','emotional'] },
  { id: 'the-matrix',        title: 'The Matrix',                   year: '1999', genre: 'Sci-Fi Action',    category: 'Movie', gradient: 'linear-gradient(135deg, #003300, #001a00)', emoji: '💊', description: 'Wake up to the real world',                       tags: ['scifi','cyberpunk','action'] },
  { id: 'blade-runner-2049', title: 'Blade Runner 2049',            year: '2017', genre: 'Sci-Fi Neo-Noir',  category: 'Movie', gradient: 'linear-gradient(135deg, #3a2a0a, #1d1505)', emoji: '🌆', description: 'A blade runner hunts a buried secret',             tags: ['scifi','noir','dystopia'] },
  { id: 'dune',              title: 'Dune',                         year: '2024', genre: 'Sci-Fi Epic',      category: 'Movie', gradient: 'linear-gradient(135deg, #cc8800, #3a2600)', emoji: '🏜️', description: 'Paul Atreides leads the Fremen on Arrakis',        tags: ['scifi','epic','desert'] },
  { id: 'alien',             title: 'Alien',                        year: '1979', genre: 'Sci-Fi Horror',    category: 'Movie', gradient: 'linear-gradient(135deg, #0a1a0a, #050d05)', emoji: '👽', description: 'A crew encounters a deadly alien lifeform',        tags: ['scifi','horror','classic'] },

  // Horror / Thriller
  { id: 'it',                title: 'IT',                           year: '2017', genre: 'Horror',           category: 'Movie', gradient: 'linear-gradient(135deg, #cc0000, #3a0000)', emoji: '🎈', description: 'A shapeshifting clown terrorizes kids in Derry',    tags: ['horror','clown','stephenkng'] },
  { id: 'get-out',           title: 'Get Out',                      year: '2017', genre: 'Horror Thriller',  category: 'Movie', gradient: 'linear-gradient(135deg, #0a1a2e, #050d17)', emoji: '🫖', description: 'A visit to the girlfriend\'s family goes wrong',   tags: ['horror','thriller','social'] },
  { id: 'the-shining',       title: 'The Shining',                  year: '1980', genre: 'Psychological Horror', category: 'Movie', gradient: 'linear-gradient(135deg, #3a0a0a, #1d0505)', emoji: '🪓', description: 'All work and no play at the Overlook Hotel',     tags: ['horror','psychological','classic'] },
  { id: 'hereditary',        title: 'Hereditary',                   year: '2018', genre: 'Horror',           category: 'Movie', gradient: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)', emoji: '👑', description: 'A family unravels after grandma dies',             tags: ['horror','family','dread'] },
  { id: 'us',                title: 'Us',                           year: '2019', genre: 'Horror Thriller',  category: 'Movie', gradient: 'linear-gradient(135deg, #cc0000, #3a0000)', emoji: '✂️', description: 'A family confronts their doppelgängers',           tags: ['horror','thriller','doppelganger'] },

  // Drama / Classics
  { id: 'pulp-fiction',      title: 'Pulp Fiction',                 year: '1994', genre: 'Crime Drama',      category: 'Movie', gradient: 'linear-gradient(135deg, #3a1a0a, #1d0d05)', emoji: '💼', description: 'Interlocking stories of crime in LA',              tags: ['crime','tarantino','classic'] },
  { id: 'fight-club',        title: 'Fight Club',                   year: '1999', genre: 'Drama',            category: 'Movie', gradient: 'linear-gradient(135deg, #3a0a1a, #1d050d)', emoji: '🧼', description: 'First rule: you do not talk about Fight Club',     tags: ['drama','psychological','cult'] },
  { id: 'joker',             title: 'Joker',                        year: '2019', genre: 'Crime Drama',      category: 'Movie', gradient: 'linear-gradient(135deg, #003300, #001a00)', emoji: '🤡', description: 'A failed comedian descends into madness',          tags: ['crime','psychological','dc'] },
  { id: 'parasite',          title: 'Parasite',                     year: '2019', genre: 'Thriller Drama',   category: 'Movie', gradient: 'linear-gradient(135deg, #2a2a1a, #15150d)', emoji: '🪨', description: 'A poor family infiltrates a rich household',       tags: ['thriller','korean','class'] },
  { id: 'oppenheimer',       title: 'Oppenheimer',                  year: '2023', genre: 'Historical Drama',  category: 'Movie', gradient: 'linear-gradient(135deg, #3a2a0a, #1d1505)', emoji: '⚛️', description: 'The father of the atomic bomb',                   tags: ['historical','war','nolan'] },
  { id: 'everything-everywhere', title: 'Everything Everywhere',    year: '2022', genre: 'Sci-Fi Comedy',    category: 'Movie', gradient: 'linear-gradient(135deg, #4a0a4a, #250525)', emoji: '🥯', description: 'A multiverse-hopping laundromat owner saves reality', tags: ['scifi','comedy','multiverse'] },
  { id: 'goodfellas',        title: 'Goodfellas',                   year: '1990', genre: 'Crime Drama',      category: 'Movie', gradient: 'linear-gradient(135deg, #3a1a0a, #1d0d05)', emoji: '🔫', description: 'Rise and fall of a mob associate',                 tags: ['crime','mafia','classic'] },
  { id: 'the-godfather',     title: 'The Godfather',                year: '1972', genre: 'Crime Drama',      category: 'Movie', gradient: 'linear-gradient(135deg, #1a1a0a, #0d0d05)', emoji: '🫒', description: 'An offer you can\'t refuse',                      tags: ['crime','mafia','classic'] },

  // Comedy / Family
  { id: 'addams-family-movie', title: 'The Addams Family',          year: '1991', genre: 'Comedy Horror',    category: 'Movie', gradient: 'linear-gradient(135deg, #1a1a1a, #0a0a0a)', emoji: '🪦', description: 'The kookiest family on the block',                tags: ['comedy','horror','family','gothic'] },
  { id: 'superbad',          title: 'Superbad',                     year: '2007', genre: 'Comedy',           category: 'Movie', gradient: 'linear-gradient(135deg, #cc6600, #3a1e00)', emoji: '🍻', description: 'Two teens try to party before graduation',         tags: ['comedy','teen','party'] },
  { id: 'step-brothers',     title: 'Step Brothers',                year: '2008', genre: 'Comedy',           category: 'Movie', gradient: 'linear-gradient(135deg, #2d4a4a, #1a2e2e)', emoji: '🥁', description: 'Two middle-aged men become stepbrothers',          tags: ['comedy','absurd','willferrell'] },
  { id: 'scary-movie',       title: 'Scary Movie',                  year: '2000', genre: 'Comedy Horror',    category: 'Movie', gradient: 'linear-gradient(135deg, #3a0a1a, #1d050d)', emoji: '😱', description: 'A hilarious parody of horror films',               tags: ['comedy','parody','horror'] },

  // Animated
  { id: 'shrek',             title: 'Shrek',                        year: '2001', genre: 'Animated Comedy',   category: 'Movie', gradient: 'linear-gradient(135deg, #006600, #003300)', emoji: '🧅', description: 'An ogre rescues a princess to save his swamp',     tags: ['animated','comedy','fairy-tale'] },
  { id: 'toy-story',         title: 'Toy Story',                    year: '1995', genre: 'Animated',          category: 'Movie', gradient: 'linear-gradient(135deg, #0066cc, #00264a)', emoji: '🤠', description: 'Toys come alive when humans aren\'t looking',     tags: ['animated','pixar','classic'] },
  { id: 'spirited-away',     title: 'Spirited Away',                year: '2001', genre: 'Animated Fantasy',  category: 'Movie', gradient: 'linear-gradient(135deg, #0088cc, #002a3a)', emoji: '🐉', description: 'A girl works in a spirit world bathhouse',         tags: ['anime','ghibli','fantasy'] },
  { id: 'the-lion-king',     title: 'The Lion King',                year: '1994', genre: 'Animated Drama',    category: 'Movie', gradient: 'linear-gradient(135deg, #cc6600, #3a1e00)', emoji: '🦁', description: 'A young lion prince reclaims his throne',           tags: ['animated','disney','classic'] },
  { id: 'finding-nemo',      title: 'Finding Nemo',                 year: '2003', genre: 'Animated Comedy',   category: 'Movie', gradient: 'linear-gradient(135deg, #0066cc, #00264a)', emoji: '🐠', description: 'A clownfish searches the ocean for his son',       tags: ['animated','pixar','ocean'] },
  { id: 'frozen',            title: 'Frozen',                       year: '2013', genre: 'Animated Musical',  category: 'Movie', gradient: 'linear-gradient(135deg, #88ccff, #264a66)', emoji: '❄️', description: 'A queen with ice powers and her brave sister',     tags: ['animated','disney','musical'] },
];

// ═══════════════════════════════════════════════════════════════
//  SPECIAL CARDS — Create Your Own + Mashup
// ═══════════════════════════════════════════════════════════════

const CREATE_OWN_CARD: MediaItem = {
  id: 'create-your-own',
  title: 'Create Your Own IP',
  year: 'Original',
  genre: 'Your Idea',
  category: 'Custom',
  gradient: 'linear-gradient(135deg, #ff2d78, #a855f7, #00d4ff)',
  emoji: '✨',
  description: 'Build an original show, movie, or universe from scratch',
  tags: ['custom','original','create'],
};

const MASHUP_CARD: MediaItem = {
  id: 'mashup-builder',
  title: 'Mashup / Crossover',
  year: 'Remix',
  genre: 'Multi-IP',
  category: 'Custom',
  gradient: 'linear-gradient(135deg, #8aff00, #00d4ff, #a855f7)',
  emoji: '🔀',
  description: 'Combine two or more shows/movies into one universe',
  tags: ['mashup','crossover','remix'],
};

// ═══════════════════════════════════════════════════════════════
//  GENRE FILTERS
// ═══════════════════════════════════════════════════════════════

const TV_GENRES = ['All', 'Drama', 'Comedy', 'Sci-Fi', 'Anime', 'Cartoon', 'Horror', 'Thriller'];
const MOVIE_GENRES = ['All', 'Action', 'Sci-Fi', 'Horror', 'Drama', 'Comedy', 'Animated'];

function matchesGenreFilter(item: MediaItem, filter: string): boolean {
  if (filter === 'All') return true;
  return item.genre.toLowerCase().includes(filter.toLowerCase()) || item.tags.some(t => t.toLowerCase().includes(filter.toLowerCase()));
}

// ═══════════════════════════════════════════════════════════════
//  CAROUSEL COMPONENT
// ═══════════════════════════════════════════════════════════════

function Carousel({ title, subtitle, items, onSelect, genreFilters }: {
  title: string;
  subtitle: string;
  items: MediaItem[];
  onSelect: (item: MediaItem) => void;
  genreFilters?: string[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft]   = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [activeGenre, setActiveGenre]       = useState('All');
  const [search, setSearch]                 = useState('');

  // Filter items
  const filteredItems = items.filter(item => {
    if (!matchesGenreFilter(item, activeGenre)) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.title.toLowerCase().includes(q) || item.genre.toLowerCase().includes(q) || item.tags.some(t => t.includes(q));
    }
    return true;
  });

  function checkScroll() {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  }

  function scroll(direction: 'left' | 'right') {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === 'left' ? -400 : 400, behavior: 'smooth' });
    setTimeout(checkScroll, 400);
  }

  return (
    <div className="mb-8">
      {/* Header row */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <h3 className="font-display text-xl sm:text-2xl text-white tracking-wide">{title}</h3>
          <p className="text-xs text-muted">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden sm:block">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="bg-bg2 border border-border rounded-lg pl-3 pr-7 py-1.5 text-xs text-white w-36 outline-none focus:border-rip placeholder:text-muted2" />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-white text-xs">✕</button>
            )}
          </div>
          {/* Arrows */}
          <button onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="w-8 h-8 rounded-full border border-border bg-bg2 text-muted hover:text-white hover:border-bord2 disabled:opacity-30 flex items-center justify-center transition-all text-sm">
            ←
          </button>
          <button onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="w-8 h-8 rounded-full border border-border bg-bg2 text-muted hover:text-white hover:border-bord2 disabled:opacity-30 flex items-center justify-center transition-all text-sm">
            →
          </button>
        </div>
      </div>

      {/* Genre filters */}
      {genreFilters && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          {genreFilters.map(g => (
            <button key={g} onClick={() => setActiveGenre(g)}
              className={`shrink-0 px-3 py-1 rounded-full text-[10px] font-bold transition-all ${
                activeGenre === g
                  ? 'bg-rip/15 border border-rip text-rip'
                  : 'bg-bg2 border border-border text-muted hover:text-white'
              }`}>{g}</button>
          ))}
        </div>
      )}

      {/* Scroll container */}
      <div ref={scrollRef} onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto scroll-smooth pb-2 snap-x"
        style={{ scrollbarWidth: 'none' }}>

        {/* Special cards first */}
        {items === TV_SHOWS && (
          <>
            <SpecialCard item={CREATE_OWN_CARD} onSelect={onSelect} />
            <SpecialCard item={MASHUP_CARD} onSelect={onSelect} />
          </>
        )}

        {filteredItems.map(item => (
          <MediaCard key={item.id} item={item} onSelect={onSelect} />
        ))}

        {filteredItems.length === 0 && (
          <div className="flex items-center justify-center min-w-[200px] h-[220px] text-sm text-muted2">
            No matches found
          </div>
        )}
      </div>
    </div>
  );
}

// ── Media Card ──────────────────────────────────────────────────
function MediaCard({ item, onSelect }: { item: MediaItem; onSelect: (item: MediaItem) => void }) {
  return (
    <button onClick={() => onSelect(item)}
      className="snap-start shrink-0 w-[160px] sm:w-[180px] group relative rounded-xl overflow-hidden border border-border hover:border-rip transition-all hover:scale-[1.03] active:scale-[0.98]">
      {/* Poster */}
      <div className="aspect-[2/3] relative" style={{ background: item.gradient }}>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-5xl group-hover:scale-125 transition-transform duration-300">{item.emoji}</span>
        </div>
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-3">
          <span className="text-white font-display text-sm tracking-wide">☽ Reimagine</span>
          <p className="text-[9px] text-white/70 text-center leading-tight">{item.description}</p>
        </div>
        {/* Badge */}
        <div className="absolute top-2 left-2">
          <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-black/50 backdrop-blur text-white/80">{item.year}</span>
        </div>
      </div>
      {/* Info */}
      <div className="bg-bg2 p-2.5">
        <div className="text-xs font-bold text-white truncate">{item.title}</div>
        <div className="text-[10px] text-muted truncate">{item.genre}</div>
      </div>
    </button>
  );
}

// ── Special Card (Create Own / Mashup) ──────────────────────────
function SpecialCard({ item, onSelect }: { item: MediaItem; onSelect: (item: MediaItem) => void }) {
  return (
    <button onClick={() => onSelect(item)}
      className="snap-start shrink-0 w-[160px] sm:w-[180px] group relative rounded-xl overflow-hidden border-2 border-dashed border-rip/50 hover:border-rip transition-all hover:scale-[1.03] active:scale-[0.98]">
      <div className="aspect-[2/3] relative" style={{ background: item.gradient }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
          <span className="text-5xl mb-2 group-hover:scale-125 transition-transform duration-300">{item.emoji}</span>
          <span className="text-white font-display text-sm tracking-wide">{item.title}</span>
          <p className="text-[9px] text-white/70 mt-1 leading-tight">{item.description}</p>
        </div>
      </div>
      <div className="bg-bg2 p-2.5">
        <div className="text-xs font-bold text-rip">{item.title}</div>
        <div className="text-[10px] text-muted">{item.genre}</div>
      </div>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
//  EXPORTED COMPONENT
// ═══════════════════════════════════════════════════════════════

export function MediaCarousels({ onSelectMedia }: { onSelectMedia: (item: MediaItem) => void }) {
  return (
    <div>
      <Carousel
        title="📺 TV Shows"
        subtitle={`${TV_SHOWS.length} shows · Pick one to reimagine or create your own`}
        items={TV_SHOWS}
        onSelect={onSelectMedia}
        genreFilters={TV_GENRES}
      />
      <Carousel
        title="🎬 Movies"
        subtitle={`${MOVIES.length} movies · Classic and modern films to remix`}
        items={MOVIES}
        onSelect={onSelectMedia}
        genreFilters={MOVIE_GENRES}
      />
    </div>
  );
}
