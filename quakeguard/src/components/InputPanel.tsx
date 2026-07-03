import React, { useState, useMemo } from 'react';
import type { EarthquakeInput, Scenario } from '../types';
import scenariosData from '../data/scenarios.json';
import regionsData from '../data/regions.json';

interface InputPanelProps {
  onSubmit: (input: EarthquakeInput) => void;
  isLoading: boolean;
  isRealData?: boolean;
}

interface SigunguInfo { name: string; lat: number; lng: number; }
interface SidoInfo    { sido: string; lat: number; lng: number; sigungu: SigunguInfo[]; }

const REGIONS = regionsData as SidoInfo[];
const scenarios = scenariosData as Scenario[];

function getMagnitudeColor(m: number): string {
  if (m >= 6.0) return 'var(--color-danger)';
  if (m >= 4.0) return 'var(--color-warning)';
  return 'var(--color-safe)';
}

function getMagnitudeLabel(m: number): string {
  if (m >= 7.0) return '대규모 지진 (전국적 피해 우려)';
  if (m >= 5.0) return '중규모 지진 (구조물 피해 발생)';
  if (m >= 3.0) return '소규모 지진 (실내 체감 가능)';
  return '미소 지진 (일반인 체감 불가)';
}

export function InputPanel({ onSubmit, isLoading, isRealData = false }: InputPanelProps) {
  const [magnitude, setMagnitude] = useState<number>(1.0);
  const [occurredAt, setOccurredAt] = useState<string>(new Date().toISOString().slice(0, 16));
  const [sido, setSido]       = useState<string>('');
  const [sigungu, setSigungu] = useState<string>('');
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  // 선택된 시/도의 시/군/구 목록
  const sidoInfo   = useMemo(() => REGIONS.find(r => r.sido === sido),  [sido]);
  const sigunguList = useMemo(() => sidoInfo?.sigungu ?? [], [sidoInfo]);

  // 선택된 시/군/구의 좌표
  const sigunguInfo = useMemo(
    () => sigunguList.find(s => s.name === sigungu) ?? null,
    [sigunguList, sigungu]
  );

  const handleSidoChange = (newSido: string) => {
    setSido(newSido);
    const firstSigungu = (REGIONS.find(r => r.sido === newSido)?.sigungu ?? [])[0];
    setSigungu(firstSigungu?.name ?? '');
    setActiveScenarioId(null);
  };

  const handleScenarioClick = (scenario: Scenario) => {
    setMagnitude(scenario.input.magnitude);
    setOccurredAt(scenario.input.occurredAt.slice(0, 16));
    setSido(scenario.input.region.sido);
    setSigungu(scenario.input.region.sigungu);
    setActiveScenarioId(scenario.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sido || !sigungu || !sigunguInfo) return;
    onSubmit({
      region: { sido, sigungu, lat: sigunguInfo.lat, lng: sigunguInfo.lng },
      magnitude,
      depth: 10,
      occurredAt,
    });
  };

  const magnitudeColor = getMagnitudeColor(magnitude);

  return (
    <div className="input-panel">
      {/* ── 시나리오 빠른 선택 ── */}
      <section className="input-section">
        <h3 className="input-section-label">시나리오 빠른 선택</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {scenarios.map(s => (
            <button
              key={s.id}
              onClick={() => handleScenarioClick(s)}
              disabled={isLoading}
              className={`scenario-btn ${activeScenarioId === s.id ? 'scenario-btn--active' : ''}`}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: activeScenarioId === s.id ? 'var(--color-accent)' : 'var(--color-danger)', fontSize: 'var(--font-size-sm)' }}>
                  {s.label}
                </span>
                <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                  M{s.input.magnitude}
                </span>
              </div>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', marginTop: '0.2rem' }}>
                {s.input.region.sigungu} · {s.description}
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="input-divider" />

      {/* ── 수동 입력 폼 ── */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

        {/* 시/도 선택 */}
        <div className="input-field">
          <label className="input-label">발생 지역 — 시/도</label>
          <select
            value={sido}
            onChange={e => handleSidoChange(e.target.value)}
            disabled={isLoading}
            className="input-select"
          >
            <option value="" disabled>시/도 선택</option>
            {REGIONS.map(r => (
              <option key={r.sido} value={r.sido}>{r.sido}</option>
            ))}
          </select>
        </div>

        {/* 시/군/구 선택 */}
        <div className="input-field">
          <label className="input-label">발생 지역 — 시/군/구</label>
          <select
            value={sigungu}
            onChange={e => { setSigungu(e.target.value); setActiveScenarioId(null); }}
            disabled={isLoading || !sido}
            className="input-select"
          >
            <option value="" disabled>{sido ? '시/군/구 선택' : '시/도를 먼저 선택하세요'}</option>
            {sigunguList.map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* 좌표 표시 (읽기 전용 정보) */}
        {sigunguInfo && (
          <div style={{
            display: 'flex', gap: '0.5rem',
            padding: '0.45rem 0.75rem',
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-text-muted)',
          }}>
            <span>위도 {sigunguInfo.lat.toFixed(4)}  경도 {sigunguInfo.lng.toFixed(4)}</span>
          </div>
        )}

        {/* 규모 슬라이더 */}
        <div className="input-field">
          <label className="input-label">
            규모 (M) —&nbsp;
            <span style={{ color: magnitudeColor, fontWeight: 700 }}>M{magnitude.toFixed(1)}</span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', marginLeft: '0.4rem' }}>
              {getMagnitudeLabel(magnitude)}
            </span>
          </label>
          <input
            type="range" min="1.0" max="9.0" step="0.1"
            value={magnitude}
            onChange={e => { setMagnitude(parseFloat(e.target.value)); setActiveScenarioId(null); }}
            disabled={isLoading}
            className="magnitude-slider"
            style={{ 
              '--slider-color': magnitudeColor,
              '--slider-val': `${((magnitude - 1.0) / 8.0) * 100}%`
            } as React.CSSProperties}
          />
          <div style={{ position: 'relative', height: '2.5rem', fontSize: '0.65rem', color: 'var(--color-text-muted)', marginTop: '0.4rem' }}>
            <div style={{ position: 'absolute', left: '0%', textAlign: 'left' }}>
              M1.0<br/><span style={{color:'var(--color-safe)'}}>미소</span>
            </div>
            <div style={{ position: 'absolute', left: '25%', transform: 'translateX(-50%)', textAlign: 'center' }}>
              M3.0<br/><span style={{color:'#84cc16'}}>소규모</span>
            </div>
            <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
              M5.0<br/><span style={{color:'var(--color-warning)'}}>중규모</span>
            </div>
            <div style={{ position: 'absolute', left: '75%', transform: 'translateX(-50%)', textAlign: 'center' }}>
              M7.0<br/><span style={{color:'var(--color-danger)'}}>대규모</span>
            </div>
            <div style={{ position: 'absolute', right: '0%', textAlign: 'right' }}>
              M9.0<br/><span style={{color:'#991b1b'}}>초거대</span>
            </div>
          </div>
        </div>

        {/* 발생 시각 */}
        <div className="input-field">
          <label className="input-label">발생 시각</label>
          <input
            type="datetime-local"
            value={occurredAt}
            onChange={e => { setOccurredAt(e.target.value); setActiveScenarioId(null); }}
            disabled={isLoading}
            className="input-datetime"
          />
        </div>

        {/* 데이터 출처 안내 */}


        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={isLoading || !sido || !sigungu}
          className={`submit-btn ${isLoading ? 'submit-btn--loading' : ''}`}
          style={{ opacity: (!sido || !sigungu) ? 0.5 : 1 }}
        >
          {isLoading ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center' }}>
              <span className="loading-dots" />
              AI 분석 중...
            </span>
          ) : 'AI 분석 시작'}
        </button>
      </form>

      <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', textAlign: 'center', lineHeight: 1.7 }}>
        재난안전데이터(건축물·대피소·CCTV)를 기반으로<br/>AI가 즉시 조치사항을 생성합니다.
      </p>
    </div>
  );
}
