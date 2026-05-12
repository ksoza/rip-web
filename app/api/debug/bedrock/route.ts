// Temporary debug endpoint to verify Bedrock connectivity
import { NextResponse } from 'next/server';
import { isBedrockAvailable } from '@/lib/bedrock-video';

export async function GET() {
  const env = {
    BEDROCK_ACCESS_KEY_ID: process.env.BEDROCK_ACCESS_KEY_ID ? `${process.env.BEDROCK_ACCESS_KEY_ID.slice(0, 8)}...` : 'NOT SET',
    BEDROCK_SECRET_ACCESS_KEY: process.env.BEDROCK_SECRET_ACCESS_KEY ? `${process.env.BEDROCK_SECRET_ACCESS_KEY.slice(0, 8)}...` : 'NOT SET',
    BEDROCK_REGION: process.env.BEDROCK_REGION || 'NOT SET',
    BEDROCK_VIDEO_BUCKET: process.env.BEDROCK_VIDEO_BUCKET || 'NOT SET',
    AWS_REGION: process.env.AWS_REGION || 'NOT SET',
    isAvailable: isBedrockAvailable(),
  };

  // Try to actually create the client and list async invokes
  try {
    const { BedrockRuntimeClient, GetAsyncInvokeCommand } = await import('@aws-sdk/client-bedrock-runtime');
    
    const accessKeyId = process.env.BEDROCK_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.BEDROCK_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
    
    const client = new BedrockRuntimeClient({
      region: process.env.BEDROCK_REGION || 'us-east-1',
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });

    // Try to get a known invocation to verify connectivity
    const cmd = new GetAsyncInvokeCommand({ invocationArn: 'arn:aws:bedrock:us-east-1:107595414292:async-invoke/npfwj8xx7yxd' });
    const result = await client.send(cmd);
    
    return NextResponse.json({
      ...env,
      bedrockTest: 'SUCCESS',
      invocationStatus: result.status,
    });
  } catch (err) {
    return NextResponse.json({
      ...env,
      bedrockTest: 'FAILED',
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
