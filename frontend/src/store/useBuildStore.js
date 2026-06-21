import { create } from 'zustand'

// 견적(빌드) 전역 상태.
// 부품 선택·가격·전력 데이터가 여러 컴포넌트를 오가므로 Zustand로 관리. (계획서 3장)
const CATEGORIES = [
  'cpu',
  'cpuCooler',
  'memory',
  'motherboard',
  'gpu',
  'ssd',
  'hdd',
  'psu',
  'case',
  'os',
]

// 필수 구성 부품(추가 구성 hdd·os 제외) — 견적 완성/구매 가능 판단 기준
const ESSENTIAL_CATEGORIES = ['cpu', 'cpuCooler', 'memory', 'motherboard', 'gpu', 'ssd', 'psu', 'case']

// 프론트 카테고리 키 → 백엔드 PartCategory enum 매핑
// (os 는 백엔드 부품이 아니라 프론트 정적 데이터 — PartList 가 'OS' 를 보면 정적 OS_PARTS 사용)
const CATEGORY_ENUM = {
  cpu: 'CPU',
  cpuCooler: 'CPU_COOLER',
  memory: 'MEMORY',
  motherboard: 'MOTHERBOARD',
  gpu: 'GPU',
  ssd: 'SSD',
  hdd: 'HDD',
  psu: 'PSU',
  case: 'CASE',
  os: 'OS',
}

export const useBuildStore = create((set, get) => ({
  // 카테고리별 선택된 부품 { cpu: {...}, gpu: {...}, ... }
  selectedParts: {},
  // 저장한 견적을 불러왔을 때 그 출처 정보 { id, name, caseImage, price } — 즐겨찾기에 사용
  loadedBuild: null,

  selectPart: (category, part) =>
    set((state) => ({
      selectedParts: { ...state.selectedParts, [category]: part },
    })),

  removePart: (category) =>
    set((state) => {
      const next = { ...state.selectedParts }
      delete next[category]
      return { selectedParts: next }
    }),

  resetBuild: () => set({ selectedParts: {}, loadedBuild: null }),

  // 저장한 견적을 직접 견적으로 불러오기 (selectedParts 통째로 교체)
  // meta(저장 견적 정보)가 오면 즐겨찾기용으로 기억해 둔다.
  loadBuild: (parts, meta = null) =>
    set({ selectedParts: { ...parts }, loadedBuild: meta }),

  // 총 가격 계산
  totalPrice: () =>
    Object.values(get().selectedParts).reduce(
      (sum, part) => sum + (part?.price ?? 0),
      0,
    ),

  // 총 전력 소비량(W) 계산
  totalPower: () =>
    Object.values(get().selectedParts).reduce(
      (sum, part) => sum + (part?.tdp ?? 0),
      0,
    ),
}))

export { CATEGORIES, CATEGORY_ENUM, ESSENTIAL_CATEGORIES }