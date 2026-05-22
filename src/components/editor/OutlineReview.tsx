'use client';

import { useState } from 'react';
import { useNovelStore } from '@/stores/novel-store';
import { useUIStore } from '@/stores/ui-store';
import { GROWTH_STAGES } from '@/services/writing-framework';
import type { GenerationOutline, Protagonist, TimelineNode } from '@/types';
import { cn } from '@/lib/utils';
import { Check, Edit3, User, MapPin, GitBranch, Clock, ChevronRight, BookOpen, X } from 'lucide-react';

export default function OutlineReview() {
  const currentNovel = useNovelStore((s) => s.currentNovel());
  const updateNovel = useNovelStore((s) => s.updateNovel);
  const setGenerationPhase = useNovelStore((s) => s.setGenerationPhase);
  const setEditorMode = useUIStore((s) => s.setEditorMode);
  const setSelectedChapterId = useUIStore((s) => s.setSelectedChapterId);

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  if (!currentNovel || !currentNovel.generationOutline) return null;

  const outline = currentNovel.generationOutline;
  const { protagonist, timeline, chapters, worldBuilding } = outline;

  const startEditing = (field: string, value: string) => {
    setEditingField(field);
    setEditValue(value);
  };

  const saveEdit = () => {
    if (!editingField) return;
    const updated: Partial<GenerationOutline> = { ...outline };

    if (editingField.startsWith('protagonist.')) {
      const key = editingField.split('.')[1] as keyof Protagonist;
      updated.protagonist = { ...protagonist, [key]: editValue };
    } else if (editingField === 'worldBuilding') {
      updated.worldBuilding = editValue;
    } else if (editingField === 'outline') {
      updated.outline = editValue;
    }

    updateNovel(currentNovel.id, { generationOutline: updated as GenerationOutline });
    setEditingField(null);
  };

  const handleStartWriting = () => {
    if (currentNovel.chapters.length === 0) return;
    setGenerationPhase(currentNovel.id, 'writing');
    setSelectedChapterId(currentNovel.chapters[0]?.id || null);
    setEditorMode('chapter-edit');
  };

  const handleRegenerate = () => {
    setGenerationPhase(currentNovel.id, 'idle');
    setEditorMode('inspiration');
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-6 space-y-6 animate-fade-in">
        {/* Header */}
        <div className="text-center space-y-2 pb-4 border-b border-[var(--color-border-primary)]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-green-bg)] text-[var(--color-green)] text-xs">
            <Check size={12} />
            大纲生成完成
          </div>
          <h2 className="text-xl font-bold text-[var(--color-text-primary)]">{currentNovel.title}</h2>
          <p className="text-sm text-[var(--color-text-muted)]">{outline.synopsis}</p>
          <div className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]">
            <span className="bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">{outline.genre}</span>
            {outline.subGenre && (
              <span className="bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">{outline.subGenre}</span>
            )}
            <span className="bg-[var(--color-bg-tertiary)] px-2 py-0.5 rounded">{chapters.length} 章</span>
          </div>
        </div>

        {/* Protagonist card */}
        <EditableSection
          icon={User}
          title="主角设定"
          accent="var(--color-purple)"
        >
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <Field label="姓名" value={protagonist.name} onEdit={(v) => startEditing('protagonist.name', v)} />
            <Field label="性别" value={protagonist.gender} onEdit={(v) => startEditing('protagonist.gender', v)} />
            <Field label="年龄" value={protagonist.age} onEdit={(v) => startEditing('protagonist.age', v)} />
            <Field label="能力" value={protagonist.abilities} onEdit={(v) => startEditing('protagonist.abilities', v)} />
            <Field label="性格" value={protagonist.personality} onEdit={(v) => startEditing('protagonist.personality', v)} span />
            <Field label="身世" value={protagonist.background} onEdit={(v) => startEditing('protagonist.background', v)} span />
            <Field label="目标" value={protagonist.goals} onEdit={(v) => startEditing('protagonist.goals', v)} span />
          </div>
        </EditableSection>

        {/* World Building */}
        <EditableSection
          icon={MapPin}
          title="世界观设定"
          accent="var(--color-blue)"
        >
          <p
            className="text-sm text-[var(--color-text-secondary)] leading-relaxed cursor-pointer hover:bg-[var(--color-bg-hover)] p-2 -m-2 rounded transition-colors"
            onClick={() => startEditing('worldBuilding', worldBuilding)}
          >
            {worldBuilding || '暂无设定'}
          </p>
        </EditableSection>

        {/* Timeline */}
        <EditableSection
          icon={Clock}
          title="五段成长时间线"
          accent="var(--color-accent)"
        >
          <div className="space-y-2">
            {timeline.map((node: TimelineNode, i: number) => {
              const stage = GROWTH_STAGES[i];
              return (
                <div key={i} className="flex items-start gap-3 p-2 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-hover)] transition-colors">
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                    style={{ background: stage?.color || '#666' }}
                  >
                    {i + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium" style={{ color: stage?.color }}>
                        {node.phase}
                      </span>
                      <span className="text-xs text-[var(--color-text-secondary)]">{node.event}</span>
                    </div>
                    <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{node.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </EditableSection>

        {/* Story Outline */}
        <EditableSection
          icon={GitBranch}
          title="完整故事大纲"
          accent="var(--color-text-secondary)"
        >
          <p
            className="text-sm text-[var(--color-text-secondary)] leading-relaxed cursor-pointer hover:bg-[var(--color-bg-hover)] p-2 -m-2 rounded transition-colors whitespace-pre-wrap"
            onClick={() => startEditing('outline', outline.outline)}
          >
            {outline.outline || '暂无大纲'}
          </p>
        </EditableSection>

        {/* Chapter list */}
        <EditableSection
          icon={BookOpen}
          title={`章节目录（${chapters.length} 章）`}
          accent="var(--color-green)"
        >
          <div className="space-y-1">
            {chapters.map((ch, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-hover)] transition-colors text-sm"
              >
                <span className="text-[10px] text-[var(--color-text-dim)] w-5 shrink-0">{i + 1}</span>
                <span className="font-medium text-[var(--color-text-secondary)] shrink-0">{ch.title}</span>
                <span className="text-xs text-[var(--color-text-muted)] truncate">— {ch.summary}</span>
              </div>
            ))}
          </div>
        </EditableSection>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 pt-2 pb-4">
          <button onClick={handleRegenerate} className="btn-secondary text-xs">
            <X size={14} />
            重新生成
          </button>
          <button onClick={handleStartWriting} className="btn-primary text-sm px-8">
            <ChevronRight size={16} />
            确认大纲，开始写作
          </button>
        </div>
      </div>

      {/* Inline edit modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setEditingField(null)} />
          <div className="relative w-full max-w-lg glass-panel rounded-[var(--radius-xl)] p-5 animate-slide-up">
            <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-3">编辑 {editingField}</h4>
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full h-24 input-field text-sm resize-none"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 mt-3">
              <button onClick={() => setEditingField(null)} className="btn-secondary text-xs">取消</button>
              <button onClick={saveEdit} className="btn-primary text-xs">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EditableSection({
  icon: Icon,
  title,
  accent,
  children,
}: {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  title: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-card p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Icon size={15} style={{ color: accent }} />
        <h4 className="text-sm font-medium text-[var(--color-text-primary)]">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  value,
  onEdit,
  span,
}: {
  label: string;
  value: string;
  onEdit: (v: string) => void;
  span?: boolean;
}) {
  return (
    <div className={cn('flex items-baseline gap-2 min-w-0', span && 'col-span-2')}>
      <span className="text-xs text-[var(--color-text-dim)] shrink-0">{label}:</span>
      <span
        className="text-xs text-[var(--color-text-secondary)] truncate cursor-pointer hover:text-[var(--color-accent)] transition-colors"
        onClick={() => onEdit(value)}
      >
        {value || '未设置'}
        <Edit3 size={10} className="inline ml-1 text-[var(--color-text-dim)]" />
      </span>
    </div>
  );
}
