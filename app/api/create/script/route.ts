// app/api/create/script/route.ts
// AI-powered screenplay generation — Groq (free) → Anthropic (paid) fallback
// Uses Show Genome for TV/cartoon scripts, Director Genome for movie scripts,
// and Music Video Genome for music video treatments
import { NextRequest, NextResponse } from 'next/server';
import { SHOW_GENOME_DATABASE, buildNarrativeGenome, buildShowWriterPrompt } from '@/lib/show-genome';
import { DIRECTOR_GENOME_DATABASE, buildDirectorialGenome, buildMovieWriterPrompt, findDirectorGenome } from '@/lib/director-genome';
import { MV_DIRECTOR_DATABASE, buildMVDirectorialGenome, buildMVWriterPrompt, findMVDirectorGenome } from '@/lib/music-video-genome';

export const maxDuration = 60;

// ── LLM call helper — tries Groq first, then Anthropic ─────────
async function callLLM(systemPrompt: string, userPrompt: string, signal: AbortSignal) {
  // Priority 1: Groq (free tier — Llama 4 Scout)
  const groqKey = process.env.GROQ_API_KEY?.trim();
  if (groqKey) {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        max_tokens: 3000,
        temperature: 0.8,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
      signal,
    });
    if (res.ok) {
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || '', model: 'groq/llama-4-scout' };
    }
    console.warn('Groq failed:', res.status, await res.text().catch(() => ''));
  }

  // Priority 2: Anthropic (paid)
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropicKey) {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const client = new Anthropic({ apiKey: anthropicKey });
    const msg = await client.messages.create(
      {
        model: 'claude-sonnet-4-20250514',
        max_tokens: 3000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      },
      { signal },
    );
    const text = msg.content.map((b: any) => b.type === 'text' ? b.text : '').join('\n');
    return { text, model: 'anthropic/claude-sonnet-4' };
  }

  throw new Error('No AI provider configured. Set GROQ_API_KEY or ANTHROPIC_API_KEY in Vercel.');
}

// ── Find matching show in genome database ───────────────────────
function findShowGenome(mediaTitle: string): string | null {
  if (!mediaTitle) return null;
  const lower = mediaTitle.toLowerCase().trim();

  // Direct match
  for (const key of Object.keys(SHOW_GENOME_DATABASE)) {
    if (key.toLowerCase() === lower) return key;
  }

  // Fuzzy match — "south park" matches "South Park", "simpsons" matches "The Simpsons"
  for (const key of Object.keys(SHOW_GENOME_DATABASE)) {
    const keyLower = key.toLowerCase().replace(/^the\s+/, '');
    const titleLower = lower.replace(/^the\s+/, '');
    if (keyLower.includes(titleLower) || titleLower.includes(keyLower)) return key;
  }

  return null;
}

// ── Detect creation mode: TV / Movie / Music Video ──────────────
type CreationMode =
  | { type: 'music_video'; mvDirectorName: string | null }
  | { type: 'movie'; directorName: string | null }
  | { type: 'tv' };

