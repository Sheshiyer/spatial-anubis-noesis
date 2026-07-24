/**
 * Field Journal UI Component
 * 
 * P3-S3-09: Field Journal UI component (minimal overlay, slides from right)
 */

import React, { useCallback, useMemo } from 'react';
import { useJournalStore, selectFilteredEntries, selectTodayReadings } from '../journalStore';
import { usePolishStore } from '../../engines/meta/polishStore';
import type { JournalProps } from '../types';
import type { EngineId } from '../../engines/meta/types';

const ENGINE_NAMES: Record<EngineId, string> = {
  vimshottari: 'Vimshottari Dasha',
  iching: 'I-Ching Oracle',
  tarot: 'Tarot Arcana',
  runes: 'Rune Stones',
  numerology: 'Numerology Matrix',
  biorhythm: 'Biorhythm Compass',
  genekeys: 'Gene Keys Helix',
  humandesign: 'Human Design',
  chronobiology: 'Chronobiology Clock',
  'decision-mirror': 'Decision Mirror',
  transits: 'Transit Overlay',
  'somatic-canticle': 'Somatic Canticle',
  'cartographer-compass': 'Cartographer\'s Compass',
};

const ENGINE_ICONS: Record<EngineId, string> = {
  vimshottari: '🪐',
  iching: '☯️',
  tarot: '🃏',
  runes: 'ᚠ',
  numerology: '🔢',
  biorhythm: '♻️',
  genekeys: '🧬',
  humandesign: '📊',
  chronobiology: '⏰',
  'decision-mirror': '🪞',
  transits: '🌟',
  'somatic-canticle': '📖',
  'cartographer-compass': '🧭',
};

