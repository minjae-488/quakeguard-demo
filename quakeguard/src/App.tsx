import React, { useState, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { InputPanel } from './components/InputPanel';
import { BuildingList } from './components/BuildingList';
import { MapView } from './components/MapView';
import { AiResult } from './components/AiResult';
import { useLLM } from './hooks/useLLM';
import { buildSystemPrompt, buildUserPrompt } from './utils/promptBuilder';
import { MockLLMProvider } from './utils/MockLLMProvider';
import { ClaudeProvider } from './utils/ClaudeProvider';
import {
  generateMockBuildings,
  generateMockShelters,
  generateMockCCTVs,
  generateMockDangerZones,
  generateMockContacts,
  generateMockStats,
} from './utils/mockDataGenerator';
import { getDistance } from './utils/geo';
import buildingsData from './data/buildings.json';
import sheltersJson from './data/shelters.json';
import historyJson from './data/history.json';
import cctvJson from './data/cctv.json';
import dangerZonesJson from './data/dangerZones.json';
import contactsJson from './data/contacts.json';
import statsData from './data/stats.json';
import type { EarthquakeInput, Building, Shelter, EarthquakeHistory, CCTV, DangerZone, Contact, Region } from './types';

// ── 정적 데이터 (실 데이터: 경주시·포항시) ──────────
const allBuildings:   Building[]         = buildingsData.data as Building[];
const allShelters:    Shelter[]          = sheltersJson.data as Shelter[];
const allHistory:     EarthquakeHistory[]= historyJson.data as EarthquakeHistory[];
const allCCTVs:       CCTV[]             = cctvJson.data as CCTV[];
const allDangerZones: DangerZone[]       = dangerZonesJson.data as DangerZone[];
const allContacts:    Contact[]          = contactsJson.data as Contact[];

const ENV_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

// ── 지역별 데이터 조회 (실 데이터 없으면 가상 데이터) ─
function getRegionData(region: Region) {
  const { sigungu, sido, lat, lng } = region;

  const realBuildings   = allBuildings.filter(b => b.sigungu === sigungu);
  const realShelters    = allShelters.filter(s => s.sigungu === sigungu);
  const realCCTVs       = allCCTVs.filter(c => c.sigungu === sigungu);
  const realDangerZones = allDangerZones.filter(d => d.sigungu === sigungu);
  const realContacts    = allContacts.filter(c => c.sigungu === sigungu || c.sigungu === '공통');
  const realStats       = (statsData as Record<string, { total: number; vulnerable: number }>)[sigungu] ?? null;

  return {
    buildings:   realBuildings.length   > 0 ? realBuildings   : generateMockBuildings(sigungu, sido, lat, lng),
    shelters:    realShelters.length    > 0 ? realShelters    : generateMockShelters(sigungu, sido, lat, lng),
    cctvs:       realCCTVs.length       > 0 ? realCCTVs       : generateMockCCTVs(sigungu, sido, lat, lng),
    dangerZones: realDangerZones.length > 0 ? realDangerZones : generateMockDangerZones(sigungu, sido, lat, lng),
    contacts:    realContacts.length    > 0 ? realContacts    : generateMockContacts(sigungu),
    stats:       realStats ?? generateMockStats(sigungu),
    isRealData:  realBuildings.length   > 0,
  };
}

// 초기 상태 없음
const initialInput: EarthquakeInput | null = null;

// ── API 키 모달 ────────────────────────────────────────
function ApiKeyModal({ onSave }: { onSave: (key: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      backgroundColor: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        backgroundColor: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: '12px',
        padding: '2rem',
        width: '420px',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: 'var(--color-accent)', fontSize: 'var(--font-size-xl)' }}>
            API 키 설정
          </h2>
        </div>
        <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1rem', fontSize: 'var(--font-size-sm)', lineHeight: 1.7 }}>
          실제 Claude AI 분석을 위해 Anthropic API 키가 필요합니다.<br />
          <a href="https://console.anthropic.com" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--color-accent)' }}>console.anthropic.com</a>에서 발급받을 수 있습니다.
        </p>
        <input
          type="password"
          value={value}
          onChange={e => setValue(e.target.value)}
          placeholder="sk-ant-api03-..."
          style={{
            width: '100%', padding: '0.75rem 1rem',
            backgroundColor: 'var(--color-bg-primary)',
            color: 'var(--color-text-primary)',
            border: '1px solid var(--color-border-focus)',
            borderRadius: '6px',
            fontSize: 'var(--font-size-base)',
            marginBottom: '1rem',
            outline: 'none',
            boxSizing: 'border-box',
          }}
          onKeyDown={e => e.key === 'Enter' && value.trim() && onSave(value.trim())}
          autoFocus
        />
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            onClick={() => onSave('MOCK')}
            style={{
              flex: 1, padding: '0.75rem',
              backgroundColor: 'transparent',
              color: 'var(--color-text-secondary)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 500,
              transition: 'all 0.2s',
              fontFamily: 'var(--font-family)',
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--color-bg-elevated)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          >
            데모 모드 (Mock)
          </button>
          <button
            onClick={() => value.trim() && onSave(value.trim())}
            disabled={!value.trim()}
            className="btn-primary"
            style={{
              flex: 2, padding: '0.75rem',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 600,
              opacity: value.trim() ? 1 : 0.5,
              cursor: value.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            실제 AI 연동
          </button>
        </div>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--font-size-xs)', marginTop: '1rem', textAlign: 'center' }}>
          키는 브라우저 메모리에만 저장되며 서버로 전송되지 않습니다.
        </p>
      </div>
    </div>
  );
}

// ── 메인 앱 ───────────────────────────────────────────
function App() {
  const [input, setInput]           = useState<EarthquakeInput | null>(initialInput);
  const [apiKey, setApiKey]         = useState<string | null>('MOCK');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [isMockMode, setIsMockMode] = useState(true);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  const provider = useMemo(() => {
    if (isMockMode || !apiKey || apiKey === 'MOCK') return new MockLLMProvider();
    return new ClaudeProvider(apiKey);
  }, [apiKey, isMockMode]);

  const { response, analyze, retry } = useLLM(provider);

  // 현재 선택 지역의 통합 데이터 (실 데이터 + 가상 데이터 자동 병합)
  const regionData = useMemo(() => input ? getRegionData(input.region) : null, [input]);

  const handleSubmit = useCallback(async (newInput: EarthquakeInput) => {
    setInput(newInput);
    setSelectedBuildingId(null); // 지역 변경 시 선택 초기화
    
    // newInput 기준으로 데이터 조회 (useMemo는 아직 이전 state 기준)
    const data = getRegionData(newInput.region);

    // AI 프롬프트용 데이터도 지도와 동일하게 피해 반경 내로 필터링
    const magnitude = newInput.magnitude;
    const damageRadius = Math.max(1, (magnitude - 4) * 4) * 1000;
    const epicLat = newInput.region.lat;
    const epicLng = newInput.region.lng;

    const filteredBuildings = data.buildings.filter(b => {
      if (!b.lat || !b.lng) return true;
      return getDistance(epicLat, epicLng, b.lat, b.lng) <= damageRadius;
    });

    const filteredDangerZones = data.dangerZones.filter(d => {
      if (!d.lat || !d.lng) return true;
      return getDistance(epicLat, epicLng, d.lat, d.lng) <= damageRadius;
    });

    const systemPrompt = buildSystemPrompt();
    const userPrompt   = buildUserPrompt(
      newInput,
      filteredBuildings, data.shelters, data.cctvs,
      filteredDangerZones, data.contacts, data.stats,
    );
    await analyze(systemPrompt, userPrompt);
  }, [analyze]);

  const handleApiKeySave = (key: string) => {
    if (key === 'MOCK') { setIsMockMode(true); setApiKey('MOCK'); }
    else                { setIsMockMode(false); setApiKey(key); }
    setShowKeyModal(false);
  };

  // --- 피해 반경 기반 동적 필터링 로직 추가 ---
  const magnitude = input?.magnitude ?? 0;
  // MapView.tsx와 동일한 반경 산출 공식: 규모 5.0 -> 반경 4km, 규모 6.0 -> 8km
  const damageRadius = Math.max(1, (magnitude - 4) * 4) * 1000;
  
  let displayBuildings = regionData?.buildings ?? [];
  let displayDangerZones = regionData?.dangerZones ?? [];

  if (input?.region && magnitude > 0) {
    const epicLat = input.region.lat;
    const epicLng = input.region.lng;

    displayBuildings = displayBuildings.filter(b => {
      if (!b.lat || !b.lng) return true; // 좌표가 없는 데이터는 일단 유지 (안전망)
      return getDistance(epicLat, epicLng, b.lat, b.lng) <= damageRadius;
    });

    displayDangerZones = displayDangerZones.filter(d => {
      if (!d.lat || !d.lng) return true;
      return getDistance(epicLat, epicLng, d.lat, d.lng) <= damageRadius;
    });
  }

  return (
    <div className="app-layout">
      {showKeyModal && <ApiKeyModal onSave={handleApiKeySave} />}

      <Header
        status={response.status}
        isMockMode={isMockMode || apiKey === 'MOCK'}
        onSettingsClick={() => setShowKeyModal(true)}
      />

      <aside className="app-sidebar">
        <InputPanel
          onSubmit={handleSubmit}
          isLoading={response.status === 'loading' || response.status === 'streaming'}
          isRealData={regionData?.isRealData ?? false}
        />
      </aside>

      <main className="app-main">
        {/* 상단: 지도 + 건물 목록 */}
        <div className="main-top-grid">
          <div className="map-section">
            <h2 className="section-title">재난 상황 지도</h2>
            <MapView
              center={input ? input.region : { lat: 36.5, lng: 127.5 }}
              zoom={input ? 13 : 7}
              magnitude={input?.magnitude ?? 0}
              showEpicenter={!!input}
              buildings={displayBuildings}
              shelters={regionData?.shelters ?? []}
              history={input ? allHistory : []}
              cctvs={regionData?.cctvs ?? []}
              dangerZones={displayDangerZones}
              selectedBuildingId={selectedBuildingId}
            />
          </div>

          <div className="building-section">
            <BuildingList
              buildings={displayBuildings}
              sigungu={input?.region.sigungu ?? ''}
              isRealData={regionData?.isRealData ?? false}
              magnitude={input?.magnitude} // 추가: 안내 문구용
              damageRadius={damageRadius} // 추가: 안내 문구용
              selectedBuildingId={selectedBuildingId}
              onBuildingSelect={setSelectedBuildingId}
            />
          </div>
        </div>

        {/* 하단: AI 결과 패널 */}
        <div className="ai-panel-wrapper">
          <div className="ai-panel">
            <div className="print-hide ai-panel-header">
              <h2 className="ai-panel-title">
                AI 즉시 조치사항 및 상황보고서
              </h2>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {response.status === 'error' && (
                  <button onClick={retry} className="btn-outline"
                    style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                    재시도
                  </button>
                )}
                {(response.status === 'done' || response.status === 'streaming') && (
                  <>
                    <button
                      id="copy-btn"
                      onClick={() => {
                        navigator.clipboard.writeText(response.content);
                        const btn = document.getElementById('copy-btn');
                        if (btn) { btn.textContent = '복사 완료'; setTimeout(() => { btn.textContent = '텍스트 복사'; }, 2000); }
                      }}
                      className="btn-outline"
                      style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}
                    >
                      텍스트 복사
                    </button>
                    <button onClick={() => window.print()} className="btn-primary"
                      style={{ padding: '0.4rem 1rem', fontSize: '0.85rem' }}>
                      보고서 인쇄
                    </button>
                  </>
                )}
              </div>
            </div>
            <AiResult response={response} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
