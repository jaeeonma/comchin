import BuilderZone from '../components/BuilderZone'
import PurchaseBar from '../components/PurchaseBar'

export default function BuilderPage() {
  return (
    <div className="flex flex-col gap-6 pb-28">
      <header>
        <p className="text-sm font-semibold tracking-wide text-brand">업그레이드 ZONE</p>
        <h2 className="mt-1 text-3xl font-bold">직접 견적 만들기</h2>
        <p className="mt-2 text-muted">
          왼쪽에서 부품을 고르면 오른쪽에 부품 사진과 안내가 함께 표시되고, 가격·전력이 자동으로 계산돼요.
        </p>
      </header>

      <BuilderZone enableSave />

      {/* 맨 아래 고정 구매 바 — 선택한 부품 합계 기준.
          구매하기를 누르면 가격과 회전하는 3D PC 본체 팝업(재미 요소)이 뜬다. */}
      <PurchaseBar basePrice={0} includeBuild playfulBuy />
    </div>
  )
}
