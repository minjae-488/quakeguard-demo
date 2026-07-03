import React from 'react';
import type { AiResponse } from '../types';

interface AiResultProps {
  response: AiResponse;
}

// ── 로딩 스켈레톤 ──────────────────────────────────────
function SkeletonLoader() {
  return (
    <div className="skeleton-container" aria-label="AI 분석 중..." role="status">
      <div className="skeleton-header">
        <div className="skeleton-icon" />
        <div className="skeleton-line wide" />
      </div>
      {[90, 70, 85, 60, 95, 75].map((w, i) => (
        <div key={i} className="skeleton-line" style={{ width: `${w}%`, animationDelay: `${i * 0.1}s` }} />
      ))}
      <div style={{ height: '1rem' }} />
      {[80, 65, 90, 55].map((w, i) => (
        <div key={i + 10} className="skeleton-line" style={{ width: `${w}%`, animationDelay: `${(i + 6) * 0.1}s` }} />
      ))}
      <p className="skeleton-hint">재난안전데이터를 기반으로 AI가 최적의 조치사항을 분석하고 있습니다...</p>
    </div>
  );
}

// ── 마크다운 파서 ──────────────────────────────────────
function parseBold(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
}

function MarkdownLine({ line, index }: { line: string; index: number }) {
  // ### 제목
  if (line.startsWith('### ')) {
    return (
      <h3
        key={index}
        dangerouslySetInnerHTML={{ __html: parseBold(line.slice(4)) }}
        style={{ color: 'var(--color-accent)', marginTop: '1.5rem', marginBottom: '0.75rem', fontSize: 'var(--font-size-lg)', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.4rem' }}
      />
    );
  }
  // ## 제목
  if (line.startsWith('## ')) {
    return (
      <h3
        key={index}
        dangerouslySetInnerHTML={{ __html: parseBold(line.slice(3)) }}
        style={{ color: 'var(--color-accent)', marginTop: '1.5rem', marginBottom: '0.5rem', fontSize: 'var(--font-size-lg)' }}
      />
    );
  }
  // **1. 위험단계 판단** 같은 강조 섹션 제목 (줄 전체가 볼드로 시작)
  if (line.match(/^\*\*\d+\./)) {
    return (
      <div
        key={index}
        dangerouslySetInnerHTML={{ __html: parseBold(line) }}
        style={{
          marginTop: '1.25rem',
          marginBottom: '0.5rem',
          fontWeight: 700,
          fontSize: 'var(--font-size-base)',
          color: 'var(--color-text-primary)',
          padding: '0.5rem 0.75rem',
          backgroundColor: 'rgba(249,115,22,0.08)',
          borderLeft: '3px solid var(--color-accent)',
          borderRadius: '0 4px 4px 0',
        }}
      />
    );
  }
  // 들여쓰기 항목 (스페이스 또는 탭 시작)
  if (line.match(/^\s{2,}- /)) {
    return (
      <li
        key={index}
        dangerouslySetInnerHTML={{ __html: parseBold(line.replace(/^\s+- /, '')) }}
        style={{ marginLeft: '2.5rem', marginBottom: '0.2rem', color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}
      />
    );
  }
  // 목록 항목
  if (line.startsWith('- ') || line.startsWith('* ')) {
    return (
      <li
        key={index}
        dangerouslySetInnerHTML={{ __html: parseBold(line.slice(2)) }}
        style={{ marginLeft: '1.5rem', marginBottom: '0.3rem', lineHeight: 1.6 }}
      />
    );
  }
  // 번호 목록
  if (line.match(/^\d+\)\s/) || line.match(/^\d+\.\s/)) {
    return (
      <div
        key={index}
        dangerouslySetInnerHTML={{ __html: parseBold(line) }}
        style={{ marginLeft: '1rem', marginBottom: '0.4rem', lineHeight: 1.6, fontWeight: 500 }}
      />
    );
  }
  // 인용 (blockquote)
  if (line.startsWith('> ')) {
    return (
      <blockquote
        key={index}
        dangerouslySetInnerHTML={{ __html: parseBold(line.slice(2)) }}
        style={{
          borderLeft: '3px solid var(--color-text-muted)',
          paddingLeft: '1rem',
          margin: '0.75rem 0',
          color: 'var(--color-text-muted)',
          fontStyle: 'italic',
          fontSize: 'var(--font-size-sm)'
        }}
      />
    );
  }
  // 빈 줄
  if (line.trim() === '') {
    return <div key={index} style={{ height: '0.5rem' }} />;
  }
  // 일반 텍스트
  return (
    <p
      key={index}
      dangerouslySetInnerHTML={{ __html: parseBold(line) }}
      style={{ marginBottom: '0.25rem', lineHeight: 1.7 }}
    />
  );
}

// ── 메인 컴포넌트 ──────────────────────────────────────
export function AiResult({ response }: AiResultProps) {
  // 대기 상태
  if (response.status === 'idle') {
    return (
      <div className="ai-idle-state">
        <div className="ai-idle-icon">🤖</div>
        <p className="ai-idle-title">AI 분석 대기 중</p>
        <p className="ai-idle-desc">좌측 패널에서 지진 상황을 설정하고<br />「AI 분석 시작」 버튼을 눌러주세요.</p>
      </div>
    );
  }

  // 오류 상태
  if (response.status === 'error') {
    return (
      <div className="ai-error-state">
        <h3 style={{ color: 'var(--color-danger)', marginBottom: '0.5rem' }}>오류가 발생했습니다</h3>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem', fontSize: 'var(--font-size-sm)', lineHeight: 1.6 }}>
          {response.error}
        </p>
        <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', padding: '1rem', textAlign: 'left' }}>
          <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', margin: 0 }}>
            <strong>해결 방법:</strong><br />
            • API 키가 올바른지 확인하세요 (우측 상단 ⚙️)<br />
            • 인터넷 연결 상태를 확인하세요<br />
            • 「DEMO 모드」로 먼저 테스트해보세요
          </p>
        </div>
      </div>
    );
  }

  // 로딩 상태
  if (response.status === 'loading') {
    return <SkeletonLoader />;
  }

  // 스트리밍 / 완료 상태
  const lines = response.content.split('\n');

  return (
    <div className="ai-content-wrapper">
      <div className="ai-content">
        {lines.map((line, i) => (
          <MarkdownLine key={i} line={line} index={i} />
        ))}
        {response.status === 'streaming' && (
          <span className="streaming-cursor" aria-hidden="true" />
        )}
      </div>
      {response.status === 'done' && (
        <p className="ai-footer-note">
          ※ 본 보고서는 공공재난안전데이터를 기반으로 생성된 AI 참고자료입니다. 최종 판단은 담당 공무원이 수행해야 합니다.
        </p>
      )}
    </div>
  );
}