function detectCreationMode(body: any): CreationMode {
  const { format, mediaTitle, director, mvDirector, prompt } = body;

  // ── Music Video mode ──────────────────────────────────────
  if (format === 'music_vid' || format === 'music_video' || format === 'mv') {
    const mvDir = mvDirector || director;
    const mvMatch = mvDir ? findMVDirectorGenome(mvDir) : null;
    return { type: 'music_video', mvDirectorName: mvMatch };
  }

  // ── Movie mode ────────────────────────────────────────────
  if (format === 'movie' || format === 'film' || format === 'short_film') {
    const dirMatch = director ? findDirectorGenome(director) : null;
    return { type: 'movie', directorName: dirMatch };
  }

  // Explicit: director field provided → check MV directors first, then film directors
  if (director) {
    const mvMatch = findMVDirectorGenome(director);
    if (mvMatch) return { type: 'music_video', mvDirectorName: mvMatch };
    const dirMatch = findDirectorGenome(director);
    if (dirMatch) return { type: 'movie', directorName: dirMatch };
  }

  // Heuristic: check if mediaTitle is a known director reference
  if (mediaTitle) {
    const dirMatch = findDirectorGenome(mediaTitle);
    if (dirMatch) return { type: 'movie', directorName: dirMatch };
  }

  // Check if prompt mentions a film director
  const combined = `${mediaTitle || ''} ${prompt || ''}`.toLowerCase();
  for (const key of Object.keys(DIRECTOR_GENOME_DATABASE)) {
    const lastName = key.split(' ').pop()!.toLowerCase();
    if (combined.includes(lastName) && lastName.length > 3) {
      return { type: 'movie', directorName: key };
    }
  }

  return { type: 'tv' };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Accept both field names — wizard sends personalCharacter, legacy sends character
    const {
      mediaTitle, prompt, tone, format,
      crossover, qaAnswers, isCustomIP, isMashup, customIPDesc,
      personalCharacter, character: characterRaw,
      characterImageUrl, hasMusicUpload,
      director, mvDirector, sceneType, era, actors,
      // Music Video specific
      songGenre, songMood, artistType, lyricalTheme, visualRefs,
    } = body;

    // Normalize character — accept string or object { name, role }
    const character = (() => {
      const raw = characterRaw || personalCharacter;
      if (!raw) return null;
      if (typeof raw === 'string') return { name: raw, role: 'main character' };
      return { name: raw.name || 'Character', role: raw.role || 'main character' };
    })();

    if (!prompt && !character) {
      return NextResponse.json({ error: 'Missing prompt or character' }, { status: 400 });
    }

    const charName = character?.name || 'Original Character';
    const charRole = character?.role || 'main character';
    const userIdea = prompt || `A story about ${charName}`;

    const durationGuide: Record<string, string> = {
      short:       '60 seconds (3-4 scenes, punchy)',
      scene:       '2-3 minutes (4-5 scenes)',
      episode:     '10-15 minutes (6-8 scenes)',
      music_vid:   '3-4 minutes (5-6 visual scenes synced to music)',
      music_video: '3-4 minutes (5-6 visual scenes synced to music)',
      mv:          '3-4 minutes (5-6 visual scenes synced to music)',
      trailer:     '90 seconds (5-6 quick cuts)',
      movie:       '5-10 minutes (8-12 scenes, full arc)',
      film:        '5-10 minutes (8-12 scenes, full arc)',
      short_film:  '3-5 minutes (6-8 scenes)',
    };

    const qaContext = qaAnswers?.length
      ? qaAnswers.map((qa: { q: string; a: string }, i: number) =>
          `Q${i + 1}: ${qa.q}\nA${i + 1}: ${qa.a}`
        ).join('\n')
      : '';

    // ── Detect: TV Show / Movie / Music Video mode ───────────
    const mode = detectCreationMode(body);
    const matchedShow = mode.type === 'tv' ? findShowGenome(mediaTitle) : null;
    const genomeData = matchedShow ? buildNarrativeGenome(matchedShow) : null;
    const genome = matchedShow ? SHOW_GENOME_DATABASE[matchedShow] : null;

    let systemPrompt: string;
    let genomeTag: string | false = false;
    let detectedDirector: string | undefined;

    if (mode.type === 'music_video') {
      // ✅ MUSIC VIDEO MODE — MV Director Genome
      const mvDirName = mode.mvDirectorName;
      detectedDirector = mvDirName || undefined;
      const mvGenome = mvDirName ? buildMVDirectorialGenome(mvDirName) : null;
      const mvConfig = mvDirName ? MV_DIRECTOR_DATABASE[mvDirName] : null;
      genomeTag = mvDirName ? 'mv_director' : false;

      if (mvDirName && mvGenome && mvConfig) {
        systemPrompt = `SYSTEM ROLE: You are a visionary music video director who has apprenticed under ${mvDirName}. Create a music video treatment/screenplay that captures their signature visual language, editing psychology, and approach to translating sound into image.

${mvGenome}

CRITICAL RULES:
- Every scene must reflect ${mvDirName}'s visual signature, rhythm, and symbolic layer
- Treatment titles: ${mvConfig.title_style}
- Visual breakdown: ${mvConfig.visual_section_style}
- Choreography: ${mvConfig.choreo_style}
- Editing rhythm: ${mvConfig.editing_section_style}
- Color palette: ${mvConfig.palette_description}
- Iconic moment: ${mvConfig.moment_description}
${character ? `\n## ARTIST/CHARACTER\nFeature "${charName}" (${charRole}) as the performance anchor.` : ''}

Respond with valid JSON only — no markdown, no code fences, no explanation outside the JSON.`;
      } else {
        systemPrompt = `You are a professional music video director and screenwriter. Create a vivid, visual music video treatment with scene-by-scene breakdowns. Each scene should describe what the camera sees, how it moves, lighting, color, and how the visuals sync to the music.
${director || mvDirector ? `\nDirect this video in the style of ${director || mvDirector}.` : ''}

CRITICAL: Respond with valid JSON only.`;
      }

    } else if (mode.type === 'movie' && mode.directorName) {
      // ✅ MOVIE MODE — Director Genome
      const directorName = mode.directorName;
      detectedDirector = directorName;
      const dirGenome = buildDirectorialGenome(directorName);
      const dirConfig = DIRECTOR_GENOME_DATABASE[directorName];
      genomeTag = 'director';

      systemPrompt = `SYSTEM ROLE: You are a master cinematographer and screenwriter who has studied ${directorName}'s complete filmography. Generate a screenplay that perfectly replicates their directorial DNA. The script must feel INDISTINGUISHABLE from a real ${directorName} film.

${dirGenome}

CRITICAL RULES:
- Every scene must reflect ${directorName}'s visual signature, rhythm, and thematic obsessions
- Dialogue style: ${dirConfig.dialogue_style}
- Camera work: ${dirConfig.camera_direction_style}
- Sound design: ${dirConfig.audio_cue_style}
- Emotional beats: ${dirConfig.beat_description}
${character ? `\n## CUSTOM CHARACTER INTEGRATION\nIntegrate "${charName}" (${charRole}) into the story naturally, written through ${directorName}'s character lens (${dirConfig.description_style}).` : ''}
${era ? `\n## ERA\nWrite in the style of ${directorName}'s ${era} career period.` : ''}
${actors ? `\n## MENTAL CAST\nMentally cast: ${actors}` : ''}

Respond with valid JSON only — no markdown, no code fences, no explanation outside the JSON.`;

    } else if (genome && genomeData) {
      // ✅ TV SHOW MODE — Narrative Genome
      genomeTag = 'show';

      systemPrompt = `SYSTEM ROLE: You are a master narrative architect specializing in ${genome.medium_type}. Your task is to generate scripts that perfectly replicate the formulaic DNA of ${matchedShow}. The script must feel INDISTINGUISHABLE from the real show.

${genomeData}

CRITICAL RULES:
- The dialogue MUST sound like the real show — use each character's exact speech patterns, catchphrases, and verbal tics
- The structure MUST follow the show's proven formula (see narrative genome above)
- ${genome.dialogue_style}
- Resolution: ${genome.resolution_type}
${character ? `\n## CUSTOM CHARACTER INTEGRATION\n${genome.custom_character_rules}\nCharacter: ${charName} (${charRole})` : ''}

Respond with valid JSON only — no markdown, no code fences, no explanation outside the JSON.`;

    } else {
      // Generic fallback
      const dirName = mode.type === 'movie' ? mode.directorName : null;
      detectedDirector = dirName || undefined;

      systemPrompt = `You are a professional screenwriter creating fan-made remix scripts. You write vivid, cinematic screenplays with proper formatting: scene headings (INT./EXT.), action lines, character dialogue with parenthetical direction, and camera notes.
${mediaTitle ? `\nYou are writing in the style of "${mediaTitle}". Match its tone, pacing, dialogue style, and character voices as closely as possible. The script should feel like it belongs in the actual show/movie.` : ''}
${dirName ? `\nDirect this scene in the style of ${dirName}.` : ''}

CRITICAL: Respond with valid JSON only — no markdown, no code fences, no explanation outside the JSON structure.`;
    }

    // ── Build user prompt ─────────────────────────────────────
    const sceneCount = genome
      ? genome.scene_count
      : mode.type === 'movie' ? '8-12'
      : mode.type === 'music_video' ? '5-6'
      : format === 'short' ? '3-4'
      : format === 'episode' ? '6-8'
      : '4-6';

    let userPrompt: string;

    if (mode.type === 'music_video') {
      // Music video specific user prompt
      userPrompt = `Create a music video treatment/screenplay:

${mode.mvDirectorName ? `MV Director Style: ${mode.mvDirectorName}` : ''}
Artist / Performer: ${charName} (${charRole})
Song Genre: ${songGenre || 'Not specified — infer from the mood and theme'}
Song Mood: ${songMood || tone || 'Anthemic'}
Artist Type: ${artistType || 'solo'}
Lyrical Theme: ${lyricalTheme || userIdea}
${era ? `Career Era: ${era}` : ''}
${visualRefs ? `Visual References: ${visualRefs}` : ''}
${mediaTitle ? `Source IP / Inspiration: ${mediaTitle}` : ''}
Format: Music video — ${durationGuide[format] || '3-4 minutes (5-6 visual scenes synced to music)'}
${characterImageUrl ? `Character reference image provided — incorporate visual details.` : ''}
${hasMusicUpload ? `User is providing their own music track — write scenes that sync to music beats.` : ''}

${qaContext ? `Additional context from creator Q&A:\n${qaContext}` : ''}

Generate a music video treatment as JSON with this EXACT structure:
{
  "title": "Treatment title",
  "logline": "One-line concept summary",
  "concept": "2-3 sentence creative concept",
  "scenes": [
    {
      "sceneNum": 1,
      "heading": "VISUAL: LOCATION / SETUP",
      "description": "Brief scene summary — what we see",
      "action": "Detailed visual breakdown — what the camera captures, lighting, movement, how it syncs to the music. 3-5 sentences.",
      "dialogue": [
        {
          "character": "PERFORMER NAME or LYRIC",
          "line": "Sung/performed lyric or action note",
          "direction": "performance direction"
        }
      ],
      "duration": "0:00-0:30",
      "mood": "euphoric/melancholy/aggressive/dreamy/etc",
      "cameraNote": "Camera direction — movement, lens, angle",
      "transition": "cut | fade | dissolve | wipe | smash_cut",
      "musicSync": "How this scene syncs to the music — verse/chorus/bridge/drop/outro"
    }
  ],
  "colorPalette": "Overall color direction for the video",
  "iconicMoment": "The one shot/moment that defines the video"
}

Requirements:
- Each scene syncs to a section of the song (verse, chorus, bridge, drop, outro)
- Camera notes must be specific and cinematic${mode.mvDirectorName ? ` — match ${mode.mvDirectorName}'s camera choreography` : ''}
- Include musicSync field showing how visuals relate to audio
- Generate ${sceneCount} scenes
- Performance/lip-sync sections should be intercut with visual narrative
- This is a FAN-MADE remix — be creative

Respond with ONLY the JSON object.`;

    } else {
      // Standard screenplay user prompt (TV show / movie / generic)
      const dirName = mode.type === 'movie' ? mode.directorName : null;

      userPrompt = `Write a screenplay for this fan-made creation:

IP / Source: ${mediaTitle || 'Original Creation'}
${dirName ? `Director Style: ${dirName}` : ''}
Main Character: ${charName} (${charRole})
User's Vision: ${userIdea}
Tone: ${tone || (genome ? "Match the show's natural tone" : dirName ? `Match ${dirName}'s signature tone` : 'Dramatic')}
Format: ${format || 'short'} — ${durationGuide[format] || '60 seconds total'}
${sceneType ? `Scene type: ${sceneType}` : ''}
${crossover ? `Crossover with: ${crossover}` : ''}
${isCustomIP ? `Original IP Description: ${customIPDesc}` : ''}
${isMashup ? `Mashup Mode: Combining multiple IPs` : ''}
${characterImageUrl ? `Character reference image provided — incorporate visual details into scene descriptions.` : ''}
${hasMusicUpload ? `User is providing their own music track — write scenes that sync well with music beats and rhythm changes.` : ''}

${qaContext ? `Additional context from creator Q&A:\n${qaContext}` : ''}

Generate a screenplay as JSON with this EXACT structure:
{
  "title": "Episode/scene title",
  "logline": "One-line summary",
  "scenes": [
    {
      "sceneNum": 1,
      "heading": "INT. LOCATION - TIME OF DAY",
      "description": "Brief scene summary (1-2 sentences)",
      "action": "Detailed action description — what we SEE happening. Write cinematically. 3-5 sentences.",
      "dialogue": [
        {
          "character": "CHARACTER NAME",
          "line": "What they say",
          "direction": "how they say it (optional)"
        }
      ],
      "duration": "0:00-0:15",
      "mood": "tense/funny/eerie/hopeful/etc",
      "cameraNote": "Camera direction — e.g. 'SLOW PUSH IN on face' or 'TRACKING SHOT through hallway'",
      "transition": "cut | fade | dissolve | wipe | smash_cut"
    }
  ]
}

Requirements:
- Each scene MUST have a proper INT./EXT. heading
- Dialogue must feel 100% authentic to ${matchedShow || dirName || mediaTitle || 'the source material'} — use the characters' real speech patterns
- Action lines must be vivid and visual — describe what the CAMERA sees
- Camera notes should be specific and cinematic${dirName ? ` — match ${dirName}'s camera psychology` : ''}
- Duration timestamps should be sequential and match the format
- Each scene MUST include a "transition" field (cut, fade, dissolve, wipe, or smash_cut)
- This is a FAN-MADE remix — be creative but respect the source material's spirit
- Generate ${sceneCount} scenes
- The dialogue section is where characters TALK to each other — NO narrator unless the user specifically requested narration

Respond with ONLY the JSON object.`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 50000);

    let result;
    try {
      result = await callLLM(systemPrompt, userPrompt, controller.signal);
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === 'AbortError' || controller.signal.aborted) {
        return NextResponse.json(
          { error: 'Script generation timed out — please try a shorter format or try again.' },
          { status: 504 },
        );
      }
      throw err;
    }
    clearTimeout(timeout);

    // Parse JSON from response
    let script;
    try {
      script = JSON.parse(result.text);
    } catch {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        script = JSON.parse(jsonMatch[0]);
      } else {
        console.error('Failed to parse script response:', result.text.slice(0, 500));
        return NextResponse.json({ error: 'Failed to parse AI script — try again' }, { status: 500 });
      }
    }

    return NextResponse.json({
      title: script.title || `${charName}: ${userIdea.slice(0, 50)}`,
      logline: script.logline || '',
      concept: script.concept || undefined,
      scenes: script.scenes || [],
      colorPalette: script.colorPalette || undefined,
      iconicMoment: script.iconicMoment || undefined,
      model: result.model,
      genome: genomeTag,
      director: detectedDirector,
    });

  } catch (error: any) {
    console.error('Script generation error:', error);
    return NextResponse.json(
      { error: error.message || 'Script generation failed' },
      { status: error.status || 500 }
    );
  }
}
