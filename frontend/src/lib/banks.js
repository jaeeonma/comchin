// 은행/카드사 목록 + 로고 정보.
// 로고 이미지는 frontend/public/images/banks/<slug>.png 에 넣으면 자동으로 표시됩니다.
// 파일이 없으면 BankLogo 가 브랜드 색(color) 칩으로 폴백합니다.
export const BANKS = {
  account: [
    { name: '국민은행', slug: 'kookmin', color: '#FFB800' },
    { name: '신한은행', slug: 'shinhan', color: '#0046FF' },
    { name: '우리은행', slug: 'woori', color: '#0067AC' },
    { name: '하나은행', slug: 'hana', color: '#008C82' },
    { name: '농협은행', slug: 'nh', color: '#0AAA4E' },
    { name: '기업은행', slug: 'ibk', color: '#004B9E' },
    { name: '카카오뱅크', slug: 'kakao', color: '#FFE600' },
    { name: '토스뱅크', slug: 'toss', color: '#0064FF' },
    { name: '새마을금고', slug: 'mg', color: '#E2231A' },
    { name: 'SC제일은행', slug: 'sc', color: '#0F7A3D' },
  ],
  card: [
    { name: '국민카드', slug: 'kb-card', color: '#6F6F6F' },
    { name: '신한카드', slug: 'shinhan-card', color: '#0046FF' },
    { name: '삼성카드', slug: 'samsung-card', color: '#1428A0' },
    { name: '현대카드', slug: 'hyundai-card', color: '#111111' },
    { name: '롯데카드', slug: 'lotte-card', color: '#DA291C' },
    { name: '우리카드', slug: 'woori-card', color: '#0067AC' },
    { name: '하나카드', slug: 'hana-card', color: '#008C82' },
    { name: 'BC카드', slug: 'bc-card', color: '#EE3124' },
    { name: '농협카드', slug: 'nh-card', color: '#0AAA4E' },
  ],
}

export const ALL_BANKS = [...BANKS.account, ...BANKS.card]
export const bankBySlug = (slug) => ALL_BANKS.find((b) => b.slug === slug)
export const bankByName = (name) => ALL_BANKS.find((b) => b.name === name)
export const bankLogoSrc = (slug) => `/images/banks/${slug}.png`
