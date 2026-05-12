// Debug endpoint: shows the prompts that would be sent to Bedrock at each level
// GET /api/debug/prompt-test?show=Breaking+Bad&scene=Walt+confronts+Gus+in+the+parking+lot
// Returns the raw prompt, pre-processed, LLM rewrite, and ultra-safe versions

import { NextRequest, NextResponse } from 'next/server';
import { buildScenePrompt } from '@/lib/shows';

export async function GET(req: NextRequest) {
  const show = req.nextUrl.searchParams.get('show') || 'Breaking Bad';
  const scene = req.nextUrl.searchParams.get('scene') || 'A tense confrontation in a dimly lit room';

  // Build the full prompt as scene-pipeline.ts would
  const fullPrompt = buildScenePrompt({
    showTitle: show,
    artStyle: 'source-faithful',
    dialogue: [],
    sceneDescription: scene,
    characters: [],
  });

  return NextResponse.json({
    show,
    scene,
    fullPrompt,
    fullPromptLength: fullPrompt.length,
    // Show which words in the prompt would trigger content filters
    triggerWords: findTriggerWords(fullPrompt),
  });
}

function findTriggerWords(prompt: string): string[] {
  const TRIGGER_WORDS = [
    'blood', 'bloody', 'gore', 'kill', 'killing', 'murder', 'dead', 'death',
    'die', 'dying', 'corpse', 'zombie', 'zombies', 'undead', 'gun', 'guns',
    'rifle', 'pistol', 'shotgun', 'weapon', 'weapons', 'sword', 'knife',
    'blade', 'axe', 'machete', 'explosion', 'explode', 'bomb', 'grenade',
    'nude', 'naked', 'sexual', 'torture', 'execution', 'suicide', 'demon',
    'satan', 'satanic', 'skull', 'skeleton', 'coffin', 'graveyard', 'cemetery',
    'walker', 'walkers', 'fight', 'fighting', 'attack', 'horror', 'gruesome',
    'brutal', 'violent', 'violence', 'scream', 'grave', 'funeral', 'armed',
    'scar', 'infected', 'infection', 'fungal', 'evil', 'sinister', 'wicked',
    'hell', 'drug', 'drugs', 'crime', 'criminal', 'prison', 'jail',
    'mafia', 'gang', 'gangster', 'shotgun', 'rage', 'fury', 'wrath',
    'flesh', 'rotting', 'decay', 'poison', 'toxic', 'deadly', 'lethal',
  ];

  const words = prompt.toLowerCase().split(/[\s,.\-;:!?'"()]+/);
  return [...new Set(words.filter(w => TRIGGER_WORDS.includes(w)))];
}
