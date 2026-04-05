// app/api/fal/proxy/route.ts
// fal.ai server proxy — protects API key from client exposure
// See: https://docs.fal.ai/integrations/nextjs/
import { route } from '@fal-ai/server-proxy/nextjs';

export const { GET, POST, PUT } = route;
