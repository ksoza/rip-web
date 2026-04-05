'use client';
// components/studio/SceneComposer.tsx
// Phase 3A — Layer-based Scene Composer
// Place characters on backgrounds, add text overlays, adjust positions
// CapCut-like canvas with drag-and-drop layers
import { useState, useCallback, useRef, MouseEvent, useEffect } from 'react';
import { useStudioStore, genId } from '@/lib/store';
import type { Asset, Character } from '@/lib/store';

// ── Types ───────────────────────────────────────────────────────
type LayerType = 'background' | 'character' | 'text' | 'effect' | 'overlay' | 'sticker';

interface SceneLayer {
  id: string;
  type: LayerType;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  x: number;             // % from left
  y: number;             // % from top
  width: number;         // % of canvas
  height: number;        // % of canvas
  rotation: number;
  zIndex: number;
  imageUrl?: string;
  characterId?: string;
  text?: string;
  textStyle?: {
    fontSize: number;
    fontFamily: string;
    color: string;
    align: 'left' | 'center' | 'right';
    bold: boolean;
    italic: boolean;
  };
  filter?: string;
  blendMode?: string;
}

type Tool = 'select' | 'move' | 'text' | 'crop';

const ASPECT_RATIOS = [
  { id: '16:9',  label: '16:9', w: 1920, h: 1080, desc: 'Landscape (YouTube)' },
  { id: '9:16',  label: '9:16', w: 1080, h: 1920, desc: 'Portrait (TikTok/Reels)' },
  { id: '1:1',   label: '1:1',  w: 1080, h: 1080, desc: 'Square (Instagram)' },
  { id: '4:3',   label: '4:3',  w: 1440, h: 1080, desc: 'Classic TV' },
  { id: '21:9',  label: '21:9', w: 2560, h: 1080, desc: 'Cinematic' },
];

const FILTERS = [
  { id: 'none',       label: 'None',       css: 'none' },
  { id: 'grayscale',  label: 'B&W',        css: 'grayscale(1)' },
  { id: 'sepia',      label: 'Sepia',      css: 'sepia(0.8)' },
  { id: 'warm',       label: 'Warm',       css: 'saturate(1.3) hue-rotate(-10deg)' },
  { id: 'cool',       label: 'Cool',       css: 'saturate(0.9) hue-rotate(20deg) brightness(1.05)' },
  { id: 'dramatic',   label: 'Dramatic',   css: 'contrast(1.4) saturate(0.8)' },
  { id: 'vintage',    label: 'Vintage',    css: 'sepia(0.3) saturate(1.2) contrast(1.1)' },
  { id: 'cyberpunk',  label: 'Cyberpunk',  css: 'saturate(1.6) hue-rotate(290deg) contrast(1.2)' },
  { id: 'anime',      label: 'Anime',      css: 'saturate(1.5) contrast(1.15) brightness(1.05)' },
  { id: 'noir',       label: 'Noir',       css: 'grayscale(0.7) contrast(1.5) brightness(0.85)' },
];

const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light', 'color-dodge', 'color-burn'];

interface Props {
  user: any;
  loading: boolean;
  setLoading: (v: boolean) => void;
  error: string;
  setError: (v: string) => void;
  saveAsset: (asset: Omit<Asset, 'id' | 'createdAt'>) => Asset;
}

