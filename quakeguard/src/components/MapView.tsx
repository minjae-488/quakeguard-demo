import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polygon, Polyline, useMap, LayersControl } from 'react-leaflet';
import L from 'leaflet';
import type { Building, Shelter, EarthquakeHistory, CCTV, DangerZone } from '../types';

// 기본 마커 아이콘 설정 (Leaflet 기본 아이콘 경로 문제 해결)
delete (L.Icon.Default.prototype as any)._getIconUrl;

// 진앙지 커스텀 마커 (타겟/과녁 모양 + 펄스 효과)
const epicenterIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background-color: rgba(239, 68, 68, 0.2); border-radius: 50%; border: 2px solid var(--color-danger); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); animation: pulse-red 2s infinite;"><div style="width: 10px; height: 10px; background-color: var(--color-danger); border-radius: 50%;"></div></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14]
});

// 취약 건축물 마커 (위험도에 따른 색상 및 용도별 이모지)
const createBuildingIcon = (riskLevel: string, isSelected: boolean, purpose: string) => {
  const color = riskLevel === 'high' ? 'var(--color-danger)' : riskLevel === 'medium' ? 'var(--color-warning)' : '#3b82f6';
  const size = isSelected ? 24 : 18;
  const border = isSelected ? '3px solid var(--color-accent)' : '2px solid white';
  const zIndex = isSelected ? '1000' : '1';

  const p = purpose || '';
  let emoji = '🏢';
  if (p.includes('공공청사')) emoji = '🏛️';
  else if (p.includes('교육') || p.includes('학교')) emoji = '🏫';
  else if (p.includes('의료') || p.includes('병원')) emoji = '🏥';
  else if (p.includes('상업')) emoji = '🏪';
  else if (p.includes('숙박')) emoji = '🏨';
  else if (p.includes('주택') || p.includes('아파트')) emoji = '🏠';

  return new L.DivIcon({
    className: 'custom-div-icon',
    html: `<div style="width: ${size}px; height: ${size}px; background-color: ${color}; border-radius: 50%; border: ${border}; box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative; z-index: ${zIndex}; display: flex; align-items: center; justify-content: center; font-size: ${size - 8}px;">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2]
  });
};

// 지진 옥외 대피소 마커
const shelterIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="width: 18px; height: 18px; background-color: var(--color-safe); border-radius: 4px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 11px; font-weight: bold; line-height: 1;">S</span></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9]
});

// 과거 지진 마커
const historyIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="width: 10px; height: 10px; background-color: #6b7280; border-radius: 50%; border: 1px solid rgba(255,255,255,0.7);"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

// CCTV 마커
const cctvIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="width: 16px; height: 16px; background-color: #3b82f6; border-radius: 4px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center;"><span style="color: white; font-size: 10px;">📷</span></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

// 붕괴위험지구 마커
const dangerZoneIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: `<div style="width: 20px; height: 20px; background-color: #eab308; border-radius: 4px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; transform: rotate(45deg);"><span style="color: black; font-size: 10px; transform: rotate(-45deg); font-weight: bold;">!</span></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

interface MapViewProps {
  center: { lat: number; lng: number };
  zoom?: number;
  buildings: Building[];
  shelters?: Shelter[];
  history?: EarthquakeHistory[];
  cctvs?: CCTV[];
  dangerZones?: DangerZone[];
  magnitude?: number;
  showEpicenter?: boolean;
}

// 맵 뷰 자동 이동 컴포넌트
function MapUpdater({ center, zoom }: { center: { lat: number; lng: number }, zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([center.lat, center.lng], zoom, { animate: true });
  }, [center.lat, center.lng, zoom, map]);
  return null;
}

// 맵 뷰 자동 이동 및 팝업 열기 (선택된 건물 연동)
function SelectedBuildingFlyTo({ selectedBuildingId, buildings, markerRefs }: { selectedBuildingId: string | null, buildings: Building[], markerRefs: React.MutableRefObject<{ [key: string]: L.Marker | null }> }) {
  const map = useMap();
  useEffect(() => {
    if (selectedBuildingId) {
      const b = buildings.find(b => b.id === selectedBuildingId);
      if (b && b.lat && b.lng) {
        map.flyTo([b.lat, b.lng], 16, { animate: true, duration: 1.0 });
        const marker = markerRefs.current[selectedBuildingId];
        if (marker) {
          setTimeout(() => marker.openPopup(), 1000);
        }
      }
    }
  }, [selectedBuildingId, buildings, map, markerRefs]);
  return null;
}

export function MapView({ 
  center, 
  zoom = 13,
  buildings, 
  shelters = [], 
  history = [], 
  cctvs = [], 
  dangerZones = [], 
  magnitude = 5.0,
  showEpicenter = true,
  selectedBuildingId = null,
}: MapViewProps & { selectedBuildingId?: string | null }) {
  // 규모에 따른 피해 반경 시뮬레이션 (단순화: 규모 5.0 -> 반경 5km)
  const radius1 = Math.max(1, (magnitude - 4) * 2) * 1000;
  const radius2 = Math.max(1, (magnitude - 4) * 4) * 1000;
  
  const markerRefs = React.useRef<{ [key: string]: L.Marker | null }>({});

  return (
    <div style={{ flex: 1, width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
      <MapContainer center={[center.lat, center.lng]} zoom={zoom} style={{ height: '100%', width: '100%' }}>
        <LayersControl position="topright">
          <LayersControl.BaseLayer checked name="야간 관제 모드 (다크 모드)">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="일반 도로망 지도">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="실시간 위성 지도 (지형/산지 파악)">
            <TileLayer
              attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            />
          </LayersControl.BaseLayer>
        </LayersControl>
        
        <MapUpdater center={center} zoom={zoom} />

        {/* 진앙지 표시 */}
        {showEpicenter && (
          <>
            <Marker position={[center.lat, center.lng]} icon={epicenterIcon}>
              <Popup>
                <strong>추정 진앙지</strong><br/>
                규모: M{magnitude}
              </Popup>
            </Marker>
            <Circle center={[center.lat, center.lng]} radius={radius1} pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2, weight: 1 }} />
            <Circle center={[center.lat, center.lng]} radius={radius2} pathOptions={{ color: 'orange', fillColor: 'orange', fillOpacity: 0.1, weight: 1 }} />
          </>
        )}

        {/* 취약 건축물 마커 */}
        {buildings.map(b => {
          const isSelected = selectedBuildingId === b.id;
          return b.lat && b.lng ? (
            <Marker 
              key={b.id} 
              position={[b.lat, b.lng]} 
              icon={createBuildingIcon(b.riskLevel, isSelected, b.purpose)}
              ref={(r) => { markerRefs.current[b.id] = r; }}
            >
              <Popup>
                <div style={{ color: '#000' }}>
                  <strong style={{ color: b.riskLevel === 'high' ? 'red' : 'orange' }}>{b.name}</strong><br/>
                  용도: {b.purpose}

                  <br/>
                  준공연도: {b.builtYear}년<br/>
                  내진설계: {b.seismicDesign ? '적용' : '미적용'}
                </div>
              </Popup>
            </Marker>
          ) : null;
        })}

        {/* 지진 옥외 대피소 마커 */}
        {shelters.map(s => (
          s.lat && s.lng ? (
            <Marker key={s.id} position={[s.lat, s.lng]} icon={shelterIcon}>
              <Popup>
                <div style={{ color: '#000' }}>
                  <strong style={{ color: 'green' }}>{s.name}</strong><br/>
                  수용인원: {s.capacity}명<br/>
                  주소: {s.address}
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}

        {/* 과거 지진 이력 마커 */}
        {history.map(h => (
          h.lat && h.lng ? (
            <Marker key={h.id} position={[h.lat, h.lng]} icon={historyIcon}>
              <Popup>
                <div style={{ color: '#000' }}>
                  <strong style={{ color: 'gray' }}>과거 지진 ({h.date.split(' ')[0]})</strong><br/>
                  규모: M{h.magnitude}<br/>
                  위치: {h.location}
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}

        {/* CCTV 마커 */}
        {cctvs.map(c => (
          c.lat && c.lng ? (
            <Marker key={c.id} position={[c.lat, c.lng]} icon={cctvIcon}>
              <Popup>
                <div style={{ color: '#000' }}>
                  <strong style={{ color: '#3b82f6' }}>{c.name}</strong><br/>
                  용도: {c.type}
                </div>
              </Popup>
            </Marker>
          ) : null
        ))}

        {/* 붕괴위험지구 마커 및 통제 구역(형태별 시각화) */}
        {dangerZones.map(d => (
          d.lat && d.lng ? (
            <React.Fragment key={d.id}>
              {/* 통제 구역 표시 (선형 또는 면형) */}
              {d.path && d.path.length > 0 ? (
                d.shapeType === 'polyline' ? (
                  <Polyline 
                    positions={d.path} 
                    pathOptions={{ color: '#eab308', weight: 8, dashArray: '10, 10' }} 
                  />
                ) : (
                  <Polygon 
                    positions={d.path} 
                    pathOptions={{ color: '#eab308', fillColor: '#eab308', fillOpacity: 0.3, weight: 2 }} 
                  />
                )
              ) : (
                /* 폴리곤 데이터가 없을 경우를 대비한 기본 폴백(원형) */
                <Circle 
                  center={[d.lat, d.lng]} 
                  radius={250} 
                  pathOptions={{ color: '#eab308', fillColor: '#eab308', fillOpacity: 0.25, weight: 2, dashArray: '5, 5' }} 
                />
              )}
              
              <Marker position={[d.lat, d.lng]} icon={dangerZoneIcon}>
                <Popup>
                  <div style={{ color: '#000' }}>
                    <strong style={{ color: '#eab308' }}>{d.name}</strong><br/>
                    유형: {d.type}<br/>
                    위험도: {d.riskLevel === 'high' ? '높음' : '보통'}<br/>
                    <strong style={{ color: '#ef4444', fontSize: '0.8rem', marginTop: '4px', display: 'block' }}>
                      ⚠️ 해당 {d.shapeType === 'polyline' ? '도로 구간' : '구역'} 접근 통제 필요
                    </strong>
                  </div>
                </Popup>
              </Marker>
            </React.Fragment>
          ) : null
        ))}
        {/* 선택된 건물 추적 컴포넌트 */}
        <SelectedBuildingFlyTo selectedBuildingId={selectedBuildingId} buildings={buildings} markerRefs={markerRefs} />
      </MapContainer>
    </div>
  );
}
