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
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

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

  const input: Record<string, unknown> = {
    taskType: 'TEXT_VIDEO',
    textToVideoParams: {
      text: prompt.slice(0, 512), // Nova Reel has a 512-char prompt limit
    },
    videoGenerationConfig: {
      durationSeconds: opts.durationSeconds || 6,
      fps: 24,
      dimension: opts.dimension || '1280x720',
    },
  };

  if (opts.seed !== undefined) {
    (input.videoGenerationConfig as Record<string, unknown>).seed = opts.seed;
  }

  const cmd = new StartAsyncInvokeCommand({
    modelId: MODEL_ID,
    modelInput: input,
    outputDataConfig: {
      s3OutputDataConfig: {
        s3Uri: `s3://${S3_BUCKET}/${s3Prefix}`,
      },
    },
  });

  const resp = await client.send(cmd);

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
  const s3 = getS3Client();

  // Nova Reel outputs to {s3Prefix}/output.mp4
  const videoKey = `${s3OutputPrefix}output.mp4`;

  try {
    const signedUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: videoKey,
      }),
      { expiresIn: 86400 }, // 24 hours
    );

    return {
      status: 'completed',
      videoUrl: signedUrl,
    };
  } catch (err) {
    // Try listing objects in the prefix to find the actual filename
    console.error(`[bedrock-video] Could not get ${videoKey}:`, err);
    return {
      status: 'failed',
      error: `Video generated but could not find output file at ${videoKey}`,
    };
  }
}

/**
 * Check if Bedrock video generation is available.
 * Requires AWS credentials (auto-provided on Amplify/Lambda).
 */
export function isBedrockAvailable(): boolean {
  // On Amplify, AWS credentials are auto-injected. Always try.
  return true;
}
