// lib/ghostface/orchestrator.ts
// deer-flow-inspired orchestration for GhOSTface AI
// Decomposes complex video creation into parallel sub-tasks
// Pattern: Lead Agent -> Plan -> Sub-agents (parallel) -> Synthesize -> Output
//
// Inspired by ByteDance's DeerFlow 2.0 architecture:
// - Lead agent creates execution plan
// - Sub-agents run in isolated contexts (scene gen, audio gen, knowledge lookup)
// - Parallel execution where dependencies allow
// - Context summarization between phases
// - Memory for show-specific learnings

// -- Types -------------------------------------------------------

export type SubAgentType =
  | 'script_writer'      // Writes scene scripts from episode description
  | 'knowledge_lookup'   // Queries RAGflow for show details
  | 'scene_generator'    // Generates video for a single scene
  | 'audio_generator'    // Generates character voice audio
  | 'quality_checker'    // Reviews output for accuracy
  | 'assembler';         // Combines scenes into final episode

export type TaskStatus = 'pending' | 'running' | 'complete' | 'failed' | 'skipped';

export interface SubAgent {
  id: string;
  type: SubAgentType;
  status: TaskStatus;
  /** IDs of sub-agents that must complete before this one starts */
  dependsOn: string[];
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  /** Summarized context from this sub-agent's work */
  contextSummary?: string;
}

export interface ExecutionPlan {
  id: string;
  /** What the user asked for */
  intent: string;
  /** Show being recreated */
  show: string;
  /** Total phases in the plan */
  phases: ExecutionPhase[];
  /** Current phase index */
  currentPhase: number;
  /** Overall status */
  status: TaskStatus;
  /** Plan creation timestamp */
  createdAt: number;
  /** When the plan finished */
  completedAt?: number;
}

export interface ExecutionPhase {
  name: string;
  description: string;
  /** Sub-agents in this phase (can run in parallel if no deps) */
  agents: SubAgent[];
  status: TaskStatus;
}

export interface OrchestratorResult {
  success: boolean;
  plan: ExecutionPlan;
  outputs: {
    scenes: Array<{
      sceneNumber: number;
      description: string;
      videoUrl?: string;
      audioUrl?: string;
      audioSynced: boolean;
      model?: string;
    }>;
    episodeVideoUrl?: string;
  };
  /** Timing stats */
  stats: {
    totalDurationMs: number;
    phaseDurations: Record<string, number>;
    parallelSavingsMs: number;
  };
  errors: string[];
}

// -- Helpers -----------------------------------------------------

let _idCounter = 0;
function nextId(prefix: string): string {
  _idCounter += 1;
  return `${prefix}_${_idCounter}_${Date.now().toString(36)}`;
}

// -- Plan builder ------------------------------------------------

/**
 * Build an execution plan for episode generation.
 * Follows the deer-flow pattern:
 *   Phase 1: Research (knowledge lookup, parallel)
 *   Phase 2: Script (write scene scripts from research)
 *   Phase 3: Generate (parallel scene + audio generation)
 *   Phase 4: Quality check + assembly
 */
