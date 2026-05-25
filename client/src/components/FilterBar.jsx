import { useState, useRef, useEffect } from 'react';
import { NEIGHBORHOODS } from '../constants';
import './FilterBar.css';

// Horizontally-scrollable pill row with left/right arrow nav.
// Arrows only appear when the content actually overflows.
function ScrollablePills({ children }) {
  const scrollRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 2);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateArrows);
      ro.disconnect();
    };
  }, []);

  const scrollBy = (delta) => {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' });
  };

  return (
    <div className="filter-pills-scroller">
      <button
        type="button"
        className={`filter-scroll-arrow filter-scroll-arrow--left ${canLeft ? '' : 'hidden'}`}
        onClick={() => scrollBy(-220)}
        aria-label="Scroll left"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      <div className="filter-pills filter-pills--scroll" ref={scrollRef}>
        {children}
      </div>
      <button
        type="button"
        className={`filter-scroll-arrow filter-scroll-arrow--right ${canRight ? '' : 'hidden'}`}
        onClick={() => scrollBy(220)}
        aria-label="Scroll right"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  );
}

const DATE_OPTIONS = [
  { value: 'all',       label: 'Any date' },
  { value: 'upcoming',  label: 'Upcoming' },
  { value: 'this-week', label: 'This week' },
  { value: 'weekend',   label: 'Weekend' },
];

const TYPE_OPTIONS = [
  { value: 'all',             label: 'All',                    icon: null },
  { value: 'performing-arts', label: 'Performing Arts',        icon: '🎭' },
  { value: 'visual-arts',     label: 'Visual Arts',            icon: '🎨' },
  { value: 'festivals',       label: 'Festivals & Fairs',      icon: '🎉' },
  { value: 'community',       label: 'Community Celebrations', icon: '🏳️' },
  { value: 'workshops',       label: 'Workshops & Education',  icon: '🎓' },
  { value: 'film',            label: 'Film & Media',           icon: '🎬' },
  { value: 'public-art',      label: 'Public Art & Tours',     icon: '👩🏼‍🎨' },
  { value: 'wellness',        label: 'Health & Wellness',      icon: '🧘' },
  { value: 'kid-friendly',    label: 'Kid Friendly',           icon: '🪁' },
  { value: 'parks',           label: 'Parks Event',            icon: '🍃' },
];

const PRICE_OPTIONS = [
  { value: 'all',  label: 'Any price' },
  { value: 'free', label: '🎟 Free' },
  { value: 'paid', label: '💳 Paid' },
];

export default function FilterBar({ filters, onChange, onClear, resultCount }) {
  const [open, setOpen] = useState(false);

  const activeCount = [
    filters.dateRange    !== 'all',
    filters.category     !== 'all',
    filters.neighborhood !== 'all',
    filters.price        !== 'all',
  ].filter(Boolean).length;

  const filterGroups = (
    <div className="filter-bar-inner">

      {/* Date */}
      <div className="filter-group">
        <span className="filter-label">Date</span>
        <div className="filter-pills">
          {DATE_OPTIONS.map(o => (
            <button
              key={o.value}
              className={`filter-pill ${filters.dateRange === o.value ? 'active' : ''}`}
              onClick={() => onChange('dateRange', o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="filter-divider" />

      {/* Type */}
      <div className="filter-group filter-group--type">
        <span className="filter-label">Type</span>
        <ScrollablePills>
          {TYPE_OPTIONS.map(o => (
            <button
              key={o.value}
              className={`filter-pill ${filters.category === o.value ? 'active' : ''}`}
              onClick={() => onChange('category', o.value)}
            >
              {o.icon && <span className="pill-icon">{o.icon}</span>}
              {o.label}
            </button>
          ))}
        </ScrollablePills>
      </div>

      <div className="filter-divider" />

      {/* Neighborhood */}
      <div className="filter-group">
        <span className="filter-label">Neighborhood</span>
        <select
          className="filter-select"
          value={filters.neighborhood}
          onChange={e => onChange('neighborhood', e.target.value)}
        >
          <option value="all">All wards</option>
          {NEIGHBORHOODS.map(n => (
            <option key={n.value} value={n.value}>
              {n.short} — {n.label.split('—')[1]?.trim()}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-divider" />

      {/* Price */}
      <div className="filter-group">
        <span className="filter-label">Price</span>
        <div className="filter-pills">
          {PRICE_OPTIONS.map(o => (
            <button
              key={o.value}
              className={`filter-pill ${filters.price === o.value ? 'active' : ''}`}
              onClick={() => onChange('price', o.value)}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );

  return (
    <div className="filter-bar">

      {/* ── Mobile toggle row ──────────────────────── */}
      <div className="filter-mobile-header">
        <button
          className={`filter-toggle-btn ${activeCount > 0 ? 'has-active' : ''}`}
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Filters
          {activeCount > 0 && (
            <span className="filter-active-badge">{activeCount}</span>
          )}
          <svg
            className={`filter-chevron ${open ? 'open' : ''}`}
            width="13" height="13" viewBox="0 0 24 24" fill="none"
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="filter-mobile-meta">
          {resultCount !== undefined && (
            <span className="filter-result-count">{resultCount} event{resultCount !== 1 ? 's' : ''}</span>
          )}
          {activeCount > 0 && (
            <button className="filter-clear-btn" onClick={onClear}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Desktop: always visible ────────────────── */}
      <div className="filter-desktop-body">
        {filterGroups}
        <div className="filter-meta">
          {resultCount !== undefined && (
            <span className="filter-result-count">{resultCount} event{resultCount !== 1 ? 's' : ''}</span>
          )}
          {activeCount > 0 && (
            <button className="filter-clear-btn" onClick={onClear}>
              ✕ Clear {activeCount} filter{activeCount !== 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      {/* ── Mobile: collapsible panel ──────────────── */}
      <div className={`filter-mobile-body ${open ? 'open' : ''}`}>
        {filterGroups}
        {activeCount > 0 && (
          <button className="filter-clear-full" onClick={() => { onClear(); setOpen(false); }}>
            Clear all filters
          </button>
        )}
      </div>

    </div>
  );
}

// ── Utility ───────────────────────────────────────────────────────────────
export function applyClientFilters(events, filters) {
  let out = events;
  const now = new Date();

  const isActiveDuring = (e, start, end) => {
    const eStart = new Date(e.date);
    const eEnd = e.endDate ? new Date(e.endDate) : eStart;
    return eStart <= end && eEnd >= start;
  };

  if (filters.dateRange === 'upcoming') {
    out = out.filter(e => {
      const eEnd = e.endDate ? new Date(e.endDate) : new Date(e.date);
      return new Date(e.date) >= now || eEnd >= now;
    });
  } else if (filters.dateRange === 'this-week') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() + mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    out = out.filter(e => isActiveDuring(e, weekStart, weekEnd));
  } else if (filters.dateRange === 'weekend') {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayOfWeek = today.getDay();
    const satOffset = dayOfWeek === 0 ? -1 : 6 - dayOfWeek;
    const saturday = new Date(today);
    saturday.setDate(today.getDate() + satOffset);
    const sunday = new Date(saturday);
    sunday.setDate(saturday.getDate() + 1);
    sunday.setHours(23, 59, 59, 999);
    out = out.filter(e => isActiveDuring(e, saturday, sunday));
  }

  if (filters.price === 'free') {
    out = out.filter(e => e.isFree !== false);
  } else if (filters.price === 'paid') {
    out = out.filter(e => e.isFree === false);
  }

  return out;
}