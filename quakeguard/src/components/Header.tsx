import React from 'react';
import type { AiResponseStatus } from '../types';

interface HeaderProps {
  status: AiResponseStatus;
  isMockMode: boolean;
  onSettingsClick: () => void;
}

const statusConfig: Record<AiResponseStatus, { label: string; color: string; bg: string }> = {
  idle:      { label: '대기 중',    color: '#fff',                        bg: 'var(--color-bg-elevated)' },
  loading:   { label: 'AI 분석 중 ···', color: '#000',                   bg: 'var(--color-warning)' },
  streaming: { label: 'AI 출력 중 ···', color: '#000',                   bg: 'var(--color-warning)' },
  done:      { label: '분석 완료',  color: '#fff',                     bg: 'var(--color-safe)' },
  error:     { label: '오류 발생',  color: '#fff',                     bg: 'var(--color-danger)' },
};

export function Header({ status, isMockMode, onSettingsClick }: HeaderProps) {
  const cfg = statusConfig[status];

  return (
    <header className="app-header">
      {/* 로고 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span style={{ fontSize: '1.4rem' }}>🛡️</span>
        <div>
          <h1 style={{ color: 'var(--color-accent)', fontSize: 'var(--font-size-xl)', margin: 0, fontWeight: 700, letterSpacing: '-0.02em' }}>
            QuakeGuard
          </h1>
          <p style={{ margin: 0, fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)', letterSpacing: '0.02em' }}>
            재난안전데이터 기반 지진 대응 AI
          </p>
        </div>
      </div>

      {/* 우측 상태 영역 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Mock 모드 배지 */}
        {isMockMode && (
          <span style={{
            padding: '0.2rem 0.6rem',
            backgroundColor: 'rgba(249, 115, 22, 0.15)',
            border: '1px solid rgba(249, 115, 22, 0.4)',
            borderRadius: '999px',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--color-accent)',
            fontWeight: 600,
          }}>
            DEMO 모드
          </span>
        )}

        {/* 날짜 */}
        <span style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
          {new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' })}
        </span>

        {/* 상태 배지 */}
        <div style={{
          padding: '0.3rem 0.9rem',
          borderRadius: '999px',
          fontSize: 'var(--font-size-sm)',
          fontWeight: 600,
          backgroundColor: cfg.bg,
          color: cfg.color,
          transition: 'all 0.3s ease',
          minWidth: '90px',
          textAlign: 'center',
        }}>
          {cfg.label}
        </div>

        {/* API 설정 버튼 */}
        <button
          onClick={onSettingsClick}
          title="API 키 설정"
          style={{
            background: 'transparent',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            color: 'var(--color-text-muted)',
            cursor: 'pointer',
            padding: '0.35rem 0.6rem',
            fontSize: '1rem',
            transition: 'all 0.2s',
            lineHeight: 1,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.borderColor = 'var(--color-accent)';
            e.currentTarget.style.color = 'var(--color-accent)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--color-text-muted)';
          }}
        >
          설정
        </button>
      </div>
    </header>
  );
}
