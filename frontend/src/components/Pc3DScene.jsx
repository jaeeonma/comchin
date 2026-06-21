import * as THREE from 'three'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  OrbitControls,
  ContactShadows,
  Environment,
  Lightformer,
  RoundedBox,
} from '@react-three/drei'
import { EffectComposer, Bloom, SSAO } from '@react-three/postprocessing'
import { useMemo, useRef, useState, useEffect } from 'react'

// ===== 미들타워 치수(절반값) — 실제 ATX 비율(약 210×450×450mm) =====
const HX = 0.46 // 폭/2
const HY = 1.06 // 높이/2
const HZ = 0.92 // 깊이/2
const T = 0.04 // 패널 두께

const DARK = { color: '#0a0c10', metalness: 0.6, roughness: 0.5 }
const ALU = { color: '#aab2c0', metalness: 1, roughness: 0.25 }
const PCB = { color: '#0b0f0c', metalness: 0.3, roughness: 0.7 }

// ── 절차적 텍스처 ──────────────────────────────────────────
// 브러시드 메탈: 미세한 세로 결
function makeBrushed(base = '#15181e') {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const ctx = c.getContext('2d')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, 256, 256)
  for (let i = 0; i < 2400; i++) {
    const x = Math.random() * 256
    ctx.strokeStyle = `rgba(255,255,255,${Math.random() * 0.04})`
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 256)
    ctx.stroke()
  }
  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * 256
    ctx.strokeStyle = `rgba(0,0,0,${Math.random() * 0.07})`
    ctx.beginPath()
    ctx.moveTo(x, 0)
    ctx.lineTo(x, 256)
    ctx.stroke()
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(2, 2)
  t.anisotropy = 8
  return t
}
// 카본 파이버 위브
function makeCarbon() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')
  const s = 8
  for (let y = 0; y < 128; y += s)
    for (let x = 0; x < 128; x += s) {
      const odd = ((x / s + y / s) % 2) === 0
      const g = ctx.createLinearGradient(x, y, x + s, y + s)
      g.addColorStop(0, odd ? '#1c2026' : '#0d0f13')
      g.addColorStop(1, odd ? '#0d0f13' : '#1c2026')
      ctx.fillStyle = g
      ctx.fillRect(x, y, s, s)
    }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(3, 3)
  return t
}

// ── 선택한 케이스 색 추론 ───────────────────────────────────
const DEFAULT_CASE = '#15181e'
// hex 를 비율 f 로 어둡게/밝게
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16)
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f))
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f))
  const b = Math.min(255, Math.round((n & 255) * f))
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}
// 케이스 이름/브랜드 키워드 → 대표색 (이미지 추출 실패 시 폴백)
function nameColor(info) {
  const t = `${info?.name ?? ''} ${info?.brand ?? ''}`.toLowerCase()
  if (/화이트|white|스노우|snow|순백|블랑|아이보리|ivory/.test(t)) return '#e6e7ec'
  if (/핑크|pink|로제|rose/.test(t)) return '#e3a3c0'
  if (/레드|red|크림슨/.test(t)) return '#7c2230'
  if (/블루|blue|네이비|navy|시안|cyan/.test(t)) return '#26334d'
  if (/그린|green|민트|mint/.test(t)) return '#234436'
  if (/실버|silver|그레이|gray|grey/.test(t)) return '#9aa0a8'
  return DEFAULT_CASE
}
// 케이스 이미지에서 배경(흰색) 제외 평균색 추출 → 색상 결정.
// 이름 기반 색은 즉시(useMemo), 이미지 추출색은 로드 후(onload 콜백)에만 반영.
function useCaseColor(caseInfo) {
  const fallback = useMemo(() => nameColor(caseInfo), [caseInfo])
  const id = caseInfo?.id
  const [extracted, setExtracted] = useState(null) // { id, color }
  useEffect(() => {
    const url = caseInfo?.imageUrl
    if (!url) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const s = 48
        const cv = document.createElement('canvas')
        cv.width = cv.height = s
        const ctx = cv.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0, s, s)
        const d = ctx.getImageData(0, 0, s, s).data
        let r = 0, g = 0, b = 0, n = 0
        for (let i = 0; i < d.length; i += 4) {
          const R = d[i], G = d[i + 1], B = d[i + 2], A = d[i + 3]
          if (A < 128) continue
          if (R > 236 && G > 236 && B > 236) continue // 흰 배경 제외
          r += R; g += G; b += B; n++
        }
        if (n > 40) {
          const color = '#' + [r, g, b].map((v) => Math.round(v / n).toString(16).padStart(2, '0')).join('')
          setExtracted({ id, color })
        }
      } catch {
        /* CORS 로 픽셀 읽기 불가 → 이름 기반 폴백 유지 */
      }
    }
    img.src = url
    return () => {
      img.onload = null
    }
  }, [caseInfo, id])
  return extracted && extracted.id === id ? extracted.color : fallback
}