export function buildEpisodePlan(opts: {
  intent: string;
  show: string;
  scenes: Array<{
    description: string;
    dialogue: Array<{ character: string; line: string }>;
    characters: string[];
  }>;
  artStyle?: string;
  model?: string;
}): ExecutionPlan {
  const { intent, show, scenes, artStyle, model } = opts;

  // Phase 1: Knowledge lookup (parallel per scene)
  const knowledgeAgents: SubAgent[] = scenes.map((scene, i) => ({
    id: nextId('knowledge'),
    type: 'knowledge_lookup' as SubAgentType,
    status: 'pending' as TaskStatus,
    dependsOn: [],
    input: {
      show,
      sceneDescription: scene.description,
      characters: scene.characters,
      sceneIndex: i,
    },
  }));

  // Phase 2: Script refinement (depends on knowledge)
  const scriptAgents: SubAgent[] = scenes.map((scene, i) => ({
    id: nextId('script'),
    type: 'script_writer' as SubAgentType,
    status: 'pending' as TaskStatus,
    dependsOn: [knowledgeAgents[i].id],
    input: {
      show,
      sceneDescription: scene.description,
      dialogue: scene.dialogue,
      characters: scene.characters,
      sceneIndex: i,
    },
  }));

  // Phase 3: Scene generation (parallel -- each scene is independent after script)
  const sceneAgents: SubAgent[] = scenes.map((scene, i) => ({
    id: nextId('scene'),
    type: 'scene_generator' as SubAgentType,
    status: 'pending' as TaskStatus,
    dependsOn: [scriptAgents[i].id],
    input: {
      show,
      sceneDescription: scene.description,
      dialogue: scene.dialogue,
      characters: scene.characters,
      artStyle: artStyle || 'source-faithful',
      model: model || 'veo',
      sceneIndex: i,
    },
  }));

  // Phase 4: Quality check + assembly (depends on all scenes)
  const qualityAgent: SubAgent = {
    id: nextId('quality'),
    type: 'quality_checker',
    status: 'pending',
    dependsOn: sceneAgents.map((a) => a.id),
    input: { show, sceneCount: scenes.length },
  };

  const assemblyAgent: SubAgent = {
    id: nextId('assemble'),
    type: 'assembler',
    status: 'pending',
    dependsOn: [qualityAgent.id],
    input: { show, sceneCount: scenes.length },
  };

  return {
    id: nextId('plan'),
    intent,
    show,
    phases: [
      {
        name: 'Research',
        description: 'Query show knowledge base for accurate details',
        agents: knowledgeAgents,
        status: 'pending',
      },
      {
        name: 'Script',
        description: 'Refine scene scripts with knowledge context',
        agents: scriptAgents,
        status: 'pending',
      },
      {
        name: 'Generate',
        description: 'Generate video + audio for each scene (parallel)',
        agents: sceneAgents,
        status: 'pending',
      },
      {
        name: 'Finalize',
        description: 'Quality check and assemble into final episode',
        agents: [qualityAgent, assemblyAgent],
        status: 'pending',
      },
    ],
    currentPhase: 0,
    status: 'pending',
    createdAt: Date.now(),
  };
}

// -- Executor ----------------------------------------------------

/**
 * Execute a single sub-agent.
 * Routes to the appropriate API based on agent type.
 */
