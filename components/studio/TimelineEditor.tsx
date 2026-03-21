// components/studio/TimelineEditor.tsx
// CapCut-style timeline editor for arranging scenes, audio, and effects
'use client';
import { useState, useRef, useCallback, useEffect, useMemo, MouseEvent } from 'react';
import { useStudioStore, genId } from '@/lib/store';
import type { Asset, TimelineTrack, TimelineClip } from '@/lib/store';

// ── Config ──────────────────────────────────────────────────────
const TRACK_HEIGHT     = 56;
const HEADER_WIDTH     = 140;
const MIN_ZOOM         = 10;   // px per second at min zoom
const MAX_ZOOM         = 200;  // px per second at max zoom
const SNAP_THRESHOLD   = 6;    // px snap distance
const DEFAULT_CLIP_DUR = 5;    // seconds

const TRACK_COLORS: Record<string, string> = {
  video:     '#ffcc00',
  image:     '#a855f7',
  audio:     '#8aff00',
  voiceover: '#00d4ff',
  music:     '#ff6b35',
  sfx:       '#ff2d78',
  text:      '#3a3a80',
};

interface Props {
  assets: Asset[];
}

export function TimelineEditor({ assets }: Props) {
  const store = useStudioStore();
  const { tracks, addTrack, updateTrack, removeTrack, addClipToTrack, updateClip, removeClip, playhead, setPlayhead, zoom, setZoom } = store;

  const scrollRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ clipId: string; trackId: string; startX: number; origStart: number } | null>(null);
  const [resizing, setResizing] = useState<{ clipId: string; trackId: string; edge: 'left' | 'right'; startX: number; origStart: number; origDur: number } | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const playRef = useRef<number>(0);

  // ── Computed ────────────────────────────────────────────────
  const pxPerSec = zoom;
  const totalDuration = useMemo(() => {
    let max = 30; // minimum 30s visible
    tracks.forEach(t => t.clips.forEach(c => {
      max = Math.max(max, c.startTime + c.duration + 5);
    }));
    return max;
  }, [tracks]);
  const totalWidth = totalDuration * pxPerSec;

  // ── Time markers ────────────────────────────────────────────
  const markers = useMemo(() => {
    const step = pxPerSec >= 80 ? 1 : pxPerSec >= 40 ? 2 : pxPerSec >= 20 ? 5 : 10;
    const arr: number[] = [];
    for (let t = 0; t <= totalDuration; t += step) arr.push(t);
    return arr;
  }, [totalDuration, pxPerSec]);

  // ── Snap points ─────────────────────────────────────────────
  const getSnapPoints = useCallback((excludeClipId?: string): number[] => {
    const pts: number[] = [0, playhead];
    tracks.forEach(t => t.clips.forEach(c => {
      if (c.id === excludeClipId) return;
      pts.push(c.startTime);
      pts.push(c.startTime + c.duration);
    }));
    return pts;
  }, [tracks, playhead]);

  const snapTo = useCallback((time: number, excludeClipId?: string): number => {
    const pts = getSnapPoints(excludeClipId);
    for (const p of pts) {
      if (Math.abs((p - time) * pxPerSec) < SNAP_THRESHOLD) return p;
    }
    return Math.max(0, time);
  }, [getSnapPoints, pxPerSec]);

  // ── Drag handling ───────────────────────────────────────────
  const handleMouseMove = useCallback((e: globalThis.MouseEvent) => {
    if (dragging) {
      const dx = e.clientX - dragging.startX;
      const dt = dx / pxPerSec;
      const newStart = snapTo(dragging.origStart + dt, dragging.clipId);
      updateClip(dragging.trackId, dragging.clipId, { startTime: Math.max(0, newStart) });
    }
    if (resizing) {
      const dx = e.clientX - resizing.startX;
      const dt = dx / pxPerSec;
      if (resizing.edge === 'right') {
        const newDur = Math.max(0.5, resizing.origDur + dt);
        updateClip(resizing.trackId, resizing.clipId, { duration: newDur });
      } else {
        const newStart = snapTo(resizing.origStart + dt, resizing.clipId);
        const delta = newStart - resizing.origStart;
        const newDur = Math.max(0.5, resizing.origDur - delta);
        updateClip(resizing.trackId, resizing.clipId, { startTime: newStart, duration: newDur });
      }
    }
  }, [dragging, resizing, pxPerSec, snapTo, updateClip]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setResizing(null);
  }, []);

  useEffect(() => {
    if (dragging || resizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, resizing, handleMouseMove, handleMouseUp]);

  // ── Playback simulation ─────────────────────────────────────
  useEffect(() => {
    if (isPlaying) {
      const start = performance.now();
      const startHead = playhead;
      const animate = (now: number) => {
        const elapsed = (now - start) / 1000;
        const next = startHead + elapsed;
        if (next >= totalDuration) {
          setPlayhead(0);
          setIsPlaying(false);
          return;
        }
        setPlayhead(next);
        playRef.current = requestAnimationFrame(animate);
      };
      playRef.current = requestAnimationFrame(animate);
      return () => cancelAnimationFrame(playRef.current);
    }
  }, [isPlaying, playhead, totalDuration, setPlayhead]);

  // ── Playhead click on ruler ─────────────────────────────────
  const handleRulerClick = useCallback((e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    setPlayhead(Math.max(0, x / pxPerSec));
    setIsPlaying(false);
  }, [pxPerSec, setPlayhead]);

  // ── Add track ───────────────────────────────────────────────
  function handleAddTrack(type: string) {
    const count = tracks.filter(t => t.type === type).length;
    addTrack({
      id: genId('trk'),
      type: type as any,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${count + 1}`,
      muted: false,
      locked: false,
      clips: [],
    });
  }

  // ── Drop asset onto track ──────────────────────────────────
  function handleDropAsset(trackId: string, asset: Asset) {
    const track = tracks.find(t => t.id === trackId);
    if (!track) return;

    // Find the end of existing clips on this track
    const lastEnd = track.clips.reduce((max, c) => Math.max(max, c.startTime + c.duration), 0);

    const clip: TimelineClip = {
      id: genId('clip'),
      assetId: asset.id,
      name: asset.name,
      startTime: lastEnd,
      duration: asset.duration || DEFAULT_CLIP_DUR,
      type: asset.type as any,
      url: asset.url,
      content: asset.content,
      volume: 1,
      opacity: 1,
    };
    addClipToTrack(trackId, clip);
  }

  // ── Format time ─────────────────────────────────────────────
  function fmt(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    const ms = Math.floor((secs % 1) * 10);
    return `${m}:${String(s).padStart(2, '0')}.${ms}`;
  }

  return (
    <div className="bg-bg2 border border-border rounded-xl overflow-hidden">
      {/* ── Toolbar ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-bg3">
        {/* Playback controls */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => { setPlayhead(0); setIsPlaying(false); }}
            className="w-8 h-8 rounded bg-bg2 border border-border text-muted hover:text-white flex items-center justify-center transition-all">
            ⏮
          </button>
          <button onClick={() => setIsPlaying(!isPlaying)}
            className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold transition-all ${
              isPlaying ? 'bg-rip text-white' : 'bg-bg2 border border-border text-muted hover:text-white'
            }`}>
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button onClick={() => { setPlayhead(totalDuration); setIsPlaying(false); }}
            className="w-8 h-8 rounded bg-bg2 border border-border text-muted hover:text-white flex items-center justify-center transition-all">
            ⏭
          </button>
        </div>

        {/* Time display */}
        <div className="font-mono text-sm text-white bg-bg px-3 py-1.5 rounded border border-border min-w-[80px] text-center">
          {fmt(playhead)}
        </div>

        <div className="flex-1" />

        {/* Zoom control */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-muted uppercase">Zoom</span>
          <input type="range" min={MIN_ZOOM} max={MAX_ZOOM} value={zoom}
            onChange={e => setZoom(Number(e.target.value))}
            className="w-24 accent-rip" />
        </div>

        {/* Add track menu */}
        <div className="relative group">
          <button className="px-3 py-1.5 rounded-lg bg-rip/10 border border-rip/30 text-rip text-xs font-bold hover:bg-rip/20 transition-all">
            + Track
          </button>
          <div className="absolute right-0 top-full mt-1 bg-bg3 border border-bord2 rounded-lg p-1 shadow-xl z-50 hidden group-hover:block min-w-[140px]">
            {['video', 'image', 'audio', 'voiceover', 'music', 'sfx', 'text'].map(type => (
              <button key={type} onClick={() => handleAddTrack(type)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded text-xs text-muted hover:text-white hover:bg-bg2 transition-all">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TRACK_COLORS[type] }} />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Asset tray (collapsible) ─────────────────────────── */}
      {assets.length > 0 && (
        <div className="border-b border-border px-4 py-2 bg-bg">
          <div className="text-[9px] text-muted uppercase tracking-widest mb-2">Drag assets to tracks</div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {assets.map(a => (
              <button key={a.id}
                onClick={() => {
                  // Auto-add to matching track (or create one)
                  const matchType = a.type === 'sprite' ? 'image' : a.type;
                  let track = tracks.find(t => t.type === matchType);
                  if (!track) {
                    const id = genId('trk');
                    const newTrack: TimelineTrack = {
                      id,
                      type: matchType as any,
                      name: `${matchType.charAt(0).toUpperCase() + matchType.slice(1)} 1`,
                      muted: false,
                      locked: false,
                      clips: [],
                    };
                    addTrack(newTrack);
                    track = newTrack;
                  }
                  handleDropAsset(track.id, a);
                }}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg2 border border-border text-xs text-muted hover:text-white hover:border-bord2 transition-all"
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TRACK_COLORS[a.type === 'sprite' ? 'image' : a.type] || '#555' }} />
                <span className="truncate max-w-[100px]">{a.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Timeline area ────────────────────────────────────── */}
      <div className="flex" style={{ minHeight: Math.max(200, tracks.length * TRACK_HEIGHT + 80) }}>
        {/* Track headers */}
        <div className="shrink-0 border-r border-border bg-bg" style={{ width: HEADER_WIDTH }}>
          {/* Ruler corner */}
          <div className="h-7 border-b border-border" />

          {tracks.map(track => (
            <div key={track.id} className="flex items-center gap-1.5 px-2 border-b border-border group"
              style={{ height: TRACK_HEIGHT }}>
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: TRACK_COLORS[track.type] }} />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] text-white font-bold truncate">{track.name}</div>
                <div className="text-[8px] text-muted2 uppercase">{track.type}</div>
              </div>
              <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => updateTrack(track.id, { muted: !track.muted })}
                  className={`w-5 h-5 rounded text-[8px] flex items-center justify-center ${track.muted ? 'bg-red-900/50 text-red-400' : 'bg-bg2 text-muted hover:text-white'}`}>
                  {track.muted ? '🔇' : '🔊'}
                </button>
                <button onClick={() => updateTrack(track.id, { locked: !track.locked })}
                  className={`w-5 h-5 rounded text-[8px] flex items-center justify-center ${track.locked ? 'bg-gold/20 text-gold' : 'bg-bg2 text-muted hover:text-white'}`}>
                  {track.locked ? '🔒' : '🔓'}
                </button>
                <button onClick={() => removeTrack(track.id)}
                  className="w-5 h-5 rounded text-[8px] bg-bg2 text-muted hover:text-red-400 flex items-center justify-center">
                  ×
                </button>
              </div>
            </div>
          ))}

          {tracks.length === 0 && (
            <div className="flex items-center justify-center h-32 text-xs text-muted2">
              Add a track →
            </div>
          )}
        </div>

        {/* Scrollable timeline */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden relative">
          <div style={{ width: totalWidth, minHeight: '100%' }} className="relative">
            {/* Ruler */}
            <div className="h-7 border-b border-border relative cursor-pointer" onClick={handleRulerClick}>
              {markers.map(t => (
                <div key={t} className="absolute top-0 h-full" style={{ left: t * pxPerSec }}>
                  <div className="w-px h-2 bg-bord2" />
                  <div className="text-[8px] text-muted2 pl-0.5 select-none">{fmt(t)}</div>
                </div>
              ))}
            </div>

            {/* Tracks */}
            {tracks.map((track) => (
              <div key={track.id} className="relative border-b border-border" style={{ height: TRACK_HEIGHT }}>
                {/* Track background stripes */}
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundColor: TRACK_COLORS[track.type] }} />

                {/* Clips */}
                {track.clips.map(clip => {
                  const left = clip.startTime * pxPerSec;
                  const width = Math.max(20, clip.duration * pxPerSec);
                  const isSelected = selecting === clip.id;
                  const color = TRACK_COLORS[clip.type] || '#555';

                  return (
                    <div
                      key={clip.id}
                      className={`absolute top-1 rounded-lg cursor-grab active:cursor-grabbing overflow-hidden group/clip transition-shadow ${
                        isSelected ? 'ring-2 ring-white shadow-lg' : 'hover:ring-1 hover:ring-white/30'
                      } ${track.locked ? 'pointer-events-none opacity-60' : ''}`}
                      style={{
                        left,
                        width,
                        height: TRACK_HEIGHT - 8,
                        backgroundColor: color + '25',
                        borderLeft: `3px solid ${color}`,
                      }}
                      onClick={(e) => { e.stopPropagation(); setSelecting(clip.id); }}
                      onMouseDown={(e) => {
                        if (track.locked) return;
                        e.stopPropagation();
                        setDragging({ clipId: clip.id, trackId: track.id, startX: e.clientX, origStart: clip.startTime });
                        setSelecting(clip.id);
                      }}
                    >
                      {/* Clip content */}
                      <div className="px-2 py-1 h-full flex items-center gap-1.5">
                        {clip.url && (clip.type === 'image' || clip.type === 'video') && (
                          <img src={clip.url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold text-white truncate">{clip.name}</div>
                          <div className="text-[8px] text-muted2">{fmt(clip.duration)}</div>
                        </div>
                        {/* Delete button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); removeClip(track.id, clip.id); }}
                          className="w-4 h-4 rounded-full bg-black/50 text-red-400 text-[8px] items-center justify-center opacity-0 group-hover/clip:opacity-100 transition-opacity hidden group-hover/clip:flex"
                        >×</button>
                      </div>

                      {/* Resize handles */}
                      {!track.locked && (
                        <>
                          <div
                            className="absolute left-0 top-0 w-2 h-full cursor-col-resize hover:bg-white/20"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setResizing({ clipId: clip.id, trackId: track.id, edge: 'left', startX: e.clientX, origStart: clip.startTime, origDur: clip.duration });
                            }}
                          />
                          <div
                            className="absolute right-0 top-0 w-2 h-full cursor-col-resize hover:bg-white/20"
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              setResizing({ clipId: clip.id, trackId: track.id, edge: 'right', startX: e.clientX, origStart: clip.startTime, origDur: clip.duration });
                            }}
                          />
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* Playhead */}
            <div
              className="absolute top-0 w-px bg-rip z-30 pointer-events-none"
              style={{ left: playhead * pxPerSec, height: '100%' }}
            >
              <div className="absolute -top-0 -left-[5px] w-[11px] h-3 bg-rip rounded-b-sm" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar: clip properties ──────────────────────── */}
      {selecting && (() => {
        const clip = tracks.flatMap(t => t.clips.map(c => ({ ...c, trackId: t.id }))).find(c => c.id === selecting);
        if (!clip) return null;
        return (
          <div className="border-t border-border bg-bg3 px-4 py-3 flex items-center gap-4 flex-wrap">
            <div>
              <div className="text-[8px] text-muted uppercase mb-0.5">Name</div>
              <div className="text-xs text-white font-bold">{clip.name}</div>
            </div>
            <div>
              <div className="text-[8px] text-muted uppercase mb-0.5">Start</div>
              <div className="text-xs text-white font-mono">{fmt(clip.startTime)}</div>
            </div>
            <div>
              <div className="text-[8px] text-muted uppercase mb-0.5">Duration</div>
              <div className="text-xs text-white font-mono">{fmt(clip.duration)}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[8px] text-muted uppercase">Volume</div>
              <input type="range" min={0} max={1} step={0.05} value={clip.volume ?? 1}
                onChange={e => updateClip(clip.trackId, clip.id, { volume: Number(e.target.value) })}
                className="w-20 accent-lime" />
              <span className="text-[9px] text-muted font-mono">{Math.round((clip.volume ?? 1) * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-[8px] text-muted uppercase">Opacity</div>
              <input type="range" min={0} max={1} step={0.05} value={clip.opacity ?? 1}
                onChange={e => updateClip(clip.trackId, clip.id, { opacity: Number(e.target.value) })}
                className="w-20 accent-purple" />
              <span className="text-[9px] text-muted font-mono">{Math.round((clip.opacity ?? 1) * 100)}%</span>
            </div>
            <div className="flex-1" />
            <button onClick={() => removeClip(clip.trackId, clip.id)}
              className="px-3 py-1 rounded text-[10px] font-bold text-red-400 border border-red-400/20 hover:bg-red-400/10 transition-all">
              🗑 Delete Clip
            </button>
          </div>
        );
      })()}

      {/* ── Empty state ──────────────────────────────────────── */}
      {tracks.length === 0 && (
        <div className="text-center py-12 px-4">
          <div className="text-4xl mb-3">🎞️</div>
          <h3 className="font-display text-xl text-white mb-2">Timeline Editor</h3>
          <p className="text-sm text-muted mb-4 max-w-md mx-auto">
            Add tracks and arrange your scenes, video clips, voiceovers, music, and sound effects into a complete episode.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button onClick={() => handleAddTrack('video')}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-all bg-gold/10 border border-gold/30 text-gold hover:bg-gold/20">
              + Video Track
            </button>
            <button onClick={() => handleAddTrack('image')}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-all bg-purple/10 border border-purple/30 text-purple hover:bg-purple/20">
              + Scene Track
            </button>
            <button onClick={() => handleAddTrack('voiceover')}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-all bg-cyan/10 border border-cyan/30 text-cyan hover:bg-cyan/20">
              + Voiceover Track
            </button>
            <button onClick={() => handleAddTrack('music')}
              className="px-4 py-2 rounded-lg text-xs font-bold transition-all bg-[#ff6b35]/10 border border-[#ff6b35]/30 text-[#ff6b35] hover:bg-[#ff6b35]/20">
              + Music Track
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