// 곡면 날개로 도는 ARGB 쿨링 팬
function Fan({ position, rotation = [0, 0, 0], radius = 0.24, color = '#6366f1', speed = 7 }) {
  const blades = useRef()
  useFrame((_, dt) => {
    if (blades.current) blades.current.rotation.z += dt * speed
  })
  const n = 9
  return (
    <group position={position} rotation={rotation}>
      <RoundedBox args={[radius * 2.15, radius * 2.15, 0.06]} radius={0.035} smoothness={3} castShadow>
        <meshStandardMaterial color="#0a0c10" metalness={0.5} roughness={0.6} />
      </RoundedBox>
      {/* 코너 나사 4개 */}
      {[
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ].map(([sx, sy], i) => (
        <mesh key={i} position={[sx * radius * 0.92, sy * radius * 0.92, 0.032]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.014, 0.014, 0.012, 6]} />
          <meshStandardMaterial color="#3a4150" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 0, 0.02]}>
        <torusGeometry args={[radius, 0.045, 10, 36]} />
        <meshStandardMaterial color="#14171d" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* ARGB 발광 링 */}
      <mesh position={[0, 0, 0.04]}>
        <torusGeometry args={[radius, 0.018, 8, 48]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <group ref={blades} position={[0, 0, 0.005]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.06, 20]} />
          <meshStandardMaterial color="#222732" metalness={0.7} roughness={0.35} />
        </mesh>
        {Array.from({ length: n }).map((_, i) => {
          const a = (i / n) * Math.PI * 2
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * radius * 0.5, Math.sin(a) * radius * 0.5, 0]}
              rotation={[0.4, 0.18, a]}
            >
              <boxGeometry args={[radius * 0.6, radius * 0.5, 0.008]} />
              <meshStandardMaterial color="#1a1e26" metalness={0.4} roughness={0.6} transparent opacity={0.9} />
            </mesh>
          )
        })}
      </group>
    </group>
  )
}

function RamStick({ position }) {
  return (
    <group position={position}>
      <RoundedBox args={[0.32, 0.46, 0.045]} radius={0.012} smoothness={2} castShadow>
        <meshStandardMaterial color="#1c2028" metalness={0.85} roughness={0.28} />
      </RoundedBox>
      <mesh position={[0, 0.25, 0]}>
        <boxGeometry args={[0.3, 0.04, 0.04]} />
        <meshStandardMaterial color="#7c83ff" emissive="#6366f1" emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
    </group>
  )
}

