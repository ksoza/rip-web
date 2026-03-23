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
  category: 'TV Show' | 'Movie';
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
  'Breaking Bad':     [{ id: 'bb1', name: 'Walter White', role: 'Chemistry Teacher / Heisenberg', emoji: '🧪' }, { id: 'bb2', name: 'Jesse Pinkman', role: 'Partner in Crime', emoji: '🎒' }, { id: 'bb3', name: 'Gus Fring', role: 'The Chicken Man', emoji: '🍗' }, { id: 'bb4', name: 'Saul Goodman', role: 'Criminal Lawyer', emoji: '⚖️' }, { id: 'bb5', name: 'Mike Ehrmantraut', role: 'The Fixer', emoji: '🔫' }],
  'Stranger Things':  [{ id: 'st1', name: 'Eleven', role: 'Psychokinetic Hero', emoji: '🧇' }, { id: 'st2', name: 'Dustin Henderson', role: 'The Brains', emoji: '🧢' }, { id: 'st3', name: 'Steve Harrington', role: 'Babysitter King', emoji: '🦇' }, { id: 'st4', name: 'Vecna', role: 'The Villain', emoji: '🕰️' }, { id: 'st5', name: 'Hopper', role: 'The Chief', emoji: '🚔' }],
  'Game of Thrones':  [{ id: 'gt1', name: 'Daenerys Targaryen', role: 'Mother of Dragons', emoji: '🐉' }, { id: 'gt2', name: 'Jon Snow', role: 'King in the North', emoji: '🐺' }, { id: 'gt3', name: 'Tyrion Lannister', role: 'The Imp', emoji: '🍷' }, { id: 'gt4', name: 'Arya Stark', role: 'No One', emoji: '🗡️' }, { id: 'gt5', name: 'Cersei Lannister', role: 'The Queen', emoji: '👑' }],
  'The Office':       [{ id: 'of1', name: 'Michael Scott', role: 'World\'s Best Boss', emoji: '☕' }, { id: 'of2', name: 'Dwight Schrute', role: 'Assistant (to the) Regional Manager', emoji: '🥬' }, { id: 'of3', name: 'Jim Halpert', role: 'Prankster Salesman', emoji: '📎' }, { id: 'of4', name: 'Pam Beesly', role: 'Receptionist / Artist', emoji: '🎨' }, { id: 'of5', name: 'Kevin Malone', role: 'Accountant / Chili Guy', emoji: '🍲' }],
  'Squid Game':       [{ id: 'sg1', name: 'Seong Gi-hun (456)', role: 'The Player', emoji: '🔴' }, { id: 'sg2', name: 'Kang Sae-byeok (067)', role: 'North Korean Defector', emoji: '🔪' }, { id: 'sg3', name: 'Cho Sang-woo (218)', role: 'The Strategist', emoji: '💼' }, { id: 'sg4', name: 'The Front Man', role: 'Game Master', emoji: '🎭' }, { id: 'sg5', name: 'Oh Il-nam (001)', role: 'The Old Man', emoji: '🧓' }],
  'Wednesday':        [{ id: 'wd1', name: 'Wednesday Addams', role: 'Nevermore Detective', emoji: '🖤' }, { id: 'wd2', name: 'Enid Sinclair', role: 'Bubbly Werewolf', emoji: '🐺' }, { id: 'wd3', name: 'Thing', role: 'Helpful Hand', emoji: '🫳' }, { id: 'wd4', name: 'Tyler Galpin', role: 'Barista with Secrets', emoji: '☕' }],
  'The Last of Us':   [{ id: 'tl1', name: 'Joel Miller', role: 'Smuggler / Protector', emoji: '🔨' }, { id: 'tl2', name: 'Ellie Williams', role: 'The Immune One', emoji: '🍄' }, { id: 'tl3', name: 'Tess', role: 'Joel\'s Partner', emoji: '💪' }, { id: 'tl4', name: 'Bill', role: 'Survivalist', emoji: '🏚️' }],
  'Peaky Blinders':   [{ id: 'pb1', name: 'Thomas Shelby', role: 'Boss of the Peaky Blinders', emoji: '🎩' }, { id: 'pb2', name: 'Arthur Shelby', role: 'The Enforcer', emoji: '👊' }, { id: 'pb3', name: 'Polly Gray', role: 'The Matriarch', emoji: '🔮' }, { id: 'pb4', name: 'Alfie Solomons', role: 'Jewish Gang Leader', emoji: '🥊' }],
  'The Mandalorian':  [{ id: 'mn1', name: 'Din Djarin', role: 'The Mandalorian', emoji: '⚔️' }, { id: 'mn2', name: 'Grogu', role: 'The Child', emoji: '💚' }, { id: 'mn3', name: 'Bo-Katan', role: 'Mandalore Royalty', emoji: '👸' }, { id: 'mn4', name: 'Moff Gideon', role: 'Imperial Villain', emoji: '🦹' }],
  'Attack on Titan':  [{ id: 'at1', name: 'Eren Yeager', role: 'The Attack Titan', emoji: '⚡' }, { id: 'at2', name: 'Mikasa Ackerman', role: 'Elite Soldier', emoji: '🗡️' }, { id: 'at3', name: 'Levi Ackerman', role: 'Humanity\'s Strongest', emoji: '🧹' }, { id: 'at4', name: 'Armin Arlert', role: 'The Strategist', emoji: '📖' }],
  'Naruto':           [{ id: 'nr1', name: 'Naruto Uzumaki', role: 'Future Hokage', emoji: '🍥' }, { id: 'nr2', name: 'Sasuke Uchiha', role: 'The Avenger', emoji: '⚡' }, { id: 'nr3', name: 'Kakashi Hatake', role: 'Copy Ninja', emoji: '📕' }, { id: 'nr4', name: 'Sakura Haruno', role: 'Medical Ninja', emoji: '🌸' }],
  'SpongeBob':        [{ id: 'sb1', name: 'SpongeBob SquarePants', role: 'Fry Cook', emoji: '🧽' }, { id: 'sb2', name: 'Patrick Star', role: 'Best Friend', emoji: '⭐' }, { id: 'sb3', name: 'Squidward', role: 'Grumpy Neighbor', emoji: '🎵' }, { id: 'sb4', name: 'Sandy Cheeks', role: 'Scientist Squirrel', emoji: '🐿️' }],
  'The Dark Knight':  [{ id: 'dk1', name: 'Batman / Bruce Wayne', role: 'The Dark Knight', emoji: '🦇' }, { id: 'dk2', name: 'The Joker', role: 'Agent of Chaos', emoji: '🃏' }, { id: 'dk3', name: 'Harvey Dent / Two-Face', role: 'Gotham\'s White Knight', emoji: '🪙' }, { id: 'dk4', name: 'Alfred', role: 'The Butler', emoji: '🎩' }],
  'Inception':        [{ id: 'ic1', name: 'Dom Cobb', role: 'Dream Thief', emoji: '🌀' }, { id: 'ic2', name: 'Mal', role: 'The Shade', emoji: '🖤' }, { id: 'ic3', name: 'Arthur', role: 'The Point Man', emoji: '🎯' }, { id: 'ic4', name: 'Eames', role: 'The Forger', emoji: '🎭' }],
  'Avengers: Endgame':[{ id: 'ae1', name: 'Tony Stark / Iron Man', role: 'Genius Billionaire', emoji: '🤖' }, { id: 'ae2', name: 'Steve Rogers / Cap', role: 'First Avenger', emoji: '🛡️' }, { id: 'ae3', name: 'Thor', role: 'God of Thunder', emoji: '⚡' }, { id: 'ae4', name: 'Thanos', role: 'The Mad Titan', emoji: '🟣' }],
  'Interstellar':     [{ id: 'is1', name: 'Cooper', role: 'Pilot / Father', emoji: '🚀' }, { id: 'is2', name: 'Murph', role: 'The Daughter', emoji: '📚' }, { id: 'is3', name: 'Dr. Brand', role: 'The Scientist', emoji: '🔬' }, { id: 'is4', name: 'TARS', role: 'The Robot', emoji: '🤖' }],
  'The Matrix':       [{ id: 'mx1', name: 'Neo', role: 'The One', emoji: '💊' }, { id: 'mx2', name: 'Morpheus', role: 'The Captain', emoji: '🕶️' }, { id: 'mx3', name: 'Trinity', role: 'The Hacker', emoji: '💻' }, { id: 'mx4', name: 'Agent Smith', role: 'The Program', emoji: '🕴️' }],
  'Pulp Fiction':     [{ id: 'pf1', name: 'Vincent Vega', role: 'Hitman', emoji: '💉' }, { id: 'pf2', name: 'Jules Winnfield', role: 'Philosophical Hitman', emoji: '📖' }, { id: 'pf3', name: 'Mia Wallace', role: 'The Gangster\'s Wife', emoji: '💃' }, { id: 'pf4', name: 'Butch Coolidge', role: 'The Boxer', emoji: '🥊' }],
  'Joker':            [{ id: 'jk1', name: 'Arthur Fleck / Joker', role: 'Failed Comedian', emoji: '🤡' }, { id: 'jk2', name: 'Murray Franklin', role: 'Talk Show Host', emoji: '📺' }, { id: 'jk3', name: 'Sophie Dumond', role: 'The Neighbor', emoji: '🏢' }],
  'Spider-Verse':     [{ id: 'sv1', name: 'Miles Morales', role: 'Spider-Man', emoji: '🕷️' }, { id: 'sv2', name: 'Gwen Stacy', role: 'Spider-Woman', emoji: '🩰' }, { id: 'sv3', name: 'Peter B. Parker', role: 'Tired Spider-Man', emoji: '🍕' }, { id: 'sv4', name: 'Miguel O\'Hara', role: 'Spider-Man 2099', emoji: '🔴' }],
  'Dune':             [{ id: 'dn1', name: 'Paul Atreides', role: 'Muad\'Dib', emoji: '🏜️' }, { id: 'dn2', name: 'Chani', role: 'Fremen Warrior', emoji: '🗡️' }, { id: 'dn3', name: 'Lady Jessica', role: 'Bene Gesserit', emoji: '🔮' }, { id: 'dn4', name: 'Baron Harkonnen', role: 'The Villain', emoji: '🖤' }],
  'Parasite':         [{ id: 'pa1', name: 'Ki-woo', role: 'The Son', emoji: '📚' }, { id: 'pa2', name: 'Ki-taek', role: 'The Father', emoji: '🚗' }, { id: 'pa3', name: 'Mr. Park', role: 'The Rich Man', emoji: '💼' }, { id: 'pa4', name: 'Moon-gwang', role: 'The Housekeeper', emoji: '🏠' }],
  'Oppenheimer':      [{ id: 'op1', name: 'J. Robert Oppenheimer', role: 'Father of the A-Bomb', emoji: '⚛️' }, { id: 'op2', name: 'General Groves', role: 'Military Director', emoji: '🎖️' }, { id: 'op3', name: 'Lewis Strauss', role: 'Political Rival', emoji: '🏛️' }],
  'Everything Everywhere': [{ id: 'ee1', name: 'Evelyn Wang', role: 'Multiverse Jumper', emoji: '🌀' }, { id: 'ee2', name: 'Waymond Wang', role: 'The Kind Husband', emoji: '🫶' }, { id: 'ee3', name: 'Joy / Jobu Tupaki', role: 'The Daughter / Villain', emoji: '🌈' }],
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

  // Characters for this IP
  const characters = CHARACTER_DB[selectedMedia.title] || [];

  // ── Step progression ────────────────────────────────────────
  const STEP_ORDER: WizardStep[] = ['character', 'prompt', 'storyboard', 'generating', 'result'];
  const stepIndex = STEP_ORDER.indexOf(step);

  // ── AI Questions (vidmuse-style) ────────────────────────────
  const AI_QUESTIONS = [
    `What's the main conflict or twist in your ${selectedMedia.title} reimagining?`,
    `How does ${selectedCharacter?.name || 'the character'} react to the situation? What emotions drive them?`,
    `Describe the setting — is it the original world, a new universe, or a mashup?`,
  ];

  // ── Generate storyboard from answers ────────────────────────
  function generateStoryboard() {
    const charName = selectedCharacter?.name || 'Character';
    const selectedTone = TONES.find(t => t.id === tone)?.label || 'Dramatic';
    const emojis = ['🎬', '💫', '🔥', '🌟', '🎭', '💎'];

    const generatedScenes: StoryboardScene[] = [
      { id: 'sc1', sceneNum: 1, description: `Opening: ${charName} in a familiar setting from ${selectedMedia.title}. The mood shifts as something unexpected happens.`, duration: format === 'short' ? '0:00-0:08' : '0:00-0:45', visual: `Wide shot of ${selectedMedia.title}'s iconic location`, emoji: emojis[0] },
      { id: 'sc2', sceneNum: 2, description: `${charName} encounters the core conflict: ${prompt.slice(0, 80)}...`, duration: format === 'short' ? '0:08-0:20' : '0:45-2:30', visual: `Close-up reaction shot, ${selectedTone.toLowerCase()} lighting`, emoji: emojis[1] },
      { id: 'sc3', sceneNum: 3, description: `The tension builds. ${aiQuestions[0]?.a ? aiQuestions[0].a.slice(0, 60) + '...' : `${charName} must make a choice.`}`, duration: format === 'short' ? '0:20-0:35' : '2:30-5:00', visual: `Dynamic camera movement, heightened ${selectedTone.toLowerCase()} atmosphere`, emoji: emojis[2] },
      { id: 'sc4', sceneNum: 4, description: `Climax: The reimagined twist plays out. ${charName} ${aiQuestions[1]?.a ? aiQuestions[1].a.slice(0, 50) : 'faces their destiny'}.`, duration: format === 'short' ? '0:35-0:50' : '5:00-8:00', visual: `Epic wide shot transitioning to intimate close-up`, emoji: emojis[3] },
      { id: 'sc5', sceneNum: 5, description: `Resolution: The aftermath reveals a new perspective on ${selectedMedia.title}'s universe.`, duration: format === 'short' ? '0:50-1:00' : '8:00-10:00', visual: `Callback to opening shot with a twist, fade to black`, emoji: emojis[4] },
    ];

    if (crossover) {
      generatedScenes.splice(2, 0, {
        id: 'sc_xover', sceneNum: 3, description: `Crossover moment: Characters from ${crossover} enter the ${selectedMedia.title} universe, creating unexpected dynamics.`, duration: format === 'short' ? '0:15-0:25' : '2:00-3:30', visual: `Split-screen merging into single frame`, emoji: '🌀',
      });
      // Renumber
      generatedScenes.forEach((s, i) => s.sceneNum = i + 1);
    }

    setScenes(generatedScenes);
    setStep('storyboard');
  }

  // ── Simulated generation ────────────────────────────────────
  function startGeneration() {
    setStep('generating');
    setGenProgress(0);

    const stages = [
      'Analyzing script & characters...',
      'Building visual style guide...',
      'Generating scene compositions...',
      'Rendering key frames...',
      'Applying character consistency...',
      'Adding transitions & effects...',
      'Composing soundtrack...',
      'Adding voiceover...',
      'Final render & polish...',
      'Applying fan-made watermark...',
    ];

    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 12 + 3;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setGenProgress(100);
        setGenStage('Complete! ✨');

        // Build result
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
        }, 800);
      } else {
        setGenProgress(Math.min(progress, 99));
        const stageIdx = Math.floor((progress / 100) * stages.length);
        setGenStage(stages[Math.min(stageIdx, stages.length - 1)]);
      }
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
            <h2 className="font-display text-lg text-white tracking-wide">{selectedMedia.title}</h2>
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
              <h3 className="font-display text-2xl text-white mb-1">Choose a Character</h3>
              <p className="text-sm text-muted mb-6">Pick an existing character from {selectedMedia.title} or create your own</p>

              {/* Existing characters grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                {characters.map(char => (
                  <button key={char.id} onClick={() => { setSelectedCharacter(char); setShowCustomForm(false); }}
                    className={`relative p-4 rounded-xl border text-left transition-all hover:scale-[1.02] ${
                      selectedCharacter?.id === char.id
                        ? 'border-rip bg-rip/10 ring-1 ring-rip'
                        : 'border-border bg-bg2 hover:border-bord2'
                    }`}>
                    <span className="text-3xl mb-2 block">{char.emoji}</span>
                    <div className="text-sm font-bold text-white">{char.name}</div>
                    <div className="text-[10px] text-muted mt-0.5">{char.role}</div>
                    {selectedCharacter?.id === char.id && (
                      <div className="absolute top-2 right-2 w-5 h-5 bg-rip rounded-full flex items-center justify-center text-white text-[10px]">✓</div>
                    )}
                  </button>
                ))}

                {/* Create custom character button */}
                <button onClick={() => { setShowCustomForm(true); setSelectedCharacter(null); }}
                  className={`p-4 rounded-xl border border-dashed text-left transition-all hover:scale-[1.02] ${
                    showCustomForm
                      ? 'border-cyan bg-cyan/5 ring-1 ring-cyan'
                      : 'border-border bg-bg2 hover:border-bord2'
                  }`}>
                  <span className="text-3xl mb-2 block">✨</span>
                  <div className="text-sm font-bold text-white">Create New</div>
                  <div className="text-[10px] text-muted mt-0.5">Original character</div>
                </button>
              </div>

              {/* Custom character form */}
              {showCustomForm && (
                <div className="bg-bg2 border border-cyan/30 rounded-xl p-4 mb-4 space-y-3">
                  <div className="text-[9px] text-cyan uppercase tracking-widest font-bold">New Character</div>
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
                disabled={!selectedCharacter}
                className={`w-full py-3.5 rounded-xl font-display text-lg tracking-wide transition-all ${
                  selectedCharacter
                    ? 'text-white hover:brightness-110'
                    : 'text-muted bg-bg3 border border-border cursor-not-allowed'
                }`}
                style={selectedCharacter ? { background: 'linear-gradient(90deg,#ff2d78,#a855f7)' } : {}}>
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

              {/* Navigation */}
              <div className="flex gap-3">
                <button onClick={() => setStep('character')}
                  className="flex-1 py-3 rounded-xl text-sm font-bold text-muted border border-border hover:border-bord2 transition-all">
                  ← Back
                </button>
                <button onClick={generateStoryboard}
                  disabled={!prompt.trim()}
                  className={`flex-1 py-3.5 rounded-xl font-display text-lg tracking-wide transition-all ${
                    prompt.trim()
                      ? 'text-white hover:brightness-110'
                      : 'text-muted bg-bg3 border border-border cursor-not-allowed'
                  }`}
                  style={prompt.trim() ? { background: 'linear-gradient(90deg,#ff2d78,#a855f7)' } : {}}>
                  Generate Storyboard →
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
              <p className="text-sm text-muted mb-6">Review and edit your scenes before generation. Click any scene to modify it.</p>

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
              <p className="text-sm text-muted mb-8 text-center max-w-md">
                Bringing {selectedCharacter?.name}'s story to life in the {selectedMedia.title} universe...
              </p>

              {/* Progress bar */}
              <div className="w-full max-w-md mb-4">
                <div className="h-2 bg-bg3 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${genProgress}%`, background: 'linear-gradient(90deg,#ff2d78,#a855f7,#00d4ff)' }} />
                </div>
              </div>
              <div className="flex items-center justify-between w-full max-w-md">
                <p className="text-xs text-muted">{genStage}</p>
                <p className="text-xs font-bold text-white">{Math.round(genProgress)}%</p>
              </div>

              {/* Scene previews appearing */}
              <div className="mt-10 grid grid-cols-3 gap-3 w-full max-w-md">
                {scenes.slice(0, Math.ceil(genProgress / 25)).map(scene => (
                  <div key={scene.id} className="aspect-video bg-bg2 border border-border rounded-lg flex items-center justify-center text-2xl animate-pulse">
                    {scene.emoji}
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

              {/* Preview card */}
              <div className="bg-bg2 border border-border rounded-2xl overflow-hidden mb-6">
                <div className="aspect-video flex items-center justify-center relative"
                  style={{ background: resultData.media.gradient }}>
                  <span className="text-8xl opacity-30">{resultData.media.emoji}</span>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-3xl hover:bg-white/30 transition-all">▶</button>
                  </div>
                  <div className="absolute bottom-3 left-3 flex gap-2">
                    <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-bold">{resultData.media.category}</span>
                    <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-bold">{TONES.find(t => t.id === resultData.tone)?.label}</span>
                    <span className="px-2 py-1 rounded-full bg-black/50 backdrop-blur text-white text-[10px] font-bold">{FORMATS.find(f => f.id === resultData.format)?.label}</span>
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
                <button className="p-4 bg-bg2 border border-border rounded-xl hover:border-lime transition-all group text-left">
                  <span className="text-2xl mb-2 block group-hover:scale-110 transition-transform">⬇️</span>
                  <div className="text-sm font-bold text-white">Download</div>
                  <div className="text-[10px] text-muted">MP4 / MOV / GIF</div>
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
