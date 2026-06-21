// DIY 인텔/AMD 플랫폼 호환 판정 (CPU·메인보드만 소켓으로 따지고, 나머지는 공용).

export const PLATFORM_SOCKETS = {
  intel: ['LGA1700', 'LGA1851', 'LGA1200', 'LGA1151'],
  amd: ['AM4', 'AM5'],
}

export const PLATFORM_LABEL = { intel: '인텔', amd: 'AMD' }

// 소켓이 비어 있을 때 이름으로 보조 판별
export function matchPlatformByName(name, platform) {
  const n = (name || '').toLowerCase()
  if (platform === 'intel') return /인텔|intel|코어|core|lga|울트라|ultra/.test(n) && !/라이젠|ryzen|\bam[45]\b/.test(n)
  if (platform === 'amd') return /라이젠|ryzen|\bam[45]\b|라데온|radeon/.test(n) && !/인텔|intel|코어\s*i|울트라|lga/.test(n)
  return true
}

// 이 부품이 해당 플랫폼에 장착 가능한가? (CPU·메인보드만 소켓 검사, 그 외는 항상 true)
export function isPartCompatible(part, platform) {
  if (!platform || !part) return true
  const cat = part.category
  if (cat !== 'CPU' && cat !== 'MOTHERBOARD') return true
  const socks = PLATFORM_SOCKETS[platform] || []
  return part.socket ? socks.includes(part.socket) : matchPlatformByName(part.name, platform)
}