// 강화유리 패널(틴트 + 굴절 + 금속 프레임 + 코너 나사)
function GlassPanel({ position, rotation = [0, 0, 0], w, h, frameMap }) {
  const bar = 0.035
  return (
    <group position={position} rotation={rotation}>
      {/* 맑은 틴트 강화유리 — 조명 영향 없는 unlit 재질이라 어떤 환경에서도 확실히 비친다 */}
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial
          color="#2e3a52"
          transparent
          opacity={0.14}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {[
        [0, h / 2 - bar / 2, w, bar],
        [0, -h / 2 + bar / 2, w, bar],
        [-w / 2 + bar / 2, 0, bar, h],
        [w / 2 - bar / 2, 0, bar, h],
      ].map(([x, y, bw, bh], i) => (
        <mesh key={i} position={[x, y, 0.01]}>
          <boxGeometry args={[bw, bh, T * 0.9]} />
          <meshStandardMaterial color="#ffffff" map={frameMap} metalness={0.6} roughness={0.45} />
        </mesh>
      ))}
      {/* 코너 손나사 */}
      {[
        [w / 2 - bar / 2, h / 2 - bar / 2],
        [-w / 2 + bar / 2, h / 2 - bar / 2],
        [w / 2 - bar / 2, -h / 2 + bar / 2],
        [-w / 2 + bar / 2, -h / 2 + bar / 2],
      ].map(([x, y], i) => (
        <mesh key={i} position={[x, y, 0.03]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.018, 0.018, 0.02, 6]} />
          <meshStandardMaterial color="#454c5c" metalness={0.95} roughness={0.25} />
        </mesh>
      ))}
    </group>
  )
}

// 브레이드 전원 케이블 (곡선 튜브 + 커넥터)
function Cable({ points, color = '#0a0c10' }) {
  const geo = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)))
    return new THREE.TubeGeometry(curve, 48, 0.024, 10, false)
  }, [points])
  return (
    <mesh geometry={geo} castShadow>
      <meshStandardMaterial color={color} metalness={0.2} roughness={0.85} />
    </mesh>
  )
}

