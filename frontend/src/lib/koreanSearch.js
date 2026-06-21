// 한글 초성 검색 유틸.
// 'ㄱ' 같은 초성만 입력해도 '그래픽카드'처럼 그 초성으로 시작하는 글자를 매칭한다.

const CHO = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ',
]

// 한 글자 → 그 글자의 초성(한글 음절일 때) / 아니면 소문자 그대로. (길이 1 유지)
export function choOf(ch) {
  const code = ch.charCodeAt(0)
  if (code >= 0xac00 && code <= 0xd7a3) {
    return CHO[Math.floor((code - 0xac00) / 588)]
  }
  return ch.toLowerCase()
}

// 문자열 → { lower, cho } (둘 다 원본과 길이가 같아 인덱스가 1:1로 대응됨)
export function indexStrings(str) {
  let lower = ''
  let cho = ''
  for (const ch of str) {
    lower += ch.toLowerCase()
    cho += choOf(ch)
  }
  return { lower, cho }
}

// 색인 항목(idx={lower,cho})에 대해 질의 q(={lower,cho})가 매칭되는지.
// 반환: { start, len, rank } | null  (rank: 0=맨앞 일치, 1=중간 포함)
export function matchName(idx, q) {
  if (!q.lower) return null

  // 1) 정확한 글자 부분일치
  let pos = idx.lower.indexOf(q.lower)
  if (pos !== -1) {
    return { start: pos, len: q.lower.length, rank: pos === 0 ? 0 : 1 }
  }

  // 2) 초성 일치 (예: 'ㄱ' → '그…')
  pos = idx.cho.indexOf(q.cho)
  if (pos !== -1) {
    return { start: pos, len: q.cho.length, rank: pos === 0 ? 0 : 1 }
  }

  return null
}

// 이름을 매칭 구간 기준으로 [앞, 강조, 뒤] 3조각으로 나눈다.
export function splitHighlight(name, start, len) {
  return {
    before: name.slice(0, start),
    hit: name.slice(start, start + len),
    after: name.slice(start + len),
  }
}
