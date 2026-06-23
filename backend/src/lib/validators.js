// 입력값 검증 — 회원가입/계좌/카드 등록에서 공통으로 쓰는 정규식 + 검증 함수.
// 프론트(UX 즉시 안내)와 백엔드(보안)에서 같은 규칙을 쓰도록 동일 파일을 양쪽에 둔다.
// 각 validate* 함수는 통과하면 null, 실패하면 "사용자에게 보여줄 한국어 메시지"를 반환한다.

export const onlyDigits = (s) => String(s ?? '').replace(/\D/g, '')

export const RE = {
  // 이메일: 공백/@ 없는 로컬 + 도메인 + 2자 이상 TLD
  email: /^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/,
  // 닉네임: 한글/영문/숫자/밑줄 2~16자
  nickname: /^[A-Za-z0-9가-힣_]{2,16}$/,
  // 휴대폰(숫자만 기준): 010/011/016/017/018/019 + 7~8자리
  phone: /^01[016789]\d{7,8}$/,
  // 주민번호 앞 6자리 = 생년월일(YYMMDD): 월 01~12, 일 01~31
  ssnFront: /^\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/,
  // 이름: 한글 2~10자, 또는 영문 시작 + 영문/공백/.'- 로 2~30자
  holderName: /^(?:[가-힣]{2,10}|[A-Za-z][A-Za-z .'-]{1,29})$/,
  // 카드번호(숫자만): 15~16자리
  cardNumber: /^\d{15,16}$/,
  // 계좌번호(숫자만): 8~16자리 (은행마다 형식이 달라 길이로만 검증)
  accountNumber: /^\d{8,16}$/,
}

// 신용카드 번호 체크섬(Luhn) — 자릿수만으로 흔한 오타를 걸러낸다.
export function luhnValid(value) {
  const s = onlyDigits(value)
  if (!s) return false
  let sum = 0
  let alt = false
  for (let i = s.length - 1; i >= 0; i--) {
    let d = s.charCodeAt(i) - 48
    if (alt) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    alt = !alt
  }
  return sum % 10 === 0
}

export function validateEmail(v) {
  return RE.email.test(String(v ?? '').trim()) ? null : '올바른 이메일 형식이 아니에요.'
}

export function validatePassword(v) {
  const s = String(v ?? '')
  if (s.length < 8) return '비밀번호는 8자 이상이어야 해요.'
  if (!/[A-Za-z]/.test(s) || !/\d/.test(s)) return '비밀번호는 영문과 숫자를 모두 포함해야 해요.'
  return null
}

// 닉네임은 선택 항목 — 비어 있으면 통과(서버가 이메일 앞부분으로 채움)
export function validateNickname(v) {
  const s = String(v ?? '').trim()
  if (!s) return null
  return RE.nickname.test(s) ? null : '닉네임은 한글/영문/숫자 2~16자로 입력해주세요.'
}

export function validateHolderName(v) {
  return RE.holderName.test(String(v ?? '').trim())
    ? null
    : '이름은 한글 2~10자 또는 영문으로 입력해주세요.'
}

export function validatePhone(v) {
  return RE.phone.test(onlyDigits(v))
    ? null
    : '전화번호를 올바르게 입력해주세요. (예: 010-1234-5678)'
}

export function validateSsnFront(v) {
  return RE.ssnFront.test(onlyDigits(v))
    ? null
    : '주민등록번호 앞 6자리(생년월일)를 올바르게 입력해주세요.'
}

// type: 'card' | 'account'
export function validateNumber(type, v) {
  const d = onlyDigits(v)
  if (type === 'card') {
    if (!RE.cardNumber.test(d)) return '카드번호 15~16자리를 입력해주세요.'
    if (!luhnValid(d)) return '카드번호가 올바르지 않아요. 번호를 다시 확인해주세요.'
    return null
  }
  return RE.accountNumber.test(d) ? null : '계좌번호를 8~16자리 숫자로 입력해주세요.'
}