function Tower({ caseColor = DEFAULT_CASE }) {
  // 케이스 색을 텍스처 베이스로 → 패널이 그 색으로 칠해진다
  const darkCol = useMemo(() => shade(caseColor, 0.68), [caseColor])
  const brushed = useMemo(() => makeBrushed(caseColor), [caseColor])
  const brushedDark = useMemo(() => makeBrushed(darkCol), [darkCol])
  const carbon = useMemo(() => makeCarbon(), [])
  // map 이 색을 담당하므로 머티리얼 color 는 흰색(곱셈 중립)
  const CASE = { color: '#ffffff', map: brushed, metalness: 0.55, roughness: 0.45 }

  return (
    <group>
      {/* ===== 섀시 ===== */}
      <RoundedBox args={[HX * 2, HY * 2, T]} radius={0.02} smoothness={3} position={[0, 0, -HZ]} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" map={brushedDark} metalness={0.6} roughness={0.45} />
      </RoundedBox>
      <RoundedBox args={[T, HY * 2, HZ * 2]} radius={0.02} smoothness={3} position={[-HX, 0, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...CASE} />
      </RoundedBox>
      <RoundedBox args={[HX * 2, T, HZ * 2]} radius={0.02} smoothness={3} position={[0, HY, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" map={brushedDark} metalness={0.55} roughness={0.5} />
      </RoundedBox>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[0, HY + T / 2 + 0.001, -HZ + 0.3 + i * 0.22]}>
          <boxGeometry args={[HX * 1.5, 0.004, 0.12]} />
          <meshStandardMaterial color="#05070a" />
        </mesh>
      ))}
      <RoundedBox args={[HX * 2, T, HZ * 2]} radius={0.02} smoothness={3} position={[0, -HY, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...DARK} />
      </RoundedBox>
      {[
        [-HX + 0.1, -HZ + 0.12],
        [HX - 0.1, -HZ + 0.12],
        [-HX + 0.1, HZ - 0.12],
        [HX - 0.1, HZ - 0.12],
      ].map(([x, z], i) => (
        <mesh key={i} position={[x, -HY - 0.045, z]}>
          <cylinderGeometry args={[0.045, 0.055, 0.08, 18]} />
          <meshStandardMaterial color="#050608" metalness={0.2} roughness={0.85} />
        </mesh>
      ))}

      {/* 상단 전원 버튼 + I/O */}
      <group position={[0, HY + T / 2 + 0.01, HZ - 0.18]}>
        <mesh position={[-0.18, 0, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.02, 20]} />
          <meshStandardMaterial color="#7c83ff" emissive="#6366f1" emissiveIntensity={3} toneMapped={false} />
        </mesh>
        {[0, 1].map((i) => (
          <mesh key={i} position={[0.02 + i * 0.11, 0, 0]}>
            <boxGeometry args={[0.07, 0.012, 0.03]} />
            <meshStandardMaterial color="#05070a" metalness={0.4} roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* 뒷면 I/O + PCIe 브래킷 + 배기팬 */}
      <group position={[0, 0, -HZ + T / 2 + 0.01]}>
        <mesh position={[0, 0.62, 0]}>
          <boxGeometry args={[HX * 1.3, 0.34, 0.02]} />
          <meshStandardMaterial color="#1a1d24" metalness={0.7} roughness={0.4} />
        </mesh>
        {Array.from({ length: 7 }).map((_, i) => (
          <mesh key={i} position={[0.05, -0.2 - i * 0.085, 0]}>
            <boxGeometry args={[HX * 1.1, 0.05, 0.015]} />
            <meshStandardMaterial color="#06080b" />
          </mesh>
        ))}
        <Fan position={[-0.02, 0.62, 0.05]} radius={0.2} color="#a855f7" speed={5.5} />
      </group>

      {/* ===== 메인보드 ===== */}
      <RoundedBox args={[0.03, HY * 1.6, HZ * 1.55]} radius={0.01} smoothness={2} position={[-HX + 0.07, 0.04, 0]} castShadow>
        <meshStandardMaterial {...PCB} />
      </RoundedBox>
      {[-0.28, 0.42].map((z, i) => (
        <mesh key={i} position={[-HX + 0.12, 0.74, z]}>
          <boxGeometry args={[0.05, 0.26, 0.16]} />
          <meshStandardMaterial color="#2b303a" metalness={0.9} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[-HX + 0.12, -0.5, 0.2]}>
        <boxGeometry args={[0.05, 0.3, 0.3]} />
        <meshStandardMaterial color="#181c24" metalness={0.8} roughness={0.35} />
      </mesh>
      <mesh position={[-HX + 0.15, -0.5, 0.2]}>
        <boxGeometry args={[0.01, 0.12, 0.12]} />
        <meshStandardMaterial color="#7c83ff" emissive="#6366f1" emissiveIntensity={2.2} toneMapped={false} />
      </mesh>
      <mesh position={[-HX + 0.12, -0.05, 0.1]}>
        <boxGeometry args={[0.04, 0.12, 0.5]} />
        <meshStandardMaterial color="#22262f" metalness={0.85} roughness={0.3} />
      </mesh>
      {/* PCIe 슬롯 3개 */}
      {[-0.2, -0.32, -0.44].map((y, i) => (
        <mesh key={i} position={[-HX + 0.11, y, 0.15]}>
          <boxGeometry args={[0.03, 0.04, 0.5]} />
          <meshStandardMaterial color="#3a2150" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
      {/* 케이블 그로멧 */}
      {[0.45, 0.0, -0.45].map((y, i) => (
        <mesh key={i} position={[-HX + 0.04, y, 0.55]}>
          <boxGeometry args={[0.02, 0.18, 0.06]} />
          <meshStandardMaterial color="#050608" roughness={0.9} />
        </mesh>
      ))}

      {/* RAM 4개 */}
      {[-0.04, 0.05, 0.14, 0.23].map((z, i) => (
        <RamStick key={i} position={[-HX + 0.2, 0.5, z + 0.16]} />
      ))}

      {/* ===== AIO 수냉 ===== */}
      <group position={[-HX + 0.2, 0.5, -0.18]}>
        <RoundedBox args={[0.18, 0.3, 0.3]} radius={0.02} smoothness={2} castShadow>
          <meshStandardMaterial color="#0d1016" metalness={0.85} roughness={0.3} />
        </RoundedBox>
        <mesh position={[0.1, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.22, 0.22]} />
          <meshStandardMaterial color="#7c83ff" emissive="#6366f1" emissiveIntensity={2.6} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {[-0.05, 0.05].map((dz, i) => (
        <mesh key={i} position={[-HX + 0.22, 0.74, -0.18 + dz]} rotation={[0, 0, -0.12]}>
          <cylinderGeometry args={[0.022, 0.022, 0.42, 12]} />
          <meshStandardMaterial color="#0a0c10" metalness={0.2} roughness={0.85} />
        </mesh>
      ))}
      <group position={[-0.02, HY - 0.16, -0.05]}>
        <RoundedBox args={[HX * 1.5, 0.1, HZ * 1.0]} radius={0.015} smoothness={2} castShadow>
          <meshStandardMaterial {...ALU} />
        </RoundedBox>
        <Fan position={[0, -0.1, -0.26]} rotation={[Math.PI / 2, 0, 0]} radius={0.21} color="#6366f1" speed={6} />
        <Fan position={[0, -0.1, 0.26]} rotation={[Math.PI / 2, 0, 0]} radius={0.21} color="#a855f7" speed={6.4} />
      </group>

      {/* ===== 그래픽카드 (카본 슈라우드) ===== */}
      <group position={[0.02, -0.08, 0.05]} rotation={[0, 0, -0.02]}>
        <RoundedBox args={[HX * 1.2, 0.26, HZ * 1.45]} radius={0.02} smoothness={2} castShadow>
          <meshStandardMaterial color="#13161c" map={carbon} metalness={0.6} roughness={0.4} />
        </RoundedBox>
        <mesh position={[0, 0.14, 0]}>
          <boxGeometry args={[HX * 1.0, 0.018, HZ * 1.3]} />
          <meshStandardMaterial color="#9aa0ff" emissive="#6366f1" emissiveIntensity={2} toneMapped={false} />
        </mesh>
        {[-0.42, 0, 0.42].map((z, i) => (
          <Fan key={i} position={[0, -0.14, z]} rotation={[Math.PI / 2, 0, 0]} radius={0.16} color="#6366f1" speed={5 + i * 0.4} />
        ))}
        <mesh position={[-HX * 0.62, 0, 0]}>
          <boxGeometry args={[0.02, 0.24, HZ * 1.4]} />
          <meshStandardMaterial color="#1c2028" metalness={0.85} roughness={0.3} />
        </mesh>
        {/* 8핀 전원 단자 */}
        <mesh position={[0.1, 0.1, -0.5]}>
          <boxGeometry args={[0.12, 0.06, 0.1]} />
          <meshStandardMaterial color="#05070a" roughness={0.8} />
        </mesh>
      </group>

      {/* ===== 파워 쉬라우드 (카본) + SSD ===== */}
      <RoundedBox args={[HX * 1.85, 0.42, HZ * 1.9]} radius={0.02} smoothness={2} position={[0, -HY + 0.32, 0]} castShadow>
        <meshStandardMaterial color="#0d0f14" map={carbon} metalness={0.5} roughness={0.45} />
      </RoundedBox>
      <mesh position={[HX - 0.06, -HY + 0.5, 0]}>
        <boxGeometry args={[0.01, 0.02, HZ * 1.5]} />
        <meshStandardMaterial color="#a855f7" emissive="#a855f7" emissiveIntensity={2.4} toneMapped={false} />
      </mesh>
      {/* 쉬라우드 위 SSD */}
      <RoundedBox args={[0.18, 0.03, 0.4]} radius={0.005} smoothness={2} position={[0.05, -HY + 0.55, -0.35]} castShadow>
        <meshStandardMaterial color="#20242d" metalness={0.8} roughness={0.35} />
      </RoundedBox>

      {/* ===== 전원 케이블 (브레이드) ===== */}
      {/* GPU 8핀 → 상단 뒤쪽으로 */}
      <Cable
        points={[
          [0.1, 0.04, -0.52],
          [0.26, 0.25, -0.5],
          [0.18, 0.6, -0.45],
          [-HX + 0.2, 0.82, -0.4],
        ]}
      />
      {/* 24핀 ATX → 메인보드 우측 */}
      <Cable
        color="#0c0e12"
        points={[
          [0.12, -HY + 0.55, 0.55],
          [0.26, -0.15, 0.62],
          [0.18, 0.35, 0.62],
          [-HX + 0.18, 0.6, 0.6],
        ]}
      />

      {/* 전면 3열 ARGB 흡기 팬 */}
      {[-0.58, 0.0, 0.58].map((y, i) => (
        <Fan key={i} position={[0.02, y, HZ - 0.12]} radius={0.27} color={i === 1 ? '#a855f7' : '#6366f1'} speed={5.5 + i * 0.3} />
      ))}

      {/* 유리 패널: 전면 + 측면 */}
      <GlassPanel position={[0.02, 0, HZ + 0.005]} w={HX * 1.85} h={HY * 1.92} frameMap={brushed} />
      <GlassPanel position={[HX + 0.005, 0, 0]} rotation={[0, Math.PI / 2, 0]} w={HZ * 1.92} h={HY * 1.92} frameMap={brushed} />
    </group>
  )
}

export default function Pc3DScene({ caseInfo }) {
  const caseColor = useCaseColor(caseInfo)
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true }}
      camera={{ position: [3.6, 1.55, 4.0], fov: 42 }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[4, 6, 5]} intensity={1.2} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0002} />
      <directionalLight position={[-5, 2, -3]} intensity={0.4} color="#8b5cf6" />
      <pointLight position={[1.6, 0.3, 1.6]} intensity={4} distance={5} color="#6366f1" />

      {/* 케이스 내부 조명 — 측면 유리 너머 부품이 보이도록 (모델은 고정, 카메라만 회전) */}
      <pointLight position={[0.2, 0.35, 0.25]} intensity={3.5} distance={2.2} color="#cdd6ff" />
      <pointLight position={[0.15, -0.3, 0.35]} intensity={3} distance={2} color="#aeb6ff" />
      <pointLight position={[0.2, 0.7, -0.15]} intensity={2.2} distance={1.8} color="#ffffff" />

      <Environment resolution={256}>
        <Lightformer intensity={3} position={[0, 4, 2]} scale={[7, 3, 1]} color="#ffffff" />
        <Lightformer intensity={1.4} position={[-4, 1, 3]} scale={[3, 5, 1]} color="#b9c0ff" />
        <Lightformer intensity={1.2} position={[4, 1, -2]} scale={[3, 5, 1]} color="#c9b6ff" />
        <Lightformer intensity={1} position={[0, -3, 1]} scale={[6, 3, 1]} color="#6366f1" />
      </Environment>

      <group rotation={[-0.12, 0, 0]}>
        <Tower caseColor={caseColor} />
      </group>

      <ContactShadows position={[0, -1.32, 0]} opacity={0.6} scale={6} blur={2.6} far={3} />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={1.8}
        minPolarAngle={Math.PI / 3.2}
        maxPolarAngle={Math.PI / 1.95}
      />

      {/* SSAO(틈새 음영) + 블룸(ARGB 발광) */}
      <EffectComposer>
        <SSAO samples={16} radius={0.04} intensity={7} luminanceInfluence={0.7} color="black" />
        <Bloom intensity={0.9} luminanceThreshold={0.25} luminanceSmoothing={0.3} mipmapBlur radius={0.6} />
      </EffectComposer>
    </Canvas>
  )
}