export function SceneComposer({ user, loading, setLoading, error, setError, saveAsset }: Props) {
  const { assets, characters } = useStudioStore();

  // Canvas state
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [bgColor, setBgColor] = useState('#0A0A0D');
  const [layers, setLayers] = useState<SceneLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool>('select');

  // Drag state
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ layerId: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const selectedLayer = layers.find(l => l.id === selectedLayerId);
  const ar = ASPECT_RATIOS.find(a => a.id === aspectRatio) || ASPECT_RATIOS[0];
  const canvasAspect = ar.w / ar.h;

  // ── Layer Management ──────────────────────────────────────────
  const addLayer = useCallback((type: LayerType, data: Partial<SceneLayer> = {}) => {
    const layer: SceneLayer = {
      id: genId('layer'),
      type,
      name: data.name || `${type.charAt(0).toUpperCase() + type.slice(1)} ${layers.length + 1}`,
      visible: true,
      locked: false,
      opacity: 1,
      x: type === 'background' ? 0 : 25,
      y: type === 'background' ? 0 : 25,
      width: type === 'background' ? 100 : 50,
      height: type === 'background' ? 100 : 50,
      rotation: 0,
      zIndex: layers.length,
      ...data,
    };
    setLayers(prev => [...prev, layer]);
    setSelectedLayerId(layer.id);
    return layer;
  }, [layers.length]);

  const updateLayer = useCallback((id: string, patch: Partial<SceneLayer>) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, ...patch } : l));
  }, []);

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => prev.filter(l => l.id !== id));
    if (selectedLayerId === id) setSelectedLayerId(null);
  }, [selectedLayerId]);

  const moveLayerZ = useCallback((id: string, dir: 'up' | 'down') => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id);
      if (idx < 0) return prev;
      const newIdx = dir === 'up' ? Math.min(idx + 1, prev.length - 1) : Math.max(idx - 1, 0);
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next.map((l, i) => ({ ...l, zIndex: i }));
    });
  }, []);

  // ── Drag Handling ─────────────────────────────────────────────
  const handleMouseDown = useCallback((e: MouseEvent, layerId: string) => {
    e.stopPropagation();
    const layer = layers.find(l => l.id === layerId);
    if (!layer || layer.locked) return;
    setSelectedLayerId(layerId);
    setDragging({
      layerId,
      startX: e.clientX,
      startY: e.clientY,
      origX: layer.x,
      origY: layer.y,
    });
  }, [layers]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragging.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragging.startY) / rect.height) * 100;
    updateLayer(dragging.layerId, {
      x: Math.max(-20, Math.min(120, dragging.origX + dx)),
      y: Math.max(-20, Math.min(120, dragging.origY + dy)),
    });
  }, [dragging, updateLayer]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // ── Add from asset library ────────────────────────────────────
  const addAssetLayer = useCallback((asset: Asset) => {
    if (asset.type === 'image' || asset.type === 'sprite') {
      addLayer(layers.length === 0 ? 'background' : 'overlay', {
        name: asset.name,
        imageUrl: asset.url,
      });
    }
  }, [addLayer, layers.length]);

  const addCharacterLayer = useCallback((char: Character) => {
    addLayer('character', {
      name: char.name,
      characterId: char.id,
      imageUrl: char.referenceImage,
      width: 30,
      height: 60,
      x: 35,
      y: 20,
    });
  }, [addLayer]);

  const addTextLayer = useCallback(() => {
    addLayer('text', {
      name: 'Text',
      text: 'Enter text...',
      textStyle: { fontSize: 32, fontFamily: 'sans-serif', color: '#ffffff', align: 'center', bold: true, italic: false },
      width: 40,
      height: 10,
      x: 30,
      y: 80,
    });
  }, [addLayer]);

  // ── Export scene as image ─────────────────────────────────────
  const exportScene = useCallback(async () => {
    setLoading(true);
    try {
      // Create an off-screen canvas and render layers
      const canvas = document.createElement('canvas');
      canvas.width = ar.w;
      canvas.height = ar.h;
      const ctx = canvas.getContext('2d')!;

      // Background color
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, ar.w, ar.h);

      // Render each visible layer (sorted by zIndex)
      const sortedLayers = [...layers].filter(l => l.visible).sort((a, b) => a.zIndex - b.zIndex);

      for (const layer of sortedLayers) {
        ctx.save();
        ctx.globalAlpha = layer.opacity;

        const lx = (layer.x / 100) * ar.w;
        const ly = (layer.y / 100) * ar.h;
        const lw = (layer.width / 100) * ar.w;
        const lh = (layer.height / 100) * ar.h;

        if (layer.rotation) {
          ctx.translate(lx + lw / 2, ly + lh / 2);
          ctx.rotate((layer.rotation * Math.PI) / 180);
          ctx.translate(-(lx + lw / 2), -(ly + lh / 2));
        }

        if (layer.imageUrl) {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error(`Failed to load: ${layer.imageUrl}`));
            img.src = layer.imageUrl!;
          });
          ctx.drawImage(img, lx, ly, lw, lh);
        } else if (layer.text && layer.textStyle) {
          const s = layer.textStyle;
          ctx.font = `${s.italic ? 'italic ' : ''}${s.bold ? 'bold ' : ''}${s.fontSize}px ${s.fontFamily}`;
          ctx.fillStyle = s.color;
          ctx.textAlign = s.align;
          const tx = s.align === 'center' ? lx + lw / 2 : s.align === 'right' ? lx + lw : lx;
          ctx.fillText(layer.text, tx, ly + s.fontSize);
        }
        ctx.restore();
      }

      // Convert to blob and save
      const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/png'));
      const url = URL.createObjectURL(blob);

      saveAsset({
        type: 'image',
        name: `Scene Composition (${aspectRatio})`,
        url,
        provider: 'scene-composer',
      });

      setError('');
    } catch (err: any) {
      setError(err.message || 'Export failed');
    } finally {
      setLoading(false);
    }
  }, [layers, bgColor, ar, aspectRatio, setLoading, setError, saveAsset]);

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header + Tools */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-display text-2xl text-white tracking-wide">🖼️ SCENE <span className="text-rip">COMPOSER</span></h2>
          <p className="text-muted text-xs mt-1">Layer characters, backgrounds & text — build your scene</p>
        </div>
        <div className="flex gap-1">
          {([
            { id: 'select' as Tool, icon: '🖱️', label: 'Select' },
            { id: 'move' as Tool,   icon: '✋', label: 'Move' },
            { id: 'text' as Tool,   icon: '✏️', label: 'Text' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => { setTool(t.id); if (t.id === 'text') addTextLayer(); }}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition ${
                tool === t.id ? 'bg-rip/20 text-rip border border-rip' : 'bg-bg2 text-muted border border-border'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aspect Ratio */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {ASPECT_RATIOS.map(a => (
          <button
            key={a.id}
            onClick={() => setAspectRatio(a.id)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition ${
              aspectRatio === a.id ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500' : 'bg-bg2 text-muted border border-border'
            }`}
          >
            {a.label} <span className="text-muted2 font-normal">({a.desc})</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Canvas Area (3 cols) */}
        <div className="lg:col-span-3">
          <div
            ref={canvasRef}
            className="relative rounded-xl overflow-hidden border-2 border-border bg-bg3"
            style={{ aspectRatio: canvasAspect, backgroundColor: bgColor }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={() => setSelectedLayerId(null)}
          >
            {/* Render layers */}
            {layers
              .filter(l => l.visible)
              .sort((a, b) => a.zIndex - b.zIndex)
              .map(layer => (
                <div
                  key={layer.id}
                  onMouseDown={e => handleMouseDown(e, layer.id)}
                  onClick={e => { e.stopPropagation(); setSelectedLayerId(layer.id); }}
                  className={`absolute transition-shadow ${
                    selectedLayerId === layer.id ? 'ring-2 ring-rip ring-offset-1 ring-offset-transparent' : ''
                  } ${layer.locked ? 'pointer-events-none' : 'cursor-move'}`}
                  style={{
                    left: `${layer.x}%`,
                    top: `${layer.y}%`,
                    width: `${layer.width}%`,
                    height: `${layer.height}%`,
                    opacity: layer.opacity,
                    transform: layer.rotation ? `rotate(${layer.rotation}deg)` : undefined,
                    filter: layer.filter || undefined,
                    mixBlendMode: (layer.blendMode || 'normal') as any,
                    zIndex: layer.zIndex,
                  }}
                >
                  {layer.imageUrl && (
                    <img src={layer.imageUrl} alt="" className="w-full h-full object-cover" draggable={false} />
                  )}
                  {layer.text && layer.textStyle && (
                    <div
                      className="w-full h-full flex items-center"
                      style={{
                        justifyContent: layer.textStyle.align === 'center' ? 'center' : layer.textStyle.align === 'right' ? 'flex-end' : 'flex-start',
                        fontFamily: layer.textStyle.fontFamily,
                        fontSize: `${Math.max(8, layer.textStyle.fontSize * 0.5)}px`,
                        color: layer.textStyle.color,
                        fontWeight: layer.textStyle.bold ? 'bold' : 'normal',
                        fontStyle: layer.textStyle.italic ? 'italic' : 'normal',
                      }}
                    >
                      {layer.text}
                    </div>
                  )}
                </div>
              ))}

            {/* Empty state */}
            {layers.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted">
                <div className="text-4xl mb-3">🖼️</div>
                <div className="text-xs">Add a background, characters, or text to start</div>
                <div className="text-[9px] text-muted2 mt-1">Use the panel on the right →</div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel (1 col) */}
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {/* Add Layers */}
          <div className="bg-bg2 border border-border rounded-xl p-3">
            <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2">Add to Scene</div>

            {/* Add from characters */}
            {characters.length > 0 && (
              <div className="mb-2">
                <div className="text-[8px] text-muted2 mb-1">Characters</div>
                <div className="flex flex-wrap gap-1">
                  {characters.map(c => (
                    <button
                      key={c.id}
                      onClick={() => addCharacterLayer(c)}
                      className="flex items-center gap-1 px-2 py-1 rounded bg-bg3 border border-border text-[9px] text-white hover:border-rip"
                    >
                      {c.referenceImage ? (
                        <img src={c.referenceImage} alt="" className="w-4 h-4 rounded-full object-cover" />
                      ) : (
                        <span>🎨</span>
                      )}
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Add from assets */}
            {assets.filter(a => a.type === 'image' || a.type === 'sprite').length > 0 && (
              <div className="mb-2">
                <div className="text-[8px] text-muted2 mb-1">Images</div>
                <div className="grid grid-cols-4 gap-1">
                  {assets.filter(a => a.type === 'image' || a.type === 'sprite').slice(0, 8).map(a => (
                    <button
                      key={a.id}
                      onClick={() => addAssetLayer(a)}
                      className="rounded border border-border hover:border-rip overflow-hidden"
                    >
                      <img src={a.url} alt="" className="w-full aspect-square object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick adds */}
            <div className="flex gap-1 mt-2">
              <button onClick={addTextLayer} className="flex-1 py-1.5 rounded-lg bg-bg3 border border-border text-[9px] text-muted font-bold hover:border-bord2">
                ✏️ Text
              </button>
              <button
                onClick={() => addLayer('effect', { name: 'Color Overlay', width: 100, height: 100, x: 0, y: 0 })}
                className="flex-1 py-1.5 rounded-lg bg-bg3 border border-border text-[9px] text-muted font-bold hover:border-bord2"
              >
                ✨ Effect
              </button>
            </div>
          </div>

          {/* Layers List */}
          <div className="bg-bg2 border border-border rounded-xl p-3">
            <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2">Layers ({layers.length})</div>
            <div className="space-y-1">
              {[...layers].reverse().map(l => (
                <div
                  key={l.id}
                  onClick={() => setSelectedLayerId(l.id)}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition ${
                    selectedLayerId === l.id ? 'bg-rip/10 border border-rip' : 'bg-bg3 border border-transparent hover:border-border'
                  }`}
                >
                  <button
                    onClick={e => { e.stopPropagation(); updateLayer(l.id, { visible: !l.visible }); }}
                    className="text-[10px]"
                  >
                    {l.visible ? '👁️' : '🚫'}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-white truncate">{l.name}</div>
                    <div className="text-[8px] text-muted2">{l.type}</div>
                  </div>
                  <div className="flex gap-0.5">
                    <button onClick={e => { e.stopPropagation(); moveLayerZ(l.id, 'up'); }} className="text-[9px] text-muted hover:text-white">▲</button>
                    <button onClick={e => { e.stopPropagation(); moveLayerZ(l.id, 'down'); }} className="text-[9px] text-muted hover:text-white">▼</button>
                    <button onClick={e => { e.stopPropagation(); updateLayer(l.id, { locked: !l.locked }); }} className="text-[9px]">{l.locked ? '🔒' : '🔓'}</button>
                    <button onClick={e => { e.stopPropagation(); removeLayer(l.id); }} className="text-[9px] text-red-400 hover:text-red-300">✕</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Layer Properties */}
          {selectedLayer && (
            <div className="bg-bg2 border border-border rounded-xl p-3">
              <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2">Properties</div>

              {/* Position */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[8px] text-muted2 block mb-0.5">X Position</label>
                  <input type="range" min="-20" max="120" value={selectedLayer.x}
                    onChange={e => updateLayer(selectedLayer.id, { x: Number(e.target.value) })}
                    className="w-full h-1 accent-rip" />
                </div>
                <div>
                  <label className="text-[8px] text-muted2 block mb-0.5">Y Position</label>
                  <input type="range" min="-20" max="120" value={selectedLayer.y}
                    onChange={e => updateLayer(selectedLayer.id, { y: Number(e.target.value) })}
                    className="w-full h-1 accent-rip" />
                </div>
              </div>

              {/* Size */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[8px] text-muted2 block mb-0.5">Width</label>
                  <input type="range" min="5" max="200" value={selectedLayer.width}
                    onChange={e => updateLayer(selectedLayer.id, { width: Number(e.target.value) })}
                    className="w-full h-1 accent-purple-500" />
                </div>
                <div>
                  <label className="text-[8px] text-muted2 block mb-0.5">Height</label>
                  <input type="range" min="5" max="200" value={selectedLayer.height}
                    onChange={e => updateLayer(selectedLayer.id, { height: Number(e.target.value) })}
                    className="w-full h-1 accent-purple-500" />
                </div>
              </div>

              {/* Opacity + Rotation */}
              <div className="grid grid-cols-2 gap-2 mb-2">
                <div>
                  <label className="text-[8px] text-muted2 block mb-0.5">Opacity ({Math.round(selectedLayer.opacity * 100)}%)</label>
                  <input type="range" min="0" max="100" value={selectedLayer.opacity * 100}
                    onChange={e => updateLayer(selectedLayer.id, { opacity: Number(e.target.value) / 100 })}
                    className="w-full h-1 accent-cyan-500" />
                </div>
                <div>
                  <label className="text-[8px] text-muted2 block mb-0.5">Rotation ({selectedLayer.rotation}°)</label>
                  <input type="range" min="-180" max="180" value={selectedLayer.rotation}
                    onChange={e => updateLayer(selectedLayer.id, { rotation: Number(e.target.value) })}
                    className="w-full h-1 accent-cyan-500" />
                </div>
              </div>

              {/* Filter */}
              <div className="mb-2">
                <label className="text-[8px] text-muted2 block mb-1">Filter</label>
                <div className="flex flex-wrap gap-1">
                  {FILTERS.map(f => (
                    <button
                      key={f.id}
                      onClick={() => updateLayer(selectedLayer.id, { filter: f.css === 'none' ? undefined : f.css })}
                      className={`px-2 py-0.5 rounded text-[8px] transition ${
                        (selectedLayer.filter || 'none') === f.css || (!selectedLayer.filter && f.id === 'none')
                          ? 'bg-rip/20 text-rip border border-rip'
                          : 'bg-bg3 text-muted border border-border'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Blend Mode */}
              <div className="mb-2">
                <label className="text-[8px] text-muted2 block mb-1">Blend</label>
                <select
                  value={selectedLayer.blendMode || 'normal'}
                  onChange={e => updateLayer(selectedLayer.id, { blendMode: e.target.value })}
                  className="w-full px-2 py-1 rounded bg-bg3 border border-border text-[9px] text-white"
                >
                  {BLEND_MODES.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* Text properties */}
              {selectedLayer.type === 'text' && selectedLayer.textStyle && (
                <div className="space-y-2 pt-2 border-t border-border">
                  <textarea
                    value={selectedLayer.text || ''}
                    onChange={e => updateLayer(selectedLayer.id, { text: e.target.value })}
                    rows={2}
                    className="w-full px-2 py-1 rounded bg-bg3 border border-border text-xs text-white resize-none focus:outline-none focus:border-rip"
                  />
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={selectedLayer.textStyle.color}
                      onChange={e => updateLayer(selectedLayer.id, { textStyle: { ...selectedLayer.textStyle!, color: e.target.value } })}
                      className="w-6 h-6 rounded border border-border cursor-pointer"
                    />
                    <input
                      type="number"
                      value={selectedLayer.textStyle.fontSize}
                      onChange={e => updateLayer(selectedLayer.id, { textStyle: { ...selectedLayer.textStyle!, fontSize: Number(e.target.value) } })}
                      className="w-16 px-2 py-1 rounded bg-bg3 border border-border text-[9px] text-white"
                      min={8} max={200}
                    />
                    <button
                      onClick={() => updateLayer(selectedLayer.id, { textStyle: { ...selectedLayer.textStyle!, bold: !selectedLayer.textStyle!.bold } })}
                      className={`px-2 py-1 rounded text-[10px] font-bold ${selectedLayer.textStyle.bold ? 'bg-rip/20 text-rip' : 'bg-bg3 text-muted'}`}
                    >
                      B
                    </button>
                    <button
                      onClick={() => updateLayer(selectedLayer.id, { textStyle: { ...selectedLayer.textStyle!, italic: !selectedLayer.textStyle!.italic } })}
                      className={`px-2 py-1 rounded text-[10px] italic ${selectedLayer.textStyle.italic ? 'bg-rip/20 text-rip' : 'bg-bg3 text-muted'}`}
                    >
                      I
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Background Color */}
          <div className="bg-bg2 border border-border rounded-xl p-3">
            <div className="text-[9px] font-bold text-muted uppercase tracking-widest mb-2">Background</div>
            <div className="flex items-center gap-2">
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded border border-border cursor-pointer" />
              <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} className="flex-1 px-2 py-1 rounded bg-bg3 border border-border text-[9px] text-white" />
            </div>
          </div>

          {/* Export */}
          <button
            onClick={exportScene}
            disabled={loading || layers.length === 0}
            className="w-full py-2.5 rounded-xl font-bold text-xs transition-all disabled:opacity-30"
            style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)', color: 'white' }}
          >
            {loading ? '⏳ Exporting...' : '📸 Export Scene to Asset Library'}
          </button>
        </div>
      </div>
    </div>
  );
}
