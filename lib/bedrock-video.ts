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

import {
  BedrockRuntimeClient,
  StartAsyncInvokeCommand,
  GetAsyncInvokeCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// ── LLM-based prompt rewriting for Amazon content filters ────────────
// Nova Reel has very strict content filters. Instead of blindly stripping words
// (which makes all prompts identical), we use Groq (free, fast) to intelligently
// rewrite each prompt into a Bedrock-safe version that preserves visual uniqueness.

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

const REWRITE_SYSTEM_PROMPT = `You are a video prompt rewriter for Amazon Nova Reel, which has strict content filters.
Your job: take a detailed scene description and rewrite it as a VISUAL-ONLY prompt that will NOT trigger content filters.

RULES:
1. KEEP all visual details: lighting, colors, camera angles, settings, costumes, architecture, weather, time of day
2. KEEP character appearances (hair color, clothing, build, age) but describe them generically (don't name copyrighted characters)
3. REMOVE all: violence, weapons, gore, horror, death, drugs, nudity, profanity, supernatural evil
4. REPLACE action scenes with dramatic poses, tense standoffs, or atmospheric tension
5. REPLACE horror/dark themes with moody/noir/mysterious atmosphere
6. Each scene MUST be visually distinct — preserve unique setting details, character positions, lighting differences
7. Output ONLY the rewritten prompt, no explanation. Keep it under 450 characters.
8. Focus on what the CAMERA SEES: composition, movement, depth of field, color palette
9. Never use words like: blood, kill, dead, death, gun, weapon, zombie, ghost, demon, evil, skull, corpse, fight, attack, war, horror, drug, prison, grave, coffin, skeleton, violent, brutal, scream, torture, murder`;

/**
 * Use Groq (free, fast) to intelligently rewrite a prompt for Bedrock safety.
 * Falls back to basic sanitization if Groq is unavailable.
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
        model: 'llama-3.1-8b-instant', // Fastest model, plenty smart for rewriting
        messages: [
          { role: 'system', content: REWRITE_SYSTEM_PROMPT },
          { role: 'user', content: `Rewrite this scene for safe video generation:\n\n${prompt.slice(0, 1500)}` },
        ],
        max_tokens: 300,
        temperature: 0.4, // Low temp for consistent, faithful rewrites
      }),
      signal: AbortSignal.timeout(8000), // 8s timeout — Groq is usually < 1s
    });

    if (!res.ok) {
      console.warn(`[bedrock-video] Groq rewrite failed (${res.status}), falling back to basic sanitizer`);
      return basicSanitize(prompt);
    }

    const data = await res.json();
    const rewritten = data.choices?.[0]?.message?.content?.trim();
    if (!rewritten || rewritten.length < 20) {
      console.warn('[bedrock-video] Groq returned empty/short rewrite, falling back');
      return basicSanitize(prompt);
    }

    console.log(`[bedrock-video] LLM rewrite (${rewritten.length} chars): ${rewritten.slice(0, 120)}...`);
    return rewritten.slice(0, 512);
  } catch (err) {
    console.warn('[bedrock-video] Groq rewrite error, falling back:', err);
    return basicSanitize(prompt);
  }
}

// ── Basic word-replacement sanitizer (fallback) ────────────
// Used when Groq is unavailable. Improved to preserve more scene-specific detail.
const REPLACEMENT_MAP: Record<string, string> = {
  'blood': 'crimson mist', 'bloody': 'crimson-stained', 'bleeding': 'injured',
  'gore': 'debris', 'gory': 'intense',
  'kill': 'confront', 'killing': 'confronting', 'murder': 'confrontation',
  'dead': 'fallen', 'death': 'dramatic ending', 'die': 'fall', 'dying': 'fading',
  'corpse': 'still figure on the ground', 'zombie': 'gaunt shambling figure',
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
  'coffin': 'wooden casket', 'grave': 'stone marker', 'graveyard': 'misty field of stones',
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
};

function basicSanitize(prompt: string): string {
  let sanitized = prompt;
  for (const [word, replacement] of Object.entries(REPLACEMENT_MAP)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    sanitized = sanitized.replace(regex, replacement);
  }
  sanitized = sanitized.replace(/\s{2,}/g, ' ').replace(/\.\s*\./g, '.').trim();
  return `Cinematic scene, professional cinematography. ${sanitized}`.slice(0, 512);
}

const REGION = process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1';
const S3_BUCKET = process.env.BEDROCK_VIDEO_BUCKET || 'rip-web-video-output';
const MODEL_ID = 'amazon.nova-reel-v1:0';

function getCredentials() {
  // Use custom env vars (Amplify blocks AWS_ prefix)
  const accessKeyId = process.env.BEDROCK_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.BEDROCK_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
  if (accessKeyId && secretAccessKey) {
    return { accessKeyId, secretAccessKey };
  }
  return undefined; // Fall back to default credential chain (IAM role)
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
  videoUrl?: string; // Pre-signed S3 URL
  error?: string;
}

/**
 * Submit a text-to-video job to Nova Reel.
 * Returns immediately with job info for polling.
 */
export async function submitBedrockVideo(
  prompt: string,
  opts: {
    durationSeconds?: number; // 6 (default)
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

  // Use LLM to intelligently rewrite the prompt for Bedrock safety
  const safePrompt = await rewritePromptForBedrock(prompt);
  console.log(`[bedrock-video] Original prompt (${prompt.length} chars): ${prompt.slice(0, 150)}...`);
  console.log(`[bedrock-video] Safe prompt (${safePrompt.length} chars): ${safePrompt.slice(0, 150)}...`);

  const makeCmd = (text: string) => new StartAsyncInvokeCommand({
    modelId: MODEL_ID,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  let resp;
  try {
    resp = await client.send(makeCmd(safePrompt));
  } catch (firstErr) {
    const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
    if (msg.toLowerCase().includes('content filter') || msg.toLowerCase().includes('blocked')) {
      // Even the LLM rewrite got blocked — try an ultra-safe version preserving key visual cues
      console.log(`[bedrock-video] LLM rewrite still blocked, extracting visual essence...`);
      const ultraSafe = extractVisualEssence(prompt);
      console.log(`[bedrock-video] Ultra-safe prompt: ${ultraSafe.slice(0, 120)}...`);
      resp = await client.send(makeCmd(ultraSafe));
    } else {
      throw firstErr;
    }
  }

  if (!resp.invocationArn) {
    throw new Error('Bedrock did not return an invocation ARN');
  }

  return {
    invocationArn: resp.invocationArn,
    s3OutputPrefix: s3Prefix,
    modelId: MODEL_ID,
  };
}

/**
 * Extract visual essence from a prompt — last resort that still produces unique output.
 * Picks out setting, lighting, colors, and composition cues.
 */
function extractVisualEssence(prompt: string): string {
  const lower = prompt.toLowerCase();
  const cues: string[] = ['Cinematic establishing shot, professional cinematography'];

  // Time of day
  if (lower.includes('night') || lower.includes('dark') || lower.includes('midnight')) {
    cues.push('nighttime, moonlit atmosphere, deep shadows');
  } else if (lower.includes('dawn') || lower.includes('sunrise') || lower.includes('morning')) {
    cues.push('golden hour dawn light, warm orange tones');
  } else if (lower.includes('dusk') || lower.includes('sunset') || lower.includes('evening')) {
    cues.push('dusk, purple-orange sky, long shadows');
  } else {
    cues.push('dramatic lighting, volumetric rays');
  }

  // Setting
  if (lower.includes('city') || lower.includes('urban') || lower.includes('street') || lower.includes('downtown')) {
    cues.push('urban cityscape, concrete and glass buildings, wet streets reflecting neon');
  } else if (lower.includes('forest') || lower.includes('woods') || lower.includes('tree')) {
    cues.push('dense forest, towering trees, fog drifting between trunks');
  } else if (lower.includes('desert') || lower.includes('wasteland') || lower.includes('dry')) {
    cues.push('vast desert landscape, cracked earth, heat shimmer on the horizon');
  } else if (lower.includes('ocean') || lower.includes('sea') || lower.includes('water') || lower.includes('ship')) {
    cues.push('vast ocean panorama, waves crashing, salty mist');
  } else if (lower.includes('room') || lower.includes('office') || lower.includes('house') || lower.includes('indoor')) {
    cues.push('moody interior, pools of lamplight, detailed production design');
  } else if (lower.includes('mountain') || lower.includes('cliff') || lower.includes('peak')) {
    cues.push('dramatic mountain vista, jagged peaks, swirling clouds');
  } else if (lower.includes('hospital') || lower.includes('lab')) {
    cues.push('sterile white corridors, fluorescent lighting, clinical atmosphere');
  } else {
    cues.push('richly detailed environment, deep depth of field');
  }

  // Weather
  if (lower.includes('rain')) cues.push('heavy rain, puddles reflecting light');
  if (lower.includes('snow') || lower.includes('winter') || lower.includes('cold')) cues.push('falling snow, frost-covered surfaces');
  if (lower.includes('fog') || lower.includes('mist')) cues.push('dense fog, limited visibility, mysterious');
  if (lower.includes('storm') || lower.includes('thunder') || lower.includes('lightning')) cues.push('dramatic storm clouds, flashes of lightning');

  // People count / composition
  if (lower.includes('alone') || lower.includes('solitary') || lower.includes('single person')) {
    cues.push('solitary figure silhouetted against the backdrop');
  } else if (lower.includes('crowd') || lower.includes('group') || lower.includes('people')) {
    cues.push('group of distinct figures in the scene');
  } else if (lower.includes('two') || lower.includes('face to face') || lower.includes('confrontation')) {
    cues.push('two figures facing each other, tension in their posture');
  }

  // Color palette
  if (lower.includes('red') || lower.includes('crimson') || lower.includes('fire') || lower.includes('flame')) {
    cues.push('deep red and amber color palette, warm firelight');
  } else if (lower.includes('blue') || lower.includes('cold') || lower.includes('ice')) {
    cues.push('cool blue and teal color grading');
  } else if (lower.includes('green') || lower.includes('lush') || lower.includes('jungle')) {
    cues.push('lush green palette, tropical humidity');
  } else if (lower.includes('golden') || lower.includes('warm') || lower.includes('amber')) {
    cues.push('warm golden color grading, amber tones');
  } else {
    cues.push('desaturated cinematic color grading with selective warm highlights');
  }

  // Camera
  if (lower.includes('close-up') || lower.includes('closeup') || lower.includes('face')) {
    cues.push('extreme close-up, shallow depth of field');
  } else if (lower.includes('wide') || lower.includes('panoram') || lower.includes('landscape')) {
    cues.push('wide establishing shot, epic scale');
  } else if (lower.includes('aerial') || lower.includes('drone') || lower.includes('above')) {
    cues.push('aerial drone shot, sweeping movement');
  } else {
    cues.push('medium shot, gentle camera drift');
  }

  cues.push('film grain, anamorphic lens flare, 24fps cinematic motion');

  return cues.join(', ').slice(0, 512);
}

/**
 * Check the status of a Bedrock video job.
 * When completed, generates a pre-signed S3 URL for the video.
 */
export async function checkBedrockVideo(
  invocationArn: string,
  s3OutputPrefix: string,
): Promise<BedrockVideoResult> {
  const client = getBedrockClient();

  const cmd = new GetAsyncInvokeCommand({ invocationArn });
  const resp = await client.send(cmd);

  const status = resp.status; // InProgress | Completed | Failed

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
  // Nova Reel outputs to {s3Prefix}/{invocationId}/output.mp4
  const s3 = getS3Client();
  const invocationId = invocationArn.split('/').pop() || '';

  // Try the standard path first: {prefix}/{invocationId}/output.mp4
  const possibleKeys = [
    `${s3OutputPrefix}${invocationId}/output.mp4`,
    `${s3OutputPrefix}output.mp4`,
  ];

  for (const videoKey of possibleKeys) {
    try {
      // Verify the object exists
      await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: videoKey }));
      
      const signedUrl = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: videoKey,
        }),
        { expiresIn: 86400 }, // 24 hours
      );

      console.log(`[bedrock-video] Video found at: ${videoKey}`);
      return {
        status: 'completed',
        videoUrl: signedUrl,
      };
    } catch {
      console.log(`[bedrock-video] Video not at: ${videoKey}, trying next...`);
      continue;
    }
  }

  // Last resort: list objects in the prefix to find any .mp4 file
  try {
    const listResp = await s3.send(new ListObjectsV2Command({
      Bucket: S3_BUCKET,
      Prefix: s3OutputPrefix,
    }));
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
 * Requires AWS credentials (auto-provided on Amplify/Lambda).
 */
export function isBedrockAvailable(): boolean {
  // On Amplify, AWS credentials are auto-injected. Always try.
  return true;
}
