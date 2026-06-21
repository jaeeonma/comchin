// 운영체제(윈도우) 옵션 — DB 부품이 아니라 고정 3개 옵션이라 프론트 정적 데이터로 둔다.
// 부품과 동일한 형태({id,category,name,brand,price,tdp,imageUrl,specs})라 빌드 스토어/미리보기와 그대로 호환된다.
// imageUrl 은 네이버 쇼핑(공식 API) 제품 이미지 hotlink.
export const OS_PARTS = [
  {
    id: 'os-1',
    category: 'OS',
    name: '마이크로소프트 윈도우11 홈 정품USB 처음사용자용 + 완벽 세팅',
    brand: 'Microsoft',
    price: 199000,
    tdp: 0,
    imageUrl: 'https://shopping-phinf.pstatic.net/main_8971701/89717017073.2.jpg',
    specs: { edition: 'Windows 11 Home', media: 'USB (처음사용자용)' },
  },
  {
    id: 'os-2',
    category: 'OS',
    name: '마이크로소프트 윈도우11 프로 정품DVD + 완벽 세팅',
    brand: 'Microsoft',
    price: 259000,
    tdp: 0,
    imageUrl: 'https://shopping-phinf.pstatic.net/main_8799270/87992706500.jpg',
    specs: { edition: 'Windows 11 Pro', media: 'DVD' },
  },
  {
    id: 'os-3',
    category: 'OS',
    name: '마이크로소프트 윈도우 11 프로 정품USB 처음사용자용 + 완벽세팅',
    brand: 'Microsoft',
    price: 325000,
    tdp: 0,
    imageUrl: 'https://shopping-phinf.pstatic.net/main_8597004/85970042701.jpg',
    specs: { edition: 'Windows 11 Pro', media: 'USB (처음사용자용)' },
  },
]
