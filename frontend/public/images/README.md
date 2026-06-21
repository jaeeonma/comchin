# 이미지 폴더 안내

사진(상품·배너·부품 이미지)을 여기에 넣으세요.

## 폴더 구분

| 폴더              | 용도                          |
| ----------------- | ----------------------------- |
| `images/builds/`  | 추천 견적 / 완본체 상품 사진  |
| `images/banners/` | 메인 상단 배너 이미지         |
| `images/parts/`   | 개별 부품(CPU, GPU 등) 사진   |

## 사용 방법 (경로 참조)

`public/` 안의 파일은 `/images/...` 경로로 바로 접근됩니다.

예: `public/images/builds/b1.png` 를 넣었다면

```jsx
<img src="/images/builds/b1.png" alt="가성비 롤 입문 PC" />
```

또는 목업 데이터(`src/data/mockBuilds.js`)에 경로를 넣어 쓰면 됩니다.

```js
{ id: 'b1', name: '가성비 롤 입문 PC', image: '/images/builds/b1.png', ... }
```

> 컴포넌트에서 `import` 해서 쓰는 이미지(빌드 시 최적화·해시 적용)는
> `public/` 이 아니라 `src/assets/` 에 두고 `import img from '../assets/...'` 로 불러오세요.
