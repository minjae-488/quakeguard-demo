import React from 'react';
import type { Building } from '../types';

interface BuildingListProps {
  buildings: Building[];   // 이미 필터링된 지역 건물 목록
  sigungu: string;
  isRealData?: boolean;
  selectedBuildingId?: string | null;
  onBuildingSelect?: (id: string | null) => void;
  magnitude?: number;
  damageRadius?: number;
}

export function BuildingList({ 
  buildings, 
  sigungu, 
  isRealData = false,
  selectedBuildingId,
  onBuildingSelect,
  magnitude,
  damageRadius
}: BuildingListProps) {
  const riskOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...buildings].sort((a, b) => riskOrder[a.riskLevel] - riskOrder[b.riskLevel]);

  return (
    <div style={{
      backgroundColor: 'var(--color-bg-secondary)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden',
    }}>
      {/* 헤더 */}
      <div style={{
        padding: '0.875rem 1rem',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.5rem',
      }}>
        <h3 style={{ fontSize: 'var(--font-size-sm)', margin: 0, color: 'var(--color-text-primary)', fontWeight: 600 }}>
          내진 취약 건축물
          <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '0.35rem' }}>
            ({sigungu})
          </span>
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
          <span style={{
            padding: '0.15rem 0.5rem',
            borderRadius: '999px',
            fontSize: '0.65rem',
            fontWeight: 700,
            backgroundColor: 'var(--color-bg-elevated)',
            color: 'var(--color-text-muted)',
          }}>
            {buildings.length}건
          </span>
        </div>
      </div>

      {/* 목록 */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>

        
        {!sigungu ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)', gap: '0.5rem' }}>
             <span>좌측 패널에서 발생 지역을 설정하고</span>
             <strong>[AI 분석 시작]</strong>
             <span>버튼을 눌러주세요.</span>
          </div>
        ) : sorted.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: '1.5rem', fontSize: 'var(--font-size-sm)' }}>
            취약 건축물 데이터가 없습니다.
          </p>
        ) : (
          sorted.map(b => {
            const isSelected = selectedBuildingId === b.id;
            return (
            <div 
              key={b.id} 
              onClick={() => onBuildingSelect?.(b.id)}
              style={{
                backgroundColor: isSelected ? 'var(--color-bg-secondary)' : 'var(--color-bg-elevated)',
                cursor: 'pointer',
                padding: '0.7rem 0.875rem',
                borderRadius: '6px',
                border: `1px solid ${isSelected ? 'var(--color-accent)' : b.riskLevel === 'high' ? 'rgba(239,68,68,0.4)' : b.riskLevel === 'medium' ? 'rgba(245,158,11,0.3)' : 'var(--color-border)'}`,
                boxShadow: isSelected ? '0 0 0 1px var(--color-accent)' : 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                if (!isSelected) e.currentTarget.style.borderColor = 'var(--color-text-muted)';
              }}
              onMouseLeave={(e) => {
                if (!isSelected) e.currentTarget.style.borderColor = b.riskLevel === 'high' ? 'rgba(239,68,68,0.4)' : b.riskLevel === 'medium' ? 'rgba(245,158,11,0.3)' : 'var(--color-border)';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.3rem', gap: '0.5rem' }}>
                <h4 style={{ margin: 0, fontSize: 'var(--font-size-xs)', fontWeight: 600, lineHeight: 1.4, flex: 1 }}>
                  {b.name}
                </h4>
                <span style={{
                  backgroundColor: b.riskLevel === 'high' ? 'var(--color-danger)' : b.riskLevel === 'medium' ? 'var(--color-warning)' : '#3b82f6',
                  color: 'white',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '3px',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {b.riskLevel === 'high' ? '위험' : b.riskLevel === 'medium' ? '주의' : '관찰'}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem', color: 'var(--color-text-muted)' }}>
                <span>{b.builtYear}년 준공</span>
                <span>
                  {b.purpose}
                </span>
                <span style={{ color: b.seismicDesign ? 'var(--color-safe)' : 'var(--color-danger)' }}>
                  내진 {b.seismicDesign ? '✓' : '✗'}
                </span>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
}
