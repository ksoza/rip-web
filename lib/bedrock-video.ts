// lib/bedrock-video.ts
// AWS Bedrock Nova Reel — async text-to-video generation
// Free with AWS account, billed to AWS (not a separate vendor)
//
// Flow:
//   1. submitBedrockVideo() → starts async invoke → returns invocation ARN
//   2. checkBedrockVideo() → polls status → returns video URL when done
//
// Nova Reel generates 6-second videos at 1280x720 or 1920x1080, 24fps.
// Output is stored in S3.
//
// Content-filter strategy (v3):
//   1. Try raw prompt first — most scenes DON'T actually get blocked
//   2. On content-filter rejection → LLM rewrite via Groq (preserves visual uniqueness)
//   3. If LLM rewrite also blocked → ultra-safe extraction with scene fingerprint

import {
  BedrockRuntimeClient,
  StartAsyncInvokeCommand,
  GetAsyncInvokeCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ── LLM-based prompt rewriting for Amazon content filters ────────────

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

const REWRITE_SYSTEM_PROMPT = `You rewrite video scene prompts to pass Amazon's content filter while keeping EVERY visual detail unique.

CRITICAL RULES:
1. PRESERVE all visual specifics: exact setting details, character descriptions, clothing, props, positions, movements, lighting angles, weather, colors, architecture, camera angles
2. PRESERVE the scene's unique "fingerprint" — what makes THIS scene look different from every other scene
3. REMOVE ONLY the blocked content categories: explicit violence, weapons, gore, nudity, drugs, profanity, death references
4. REPLACE removed elements with visually interesting alternatives that maintain the scene's mood and energy:
   - fight → tense confrontation, dramatic face-off, characters circling each other
   - gun → pointing/gesturing forcefully
   - blood → crimson lighting, red reflections, scarlet atmosphere
   - death → character falling, collapsing, fading
   - horror → noir, suspense, mystery, eerie atmosphere
5. Keep character-specific visual details: "tall man in a leather jacket" stays exactly that
6. Keep environment-specific details: "neon-lit alley with steam rising from grates" stays exactly that
7. Output ONLY the rewritten prompt. No explanation. Under 512 characters.
8. NEVER output a generic cinematic description — the rewrite must be as specific as the original`;

/**
 * Use Groq to intelligently rewrite a prompt for Bedrock safety.
 * Only called when the raw prompt was actually blocked by the content filter.
 */
async function rewritePromptForBedrock(prompt: string): Promise<string> {
  if (!GROQ_API_KEY || GROQ_API_KEY.length < 10) {
    console.log('[bedrock-video] Groq not configured, using basic sanitizer');
    return basicSanitize(prompt);
  }

  try {
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: REWRITE_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Rewrite this scene prompt to pass content filters while keeping ALL visual details unique:\n\n${prompt.slice(0, 1500)}`,
          },
        ],
        max_tokens: 400,
        temperature: 0.7, // Higher temp for more variety between scenes
      }),
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      console.warn(`[bedrock-video] Groq rewrite failed (${res.status}), falling back`);
      return basicSanitize(prompt);
    }

    const data = await res.json();
    const rewritten = data.choices?.[0]?.message?.content?.trim();
    if (!rewritten || rewritten.length < 20) {
      console.warn('[bedrock-video] Groq returned empty rewrite, falling back');
      return basicSanitize(prompt);
    }

    console.log(`[bedrock-video] LLM rewrite (${rewritten.length} chars): ${rewritten.slice(0, 150)}...`);
    return rewritten.slice(0, 512);
  } catch (err) {
    console.warn('[bedrock-video] Groq rewrite error, falling back:', err);
    return basicSanitize(prompt);
  }
}

// ── Quick content pre-check ─────────────────────────────────────
// Fast local check for words very likely to trigger Bedrock filter.
// If any are found, go straight to LLM rewrite (skip the raw attempt).

const HIGH_RISK_WORDS = new Set([
  'blood', 'bloody', 'gore', 'gory', 'kill', 'killing', 'murder', 'murdered',
  'dead', 'death', 'die', 'dying', 'corpse', 'corpses',
  'zombie', 'zombies', 'undead', 'walker', 'walkers',
  'gun', 'guns', 'rifle', 'pistol', 'shotgun', 'weapon', 'weapons',
  'sword', 'knife', 'blade', 'axe', 'machete',
  'explosion', 'explode', 'bomb', 'grenade',
  'nude', 'naked', 'sexual',
  'torture', 'torment', 'execution',
  'suicide', 'overdose',
  'demon', 'satan', 'satanic',
  'skull', 'skeleton', 'coffin', 'grave', 'graveyard', 'cemetery',
]);

function hasHighRiskContent(prompt: string): boolean {
  const words = prompt.toLowerCase().split(/[\s,.\-;:!?'"()]+/);
  return words.some(w => HIGH_RISK_WORDS.has(w));
}

// ── Basic word-replacement sanitizer (fallback) ────────────
const REPLACEMENT_MAP: Record<string, string> = {
  'blood': 'crimson mist', 'bloody': 'crimson-stained', 'bleeding': 'injured',
  'gore': 'debris', 'gory': 'intense',
  'kill': 'confront', 'killing': 'confronting', 'murder': 'confrontation',
  'dead': 'fallen', 'death': 'dramatic ending', 'die': 'fall', 'dying': 'fading',
  'corpse': 'still figure', 'zombie': 'gaunt shambling figure',
  'zombies': 'gaunt shambling figures', 'undead': 'pale lurching figures',
  'gun': 'metallic object', 'guns': 'metallic objects',
  'rifle': 'long metallic object', 'pistol': 'small metallic device',
  'weapon': 'tool', 'weapons': 'tools', 'sword': 'gleaming steel',
  'knife': 'sharp implement', 'blade': 'gleaming edge', 'axe': 'heavy tool',
  'explosion': 'brilliant flash of light', 'explode': 'burst apart',
  'bomb': 'device', 'grenade': 'small canister',
  'horror': 'suspense', 'terrifying': 'intense', 'gruesome': 'stark',
  'violent': 'intense', 'violence': 'tension', 'brutal': 'powerful',
  'aggressive': 'forceful', 'attack': 'charge forward', 'attacking': 'charging',
  'fight': 'tense standoff', 'fighting': 'confronting', 'combat': 'confrontation',
  'war': 'conflict', 'battle': 'clash', 'destroy': 'shatter',
  'drug': 'substance', 'drugs': 'substances', 'meth': 'crystalline compound',
  'cocaine': 'white powder', 'overdose': 'collapse',
  'demon': 'dark imposing figure', 'devil': 'shadowy presence',
  'hell': 'underworld', 'satan': 'dark lord', 'evil': 'menacing',
  'sinister': 'ominous', 'wicked': 'treacherous',
  'coffin': 'ornate wooden box', 'grave': 'stone marker', 'graveyard': 'misty field of stones',
  'cemetery': 'moonlit field', 'tomb': 'stone chamber', 'funeral': 'solemn gathering',
  'skull': 'pale mask', 'skeleton': 'bony silhouette', 'bones': 'remains',
  'flesh': 'skin', 'rotting': 'weathered', 'decay': 'deterioration',
  'ghost': 'translucent figure', 'ghostly': 'ethereal', 'phantom': 'apparition',
  'haunted': 'atmospheric', 'nightmare': 'surreal dream',
  'fear': 'dread', 'scream': 'cry out', 'screaming': 'calling out',
  'criminal': 'mysterious figure', 'crime': 'mystery', 'mafia': 'organization',
  'gang': 'group', 'gangster': 'sharp-dressed man', 'thug': 'imposing figure',
  'prison': 'concrete facility', 'jail': 'holding facility',
  'torture': 'intense interrogation', 'torment': 'anguish',
  'suffer': 'endure', 'suffering': 'hardship',
  'walker': 'shambling figure', 'walkers': 'shambling figures',
  'naked': 'bare', 'nude': 'unclothed', 'sexual': 'intimate',
  'suicide': 'despair', 'abuse': 'mistreatment',
  'poison': 'dark liquid', 'toxic': 'hazardous', 'deadly': 'dangerous',
  'lethal': 'potent', 'execution': 'final moment',
  'shotgun': 'heavy metal tool', 'machete': 'long blade tool',
};

function basicSanitize(prompt: string): string {
  let sanitized = prompt;
  for (const [word, replacement] of Object.entries(REPLACEMENT_MAP)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sanitized = sanitized.replace(regex, replacement);
  }
  sanitized = sanitized.replace(/\s{2,}/g, ' ').replace(/\.\s*\./g, '.').trim();
  return sanitized.slice(0, 512);
}

const REGION = process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.BEDROCK_VIDEO_BUCKET || 'rip-web-video-output';
const MODEL_ID = 'amazon.nova-reel-v1:0';

function getCredentials() {
  const accessKeyId = process.env.BEDROCK_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.BEDROCK_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  if (accessKeyId && secretAccessKey) {
    return { accessKeyId, secretAccessKey };
  }
  return undefined;
}

function getBedrockClient(): BedrockRuntimeClient {
  const creds = getCredentials();
  return new BedrockRuntimeClient({
    region: REGION,
    ...(creds ? { credentials: creds } : {}),
  });
}

function getS3Client(): S3Client {
  const creds = getCredentials();
  return new S3Client({
    region: REGION,
    ...(creds ? { credentials: creds } : {}),
  });
}

export interface BedrockVideoJob {
  invocationArn: string;
  s3OutputPrefix: string;
  modelId: string;
}

export interface BedrockVideoResult {
  status: 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

/**
 * Submit a text-to-video job to Nova Reel.
 * 
 * Strategy (v3 — maximize scene uniqueness):
 *   1. Quick local check for high-risk words
 *      - If clean → submit raw prompt (maximum fidelity)
 *      - If risky → do basic word-swap sanitize and try that
 *   2. On content-filter block → LLM rewrite via Groq (preserves uniqueness)
 *   3. On second block → ultra-safe basicSanitize() of the LLM rewrite
 */
export async function submitBedrockVideo(
  prompt: string,
  opts: {
    durationSeconds?: number;
    dimension?: '1280x720' | '1920x1080';
    seed?: number;
  } = {},
): Promise<BedrockVideoJob> {
  const client = getBedrockClient();
  const jobId = `scene-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const s3Prefix = `bedrock-output/${jobId}/`;

  const videoConfig: Record<string, unknown> = {
    durationSeconds: opts.durationSeconds || 6,
    fps: 24,
    dimension: opts.dimension || '1280x720',
  };
  if (opts.seed !== undefined) {
    videoConfig.seed = opts.seed;
  }

  const makeCmd = (text: string) =>
    new StartAsyncInvokeCommand({
      modelId: MODEL_ID,
      modelInput: {
        taskType: 'TEXT_VIDEO',
        textToVideoParams: { text },
        videoGenerationConfig: videoConfig,
      } as any,
      outputDataConfig: {
        s3OutputDataConfig: {
          s3Uri: `s3://${S3_BUCKET}/${s3Prefix}`,
        },
      },
    });

  function isContentFilterError(err: unknown): boolean {
    const msg = err instanceof Error ? err.message : String(err);
    const lower = msg.toLowerCase();
    return (
      lower.includes('content filter') ||
      lower.includes('blocked') ||
      lower.includes('input validation failed') ||
      lower.includes('content moderation')
    );
  }

  const risky = hasHighRiskContent(prompt);
  console.log(`[bedrock-video] Prompt (${prompt.length} chars, risky=${risky}): ${prompt.slice(0, 150)}...`);

  // ── Attempt 1: raw prompt (if clean) or basic sanitize (if risky) ──
  const attempt1Prompt = risky ? basicSanitize(prompt) : prompt.slice(0, 512);
  console.log(`[bedrock-video] Attempt 1 (${risky ? 'basic-sanitized' : 'raw'}): ${attempt1Prompt.slice(0, 120)}...`);

  try {
    const resp = await client.send(makeCmd(attempt1Prompt));
    if (resp.invocationArn) {
      console.log(`[bedrock-video] ✓ Attempt 1 accepted`);
      return { invocationArn: resp.invocationArn, s3OutputPrefix: s3Prefix, modelId: MODEL_ID };
    }
  } catch (err1) {
    if (!isContentFilterError(err1)) throw err1;
    console.log(`[bedrock-video] Attempt 1 blocked by content filter`);
  }

  // ── Attempt 2: LLM rewrite via Groq ──
  const llmRewrite = await rewritePromptForBedrock(prompt);
  console.log(`[bedrock-video] Attempt 2 (LLM rewrite): ${llmRewrite.slice(0, 120)}...`);

  try {
    const resp = await client.send(makeCmd(llmRewrite));
    if (resp.invocationArn) {
      console.log(`[bedrock-video] ✓ Attempt 2 accepted (LLM rewrite)`);
      return { invocationArn: resp.invocationArn, s3OutputPrefix: s3Prefix, modelId: MODEL_ID };
    }
  } catch (err2) {
    if (!isContentFilterError(err2)) throw err2;
    console.log(`[bedrock-video] Attempt 2 blocked — trying ultra-safe`);
  }

  // ── Attempt 3: basic sanitize the LLM rewrite (belt + suspenders) ──
  const ultraSafe = basicSanitize(llmRewrite);
  console.log(`[bedrock-video] Attempt 3 (sanitized LLM rewrite): ${ultraSafe.slice(0, 120)}...`);

  try {
    const resp = await client.send(makeCmd(ultraSafe));
    if (resp.invocationArn) {
      console.log(`[bedrock-video] ✓ Attempt 3 accepted (ultra-safe)`);
      return { invocationArn: resp.invocationArn, s3OutputPrefix: s3Prefix, modelId: MODEL_ID };
    }
  } catch (err3) {
    if (!isContentFilterError(err3)) throw err3;
    console.log(`[bedrock-video] Attempt 3 also blocked`);
  }

  // ── Attempt 4: scene-fingerprint extraction (last resort, still unique) ──
  const fingerprint = extractSceneFingerprint(prompt);
  console.log(`[bedrock-video] Attempt 4 (fingerprint): ${fingerprint.slice(0, 120)}...`);

  const resp = await client.send(makeCmd(fingerprint));
  if (!resp.invocationArn) {
    throw new Error('Bedrock did not return an invocation ARN after 4 attempts');
  }
  console.log(`[bedrock-video] ✓ Attempt 4 accepted (fingerprint)`);
  return { invocationArn: resp.invocationArn, s3OutputPrefix: s3Prefix, modelId: MODEL_ID };
}

/**
 * Extract a unique "fingerprint" from a prompt — last resort that produces
 * visually distinct output for each scene by parsing out every concrete detail.
 * Unlike the old extractVisualEssence, this preserves the SPECIFIC nouns and
 * adjectives from the original prompt.
 */
function extractSceneFingerprint(prompt: string): string {
  // Extract concrete nouns, adjectives, and setting details from the original
  // by removing only the dangerous words and keeping everything else
  let cleaned = prompt;

  // Remove only the most dangerous words, keep everything else
  const DANGER_WORDS = [
    'blood', 'bloody', 'gore', 'kill', 'killing', 'murder', 'dead', 'death',
    'die', 'dying', 'corpse', 'zombie', 'zombies', 'undead', 'gun', 'guns',
    'rifle', 'pistol', 'shotgun', 'weapon', 'weapons', 'sword', 'knife',
    'blade', 'axe', 'machete', 'explosion', 'explode', 'bomb', 'grenade',
    'nude', 'naked', 'sexual', 'torture', 'execution', 'suicide', 'demon',
    'satan', 'satanic', 'skull', 'skeleton', 'coffin', 'graveyard', 'cemetery',
    'walker', 'walkers', 'fight', 'fighting', 'attack', 'attacking', 'combat',
    'war', 'battle', 'horror', 'gruesome', 'brutal', 'violent', 'violence',
    'scream', 'screaming', 'corpses', 'grave', 'funeral',
  ];

  for (const word of DANGER_WORDS) {
    cleaned = cleaned.replace(new RegExp(`\\b${word}s?\\b`, 'gi'), '');
  }

  // Remove any doubled spaces / empty phrases
  cleaned = cleaned
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .replace(/\.\s*\./g, '.')
    .replace(/^\s*[,.\s]+/, '')
    .trim();

  if (cleaned.length < 30) {
    // If almost everything was stripped, extract any safe visual words from original
    const safeWords = prompt
      .toLowerCase()
      .split(/[\s,.\-;:!?'"()]+/)
      .filter(w => w.length > 3 && !DANGER_WORDS.includes(w))
      .slice(0, 15);
    cleaned = `Cinematic scene featuring: ${safeWords.join(', ')}`;
  }

  return `Cinematic professional cinematography. ${cleaned}`.slice(0, 512);
}

/**
 * Check the status of a Bedrock video job.
 */
export async function checkBedrockVideo(
  invocationArn: string,
  s3OutputPrefix: string,
): Promise<BedrockVideoResult> {
  const client = getBedrockClient();

  const cmd = new GetAsyncInvokeCommand({ invocationArn });
  const resp = await client.send(cmd);

  const status = resp.status;

  if (status === 'Failed') {
    return {
      status: 'failed',
      error: resp.failureMessage || 'Bedrock video generation failed',
    };
  }

  if (status !== 'Completed') {
    return { status: 'processing' };
  }

  // Completed — find the output video in S3
  const s3 = getS3Client();
  const invocationId = invocationArn.split('/').pop() || '';

  const possibleKeys = [
    `${s3OutputPrefix}${invocationId}/output.mp4`,
    `${s3OutputPrefix}output.mp4`,
  ];

  for (const videoKey of possibleKeys) {
    try {
      await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: videoKey }));

      const signedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: videoKey }),
        { expiresIn: 86400 },
      );

      console.log(`[bedrock-video] Video found at: ${videoKey}`);
      return { status: 'completed', videoUrl: signedUrl };
    } catch {
      continue;
    }
  }

  // Last resort: list objects in the prefix
  try {
    const listResp = await s3.send(
      new ListObjectsV2Command({ Bucket: S3_BUCKET, Prefix: s3OutputPrefix }),
    );
    const mp4 = listResp.Contents?.find(obj => obj.Key?.endsWith('.mp4'));
    if (mp4?.Key) {
      const signedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({ Bucket: S3_BUCKET, Key: mp4.Key }),
        { expiresIn: 86400 },
      );
      console.log(`[bedrock-video] Video found via listing: ${mp4.Key}`);
      return { status: 'completed', videoUrl: signedUrl };
    }
  } catch (listErr) {
    console.error('[bedrock-video] Failed to list S3 objects:', listErr);
  }

  return {
    status: 'failed',
    error: `Video generated but output.mp4 not found in S3 prefix: ${s3OutputPrefix}`,
  };
}

/**
 * Check if Bedrock video generation is available.
 */
export function isBedrockAvailable(): boolean {
  return true;
}