async function executeSubAgent(
  agent: SubAgent,
  context: {
    baseUrl: string;
    /** Accumulated context from previous phases */
    phaseContext: Record<string, unknown>;
  }
): Promise<SubAgent> {
  const { baseUrl, phaseContext } = context;
  agent.status = 'running';
  agent.startedAt = Date.now();

  try {
    switch (agent.type) {
      case 'knowledge_lookup': {
        const res = await fetch(`${baseUrl}/api/knowledge/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            showId: String(agent.input.show).toLowerCase().replace(/\s+/g, '-'),
            showTitle: agent.input.show,
            query: `${agent.input.sceneDescription} characters: ${(agent.input.characters as string[]).join(', ')}`,
            topK: 5,
          }),
        });
        const data = await res.json();
        agent.output = data;
        agent.contextSummary = (data.chunks || [])
          .map((c: { content: string }) => c.content)
          .join(' ')
          .slice(0, 500);
        agent.status = 'complete';
        break;
      }

      case 'script_writer': {
        // Use knowledge context to enrich the scene script
        const knowledgeCtx = phaseContext[`knowledge_${agent.input.sceneIndex}`] || '';
        agent.output = {
          enrichedDescription: `${agent.input.sceneDescription}\n\n${knowledgeCtx}`,
          dialogue: agent.input.dialogue,
          characters: agent.input.characters,
        };
        agent.contextSummary = `Script for scene ${agent.input.sceneIndex} refined with show knowledge`;
        agent.status = 'complete';
        break;
      }

      case 'scene_generator': {
        const scriptCtx = phaseContext[`script_${agent.input.sceneIndex}`] as
          | { enrichedDescription?: string; dialogue?: unknown; characters?: unknown }
          | undefined;

        const res = await fetch(`${baseUrl}/api/generate/scene`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            show: agent.input.show,
            artStyle: agent.input.artStyle || 'source-faithful',
            sceneDescription: scriptCtx?.enrichedDescription || agent.input.sceneDescription,
            dialogue: scriptCtx?.dialogue || agent.input.dialogue || [],
            characters: (scriptCtx?.characters || agent.input.characters || []) as string[],
            model: agent.input.model || 'veo',
          }),
        });
        const data = await res.json();
        agent.output = data;
        agent.contextSummary = data.success
          ? `Scene ${agent.input.sceneIndex} generated via ${data.model}`
          : `Scene ${agent.input.sceneIndex} failed: ${data.error}`;
        agent.status = data.success ? 'complete' : 'failed';
        if (!data.success) agent.error = data.error;
        break;
      }

      case 'audio_generator': {
        const res = await fetch(`${baseUrl}/api/generate/audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: agent.input.text,
            provider: 'auto',
            character: agent.input.character,
            show: agent.input.show,
          }),
        });
        const data = await res.json();
        agent.output = data;
        agent.status = res.ok ? 'complete' : 'failed';
        if (!res.ok) agent.error = data.error || 'Audio generation failed';
        break;
      }

      case 'quality_checker': {
        // Review all generated scenes for completeness
        const sceneCount = agent.input.sceneCount as number;
        const results: Array<{ scene: number; hasVideo: boolean; model?: string }> = [];
        for (let i = 0; i < sceneCount; i++) {
          const sceneOutput = phaseContext[`scene_${i}`] as
            | { success?: boolean; videoUrl?: string; model?: string }
            | undefined;
          results.push({
            scene: i,
            hasVideo: !!(sceneOutput?.success && sceneOutput?.videoUrl),
            model: sceneOutput?.model,
          });
        }
        const allGood = results.every((r) => r.hasVideo);
        agent.output = { results, allPassed: allGood };
        agent.contextSummary = allGood
          ? `All ${sceneCount} scenes passed quality check`
          : `${results.filter((r) => !r.hasVideo).length}/${sceneCount} scenes missing video`;
        agent.status = 'complete';
        break;
      }

      case 'assembler': {
        // Gather all scene outputs into final structure
        const sceneCount = agent.input.sceneCount as number;
        const scenes: Array<Record<string, unknown>> = [];
        for (let i = 0; i < sceneCount; i++) {
          const sceneOutput = phaseContext[`scene_${i}`] as Record<string, unknown> | undefined;
          scenes.push({ sceneNumber: i, ...(sceneOutput || {}) });
        }
        agent.output = { scenes, assembled: true };
        agent.contextSummary = `Assembled ${sceneCount} scenes`;
        agent.status = 'complete';
        break;
      }

      default:
        agent.error = `Unknown agent type: ${agent.type}`;
        agent.status = 'failed';
    }
  } catch (err) {
    agent.error = err instanceof Error ? err.message : String(err);
    agent.status = 'failed';
  }

  agent.completedAt = Date.now();
  return agent;
}

// -- Phase runner (parallel where possible) ----------------------

/**
 * Run all agents in a phase, parallelizing where dependencies allow.
 * deer-flow pattern: agents with no unmet deps run simultaneously.
 */