export const FieldJournal: React.FC<JournalProps> = ({ isOpen, onClose, className = '' }) => {
  const {
    ui,
    setViewMode,
    setSortBy,
    setSearchQuery,
    selectEntry,
    setFilters,
    clearFilters,
    toggleFavorite,
  } = useJournalStore();

  const entries = useJournalStore(selectFilteredEntries);
  const todayReadings = useJournalStore(selectTodayReadings);
  const { getRemainingReadings } = useJournalStore();
  const remaining = getRemainingReadings();
  const isPatron = useJournalStore((s) => s.isPatron);

  const { getCounter } = usePolishStore();
  const counter = getCounter();

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  const handleEngineFilter = useCallback((engineId: EngineId) => {
    const currentEngines = ui.filters.engines;
    if (currentEngines.includes(engineId)) {
      setFilters({ engines: currentEngines.filter((e) => e !== engineId) });
    } else {
      setFilters({ engines: [...currentEngines, engineId] });
    }
  }, [ui.filters.engines, setFilters]);

  const handleExport = useCallback((entryId: string) => {
    const entry = entries.find((e) => e.entryId === entryId);
    if (!entry) return;

    const blob = new Blob([JSON.stringify(entry, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reading-${entry.engineId}-${new Date(entry.timestamp).toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [entries]);

  const handleShare = useCallback((entryId: string) => {
    const { generateShareLink } = useJournalStore.getState();
    const url = generateShareLink(entryId);
    navigator.clipboard.writeText(url);
  }, []);

  const formatDate = useCallback((timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const engineOptions = useMemo(() => Object.entries(ENGINE_NAMES), []);

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end ${className}`}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Journal Panel */}
      <div
        className="relative w-full max-w-md h-full bg-[#1A1A2E] border-l border-[#B8860B]/30 
                   shadow-2xl transform transition-transform duration-300 ease-out
                   animate-slide-in-right overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-6 border-b border-[#B8860B]/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-light text-[#F5F0E8] tracking-wide">
              Field Journal
            </h2>
            <button
              onClick={onClose}
              className="text-[#6B6B6B] hover:text-[#F5F0E8] transition-colors text-xl"
            >
              ×
            </button>
          </div>

          {/* Session Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-[#B8860B]">📖</span>
              <span className="text-[#F5F0E8]/80">
                Today: {todayReadings} {isPatron ? '(Patron)' : `(${remaining} left)`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#B8860B]">✨</span>
              <span className="text-[#F5F0E8]/80">Total: {counter.total}</span>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="p-4 space-y-4 border-b border-[#B8860B]/20">
          <input
            type="text"
            placeholder="Search readings..."
            value={ui.searchQuery}
            onChange={handleSearch}
            className="w-full px-4 py-2 bg-[#0F0F1A] border border-[#6B6B6B]/30 rounded 
                       text-[#F5F0E8] placeholder-[#6B6B6B] focus:border-[#B8860B] 
                       focus:outline-none transition-colors"
          />

          {/* View Mode Toggle */}
          <div className="flex gap-2">
            {(['list', 'grid', 'timeline'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  ui.viewMode === mode
                    ? 'bg-[#B8860B] text-[#1A1A2E]'
                    : 'bg-[#0F0F1A] text-[#6B6B6B] hover:text-[#F5F0E8]'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>

          {/* Engine Filters */}
          <div className="flex flex-wrap gap-2">
            {engineOptions.map(([id, name]) => (
              <button
                key={id}
                onClick={() => handleEngineFilter(id as EngineId)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  ui.filters.engines.includes(id as EngineId)
                    ? 'bg-[#B8860B]/30 text-[#B8860B] border border-[#B8860B]'
                    : 'bg-[#0F0F1A] text-[#6B6B6B] border border-transparent'
                }`}
                title={name}
              >
                {ENGINE_ICONS[id as EngineId]}
              </button>
            ))}
            {ui.filters.engines.length > 0 && (
              <button
                onClick={clearFilters}
                className="px-2 py-1 text-xs text-[#C65D3B] hover:text-[#C65D3B]/80"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort */}
          <select
            value={ui.sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof ui.sortBy)}
            className="w-full px-3 py-1.5 bg-[#0F0F1A] border border-[#6B6B6B]/30 rounded 
                       text-[#F5F0E8] text-sm focus:border-[#B8860B] focus:outline-none"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="engine">By Engine</option>
            <option value="coherence">By Coherence</option>
          </select>
        </div>

        {/* Entries List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {entries.length === 0 ? (
            <div className="text-center py-12 text-[#6B6B6B]">
              <div className="text-4xl mb-4">📖</div>
              <p>No readings yet.</p>
              <p className="text-sm mt-2">Your journey begins with a single consultation.</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.entryId}
                onClick={() => selectEntry(entry.entryId)}
                className={`p-4 rounded border transition-all cursor-pointer group ${
                  ui.selectedEntryId === entry.entryId
                    ? 'bg-[#B8860B]/10 border-[#B8860B]'
                    : 'bg-[#0F0F1A] border-[#6B6B6B]/20 hover:border-[#6B6B6B]/50'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{ENGINE_ICONS[entry.engineId]}</span>
                    <span className="text-[#F5F0E8] font-medium">
                      {ENGINE_NAMES[entry.engineId]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(entry.entryId);
                      }}
                      className={`text-lg transition-colors ${
                        entry.isFavorite ? 'text-[#B8860B]' : 'text-[#6B6B6B] hover:text-[#B8860B]'
                      }`}
                    >
                      {entry.isFavorite ? '★' : '☆'}
                    </button>
                  </div>
                </div>

                <p className="text-[#F5F0E8]/70 text-sm line-clamp-2 mb-2">
                  {entry.interpretation}
                </p>

                <div className="flex items-center justify-between text-xs text-[#6B6B6B]">
                  <span>{formatDate(entry.timestamp)}</span>
                  {entry.coherenceAtReading && (
                    <span className="flex items-center gap-1">
                      <span className="text-[#B8860B]">~</span>
                      {Math.round(entry.coherenceAtReading * 100)}%
                    </span>
                  )}
                </div>

                {entry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-[#B8860B]/10 text-[#B8860B] text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 mt-3 pt-2 border-t border-[#6B6B6B]/20 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShare(entry.entryId);
                    }}
                    className="text-xs text-[#6B6B6B] hover:text-[#B8860B] transition-colors"
                  >
                    Share
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExport(entry.entryId);
                    }}
                    className="text-xs text-[#6B6B6B] hover:text-[#B8860B] transition-colors"
                  >
                    Export
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#B8860B]/20 text-xs text-[#6B6B6B] text-center">
          {entries.length} reading{entries.length !== 1 ? 's' : ''} in journal
        </div>
      </div>

      <style>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default FieldJournal;
