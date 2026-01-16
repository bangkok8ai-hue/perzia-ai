'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/I18nProvider';
import { useInfiniteJobs, useEngines, hideJob } from '@/lib/api';
import { HeaderBar } from '@/components/HeaderBar';
import { AppSidebar } from '@/components/AppSidebar';
import { AudioEqualizerBadge } from '@/components/ui/AudioEqualizerBadge';
import type { Job } from '@/types/jobs';

export default function LibraryPage() {
  const { t } = useI18n();
  const [activeEngine, setActiveEngine] = useState<string>('all');
  const [dateSort, setDateSort] = useState<'newest' | 'oldest'>('newest');
  const [hoveredJobId, setHoveredJobId] = useState<string | null>(null);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);

  const { data, error, isLoading, stableJobs, mutate } = useInfiniteJobs(24, { type: 'video' });
  const { data: enginesData } = useEngines();
  const engines = useMemo(() => enginesData?.engines ?? [], [enginesData?.engines]);

  const completedVideos = useMemo(() => {
    if (!stableJobs || !Array.isArray(stableJobs)) return [];
    return stableJobs.filter(
      (job: Job) => job.status === 'completed' && job.videoUrl
    );
  }, [stableJobs]);

  const filteredVideos = useMemo(() => {
    if (activeEngine === 'all') return completedVideos;
    return completedVideos.filter((job: Job) => job.engineId === activeEngine);
  }, [completedVideos, activeEngine]);

  const sortedVideos = useMemo(() => {
    const sorted = [...filteredVideos];
    sorted.sort((a, b) => {
      const timeA = Date.parse(a.createdAt ?? '');
      const timeB = Date.parse(b.createdAt ?? '');
      return dateSort === 'newest' ? timeB - timeA : timeA - timeB;
    });
    return sorted;
  }, [filteredVideos, dateSort]);

  const handleDelete = useCallback(
    async (jobId: string) => {
      setDeletingJobId(jobId);
      try {
        await hideJob(jobId);
        await mutate();
      } catch (error) {
        console.error('Failed to delete video', error);
      } finally {
        setDeletingJobId(null);
      }
    },
    [mutate]
  );

  const getPriceLabel = useCallback((job: Job) => {
    if (!job.finalPriceCents || job.finalPriceCents <= 0) return null;
    const dollars = (job.finalPriceCents / 100).toFixed(2);
    return `$${dollars}`;
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-bg">
      <HeaderBar />
      <div className="flex flex-1 min-w-0">
        <AppSidebar />
        <main className="flex-1 min-w-0 overflow-y-auto p-5 lg:p-7">
          {/* Hero Section */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-text-primary">Your Generated Videos</h1>
              <p className="text-sm text-text-secondary">All your completed video generations</p>
            </div>
            <Link
              href="/app"
              prefetch={false}
              className="rounded-input border border-border px-3 py-1 text-sm hover:bg-white/70"
            >
              Generate video
            </Link>
          </div>

          {/* Filters Section */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Engine Filters */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setActiveEngine('all')}
                className={
                  activeEngine === 'all'
                    ? 'bg-accent text-white px-4 py-2 rounded-full text-sm font-semibold'
                    : 'border border-border px-4 py-2 rounded-full text-sm font-semibold hover:bg-white'
                }
              >
                All
              </button>
              {engines.map((engine) => (
                <button
                  key={engine.id}
                  onClick={() => setActiveEngine(engine.id)}
                  className={
                    activeEngine === engine.id
                      ? 'bg-accent text-white px-4 py-2 rounded-full text-sm font-semibold'
                      : 'border border-border px-4 py-2 rounded-full text-sm font-semibold hover:bg-white'
                  }
                >
                  {engine.label}
                </button>
              ))}
            </div>

            {/* Date Sort Dropdown */}
            <select
              value={dateSort}
              onChange={(e) => setDateSort(e.target.value as 'newest' | 'oldest')}
              className="rounded-input border border-border px-3 py-2 text-sm bg-white"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>

          {/* Video Grid */}
          <section className="rounded-card border border-border bg-white/80 p-5 shadow-card">
            {isLoading && sortedVideos.length === 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="rounded-[18px] border border-hairline bg-white/60">
                    <div className="relative aspect-video rounded-t-[18px] bg-neutral-100">
                      <div className="skeleton absolute inset-0 rounded-t-[18px]" />
                    </div>
                    <div className="border-t border-border px-4 py-3">
                      <div className="h-3 w-28 rounded bg-neutral-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="rounded-card border border-state-warning/40 bg-state-warning/10 px-4 py-6 text-sm text-state-warning">
                Failed to load videos. Please refresh the page.
              </div>
            ) : sortedVideos.length === 0 ? (
              <div className="rounded-card border border-dashed border-border px-4 py-6 text-center text-sm text-text-secondary">
                No videos generated yet. Create your first video!
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sortedVideos.map((job) => {
                  const priceLabel = getPriceLabel(job);
                  const isHovered = hoveredJobId === job.jobId;
                  const isDeleting = deletingJobId === job.jobId;

                  return (
                    <Link
                      key={job.jobId}
                      href={`/video/${encodeURIComponent(job.jobId)}`}
                      className="group relative block overflow-hidden rounded-[18px] border border-hairline bg-white shadow-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      onMouseEnter={() => setHoveredJobId(job.jobId)}
                      onMouseLeave={() => setHoveredJobId(null)}
                    >
                      {/* Video/Thumbnail */}
                      <div className="relative w-full overflow-hidden bg-neutral-900/5">
                        <div className="relative w-full" style={{ paddingBottom: `${100 / (16 / 9)}%` }}>
                          <div className="absolute inset-0">
                            {isHovered && job.videoUrl ? (
                              <video
                                muted
                                loop
                                playsInline
                                autoPlay
                                poster={job.thumbUrl ?? undefined}
                                className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-[1.02]"
                              >
                                <source src={job.videoUrl} type="video/mp4" />
                              </video>
                            ) : job.thumbUrl ? (
                              <img
                                src={job.thumbUrl}
                                alt={job.prompt}
                                className="h-full w-full object-cover object-center"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-neutral-100 text-[11px] font-semibold uppercase tracking-micro text-text-muted">
                                No preview
                              </div>
                            )}
                            {/* Audio Badge */}
                            {job.hasAudio ? (
                              <AudioEqualizerBadge tone="light" size="sm" label="Audio available" />
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="space-y-1 px-4 py-3 text-left">
                        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-micro text-text-muted">
                          <span>{job.engineLabel}</span>
                          {priceLabel ? (
                            <span className="rounded-full bg-bg px-2 py-0.5 text-[10px] text-text-secondary">
                              {priceLabel}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm font-semibold leading-snug text-text-primary line-clamp-2">
                          {job.prompt}
                        </p>
                        <p className="text-[11px] text-text-secondary">
                          {job.aspectRatio ?? 'Auto'} · {job.durationSec}s{isHovered ? ' · Playing' : ''}
                        </p>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleDelete(job.jobId);
                          }}
                          disabled={isDeleting}
                          className="mt-2 rounded-input border border-state-warning/40 bg-state-warning/10 px-3 py-1 text-xs font-semibold text-state-warning transition hover:bg-state-warning/20 disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