async function runPhase(
  phase: ExecutionPhase,
  context: { baseUrl: string; phaseContext: Record<string, unknown> }
): Promise<void> {
  phase.status = 'running';

  const completed = new Set<string>();
  const agents = [...phase.agents];

  while (agents.some((a) => a.status === 'pending')) {
    // Find agents whose dependencies are all met
    const ready = agents.filter(
      (a) => a.status === 'pending' && a.dependsOn.every((dep) => completed.has(dep))
    );

    if (ready.length === 0) {
      // Check for deadlock -- all remaining are pending but none are ready
      const pending = agents.filter((a) => a.status === 'pending');
      if (pending.length > 0) {
        // Force-run the first pending agent (break deadlock)
        ready.push(pending[0]);
      } else {
        break;
      }
    }

    // Run ready agents in parallel
    const results = await Promise.allSettled(
      ready.map((agent) => executeSubAgent(agent, context))
    );

    // Collect outputs into phase context
    for (const result of results) {
      if (result.status === 'fulfilled') {
        const agent = result.value;
        completed.add(agent.id);

        // Store output in phase context for downstream agents
        if (agent.output) {
          const ctxKey = `${agent.type}_${agent.input.sceneIndex ?? ''}`.replace(/_$/, '');
          context.phaseContext[ctxKey] = agent.output;
        }
      }
    }
  }

  // Determine phase status
  const failed = phase.agents.filter((a) => a.status === 'failed');
  phase.status = failed.length > 0 ? 'failed' : 'complete';
}

// -- Main orchestrator -------------------------------------------

/**
 * Execute a full episode generation plan.
 *
 * deer-flow pattern:
 *   1. Build plan (lead agent)
 *   2. Execute phases sequentially (each phase runs agents in parallel)
 *   3. Pass context summaries between phases
 *   4. Synthesize final output
 */
export async function executeEpisodePlan(
  plan: ExecutionPlan,
  baseUrl: string
): Promise<OrchestratorResult> {
  const startTime = Date.now();
  const phaseContext: Record<string, unknown> = {};
  const phaseDurations: Record<string, number> = {};
  const errors: string[] = [];

  plan.status = 'running';

  for (let i = 0; i < plan.phases.length; i++) {
    const phase = plan.phases[i];
    plan.currentPhase = i;
    const phaseStart = Date.now();

    await runPhase(phase, { baseUrl, phaseContext });

    phaseDurations[phase.name] = Date.now() - phaseStart;

    // Collect errors from failed agents
    for (const agent of phase.agents) {
      if (agent.status === 'failed' && agent.error) {
        errors.push(`[${phase.name}/${agent.type}] ${agent.error}`);
      }
    }

    // If generate phase failed completely, stop
    if (phase.name === 'Generate' && phase.agents.every((a) => a.status === 'failed')) {
      plan.status = 'failed';
      break;
    }
  }

  // Build final output
  const scenes: OrchestratorResult['outputs']['scenes'] = [];
  for (const phase of plan.phases) {
    for (const agent of phase.agents) {
      if (agent.type === 'scene_generator' && agent.output) {
        const out = agent.output as Record<string, unknown>;
        scenes.push({
          sceneNumber: (agent.input.sceneIndex as number) || 0,
          description: agent.input.sceneDescription as string,
          videoUrl: out.videoUrl as string | undefined,
          audioUrl: out.audioUrl as string | undefined,
          audioSynced: (out.audioSynced as boolean) || false,
          model: out.model as string | undefined,
        });
      }
    }
  }

  // Calculate parallel savings (sum of individual durations vs wall clock)
  const totalAgentTime = plan.phases
    .flatMap((p) => p.agents)
    .reduce((sum, a) => sum + ((a.completedAt || 0) - (a.startedAt || 0)), 0);
  const wallClock = Date.now() - startTime;

  if (plan.status !== 'failed') {
    plan.status = 'complete';
  }
  plan.completedAt = Date.now();

  return {
    success: plan.status === 'complete',
    plan,
    outputs: {
      scenes: scenes.sort((a, b) => a.sceneNumber - b.sceneNumber),
    },
    stats: {
      totalDurationMs: wallClock,
      phaseDurations,
      parallelSavingsMs: Math.max(0, totalAgentTime - wallClock),
    },
    errors,
  };
}
