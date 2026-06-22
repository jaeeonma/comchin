import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useBuildStore, ESSENTIAL_CATEGORIES, CATEGORIES } from '../store/useBuildStore'
import { useCartStore } from '../store/useCartStore'
import { useFavoriteStore } from '../store/useFavoriteStore'
import { useSavedBuildStore } from '../store/useSavedBuildStore'
import { useAuthStore } from '../store/useAuthStore'
import { usePaymentStore } from '../store/usePaymentStore'
import { useAiStore } from '../store/useAiStore'
import BuyPlayModal from './BuyPlayModal'
import CartFromSavedModal from './CartFromSavedModal'
import CheckoutModal from './CheckoutModal'

const formatPrice = (won) => `${won.toLocaleString('ko-KR')}원`

// 직접 견적 부품 카테고리 → 한글 라벨 (결제 이력 상세에 사용)
const CAT_LABEL = {
  cpu: 'CPU', cpuCooler: 'CPU 쿨러', memory: '메모리', motherboard: '메인보드',
  gpu: '그래픽카드', ssd: 'SSD', hdd: 'HDD', psu: '파워', case: '케이스', os: '윈도우',
}

// 완본체/부품 상세(구매) 페이지 맨 아래 고정 바.
// coolzen 구매 바 벤치마킹 — 찜 / 장바구니 / 구매하기.
// ※ 찜 동작은 미구현(모양만).
// includeBuild=true(완본체): 총액 = PC 가격 + 업그레이드 ZONE 선택 부품 합계.
// includeBuild=false(단일 부품): 총액 = 그 부품 가격만.
// playfulBuy=true(직접 견적): 구매하기 클릭 시 가격과 회전하는 3D PC 본체 팝업(재미 요소).
// cartItem 이 있으면(완본체/부품 상세) 장바구니 버튼이 동작한다. 직접 견적은 안 넘기므로 모양만 유지.
export default function PurchaseBar({ basePrice = 0, includeBuild = true, playfulBuy = false, cartItem = null }) {
  // selectedParts 를 직접 구독해야 부품 선택 시 즉시 리렌더된다.
  const selectedParts = useBuildStore((s) => s.selectedParts)
  const loadedBuild = useBuildStore((s) => s.loadedBuild)
  const partsTotal = includeBuild
    ? Object.values(selectedParts).reduce((sum, part) => sum + (part?.price ?? 0), 0)
    : 0
  const price = basePrice + partsTotal

  const [showPlay, setShowPlay] = useState(false)
  const [showCheckout, setShowCheckout] = useState(false)

  // 이 바가 화면에 있는 동안 우하단 AI 버튼을 위로 띄우게 표시(겹침 방지)
  const setBottomBar = useAiStore((s) => s.setBottomBar)
  useEffect(() => {
    setBottomBar(true)
    return () => setBottomBar(false)
  }, [setBottomBar])

  // 직접 견적에서는 필수 구성 부품(추가 구성 제외)을 모두 골라야 구매하기 활성화
  const essentialReady = ESSENTIAL_CATEGORIES.every((c) => selectedParts[c])
  const buyDisabled = playfulBuy && !essentialReady

  // 견적 저장 (직접 견적 전용)
  const addBuild = useSavedBuildStore((s) => s.addBuild)
  const nextName = useSavedBuildStore((s) => s.nextName)
  const savedBuilds = useSavedBuildStore((s) => s.builds)

  // 장바구니 담기 (cartItem 이 있을 때만, 로그인 필요)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const addItem = useCartStore((s) => s.addItem)
  const [added, setAdded] = useState(false)
  const [needLogin, setNeedLogin] = useState(false)
  const [showSavedCart, setShowSavedCart] = useState(false) // 직접 견적: 저장한 견적 담기 모달

  const requireLogin = () => {
    setNeedLogin(true)
    setTimeout(() => navigate('/login'), 900)
  }

  const onAddToCart = () => {
    if (!cartItem) return
    if (!user) {
      requireLogin()
      return
    }
    addItem(cartItem)
    setAdded(true)
    setTimeout(() => setAdded(false), 2200)
  }

  // 직접 견적: 장바구니 클릭 → 저장한 견적 고르는 모달 (로그인 필요)
  const onBuilderCart = () => {
    if (!user) {
      requireLogin()
      return
    }
    setShowSavedCart(true)
  }

  // 모달에서 고른 저장 견적을 장바구니에 담는다 (build 타입)
  const addSavedBuildToCart = (build) => {
    addItem({
      id: build.id,
      type: 'build',
      name: build.name,
      image: build.caseImage ?? null,
      price: build.price,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2200)
  }

  // 즐겨찾기(찜) 대상
  // - 완본체/부품 상세: cartItem
  // - 직접 견적: 저장한 견적을 불러왔을 때 그 견적(build)을 찜
  const favoriteItem = cartItem
    ? cartItem
    : playfulBuy && loadedBuild
      ? {
          id: loadedBuild.id,
          type: 'build',
          name: loadedBuild.name,
          image: loadedBuild.caseImage ?? null,
          price: loadedBuild.price ?? price,
        }
      : null

  const toggleFavorite = useFavoriteStore((s) => s.toggle)
  const favorited = useFavoriteStore((s) =>
    favoriteItem ? s.items.some((it) => it.key === `${favoriteItem.type}:${favoriteItem.id}`) : false,
  )
  const [favMsg, setFavMsg] = useState(null) // 찜 안내 토스트 문구
  const onToggleFavorite = () => {
    if (!favoriteItem) return
    const added = toggleFavorite(favoriteItem)
    setFavMsg(added ? '즐겨찾기에 추가했어요.' : '즐겨찾기에서 뺐어요.')
    setTimeout(() => setFavMsg(null), 1800)
  }

  // 구매하기 → 결제. 로그인 필요, 결제수단 없으면 등록 페이지로.
  const checkoutSummary = cartItem
    ? cartItem.name
    : playfulBuy
      ? `직접 견적 (${Object.keys(selectedParts).length}개 부품)`
      : '상품'
  // 직접 견적이면 선택한 부품 내역을 결제 이력에 함께 남긴다 (카테고리 순서대로)
  const checkoutDetails = playfulBuy
    ? CATEGORIES.filter((c) => selectedParts[c]).map((c) => ({
        category: CAT_LABEL[c] ?? c,
        name: selectedParts[c].name,
        price: selectedParts[c].price ?? 0,
      }))
    : null
  const openCheckout = () => {
    if (!user) {
      requireLogin()
      return
    }
    const proceed = () => {
      if (usePaymentStore.getState().methods.length === 0) {
        navigate('/wallet/new')
        return
      }
      setShowPlay(false)
      setShowCheckout(true)
    }
    const st = usePaymentStore.getState()
    if (!st.loaded) st.fetch().finally(proceed)
    else proceed()
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur">
      {/* 담김 안내 토스트 */}
      {added && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mt-2 flex items-center justify-between rounded-lg border border-brand bg-brand/10 px-4 py-2 text-sm">
            <span className="text-text">장바구니에 담았습니다.</span>
            <Link to="/cart" className="font-semibold text-brand hover:underline">
              장바구니 보기
            </Link>
          </div>
        </div>
      )}

      {/* 즐겨찾기 안내 토스트 */}
      {favMsg && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mt-2 flex items-center justify-between rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-sm">
            <span className="text-text">{favMsg}</span>
            <Link to="/favorites" className="font-semibold text-rose-500 hover:underline">
              즐겨찾기 보기
            </Link>
          </div>
        </div>
      )}

      {/* 비로그인 안내 토스트 */}
      {needLogin && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mt-2 rounded-lg border border-rose-500/50 bg-rose-500/10 px-4 py-2 text-sm text-text">
            로그인이 필요합니다. 로그인 페이지로 이동합니다…
          </div>
        </div>
      )}

      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        {/* 총액 */}
        <p className="mb-2 text-right text-sm text-muted">
          {includeBuild ? '선택 총액' : '상품 금액'}{' '}
          <span className="text-xl font-bold text-text">{formatPrice(price)}</span>
        </p>

        {/* 버튼 행 */}
        <div className="flex items-stretch gap-3">
          {/* 찜(즐겨찾기) — 완본체/부품, 또는 직접 견적에서 저장한 견적을 불러왔을 때 동작 */}
          <button
            type="button"
            aria-label={favorited ? '즐겨찾기 해제' : '즐겨찾기'}
            aria-pressed={favorited}
            disabled={!favoriteItem}
            title={
              !favoriteItem && playfulBuy ? '저장한 견적을 불러오면 즐겨찾기할 수 있어요' : undefined
            }
            onClick={favoriteItem ? onToggleFavorite : undefined}
            className={`flex w-14 shrink-0 items-center justify-center rounded-xl border transition-colors ${
              favorited
                ? 'border-rose-500 text-rose-500'
                : 'border-border text-muted hover:text-rose-500'
            } ${!favoriteItem ? 'cursor-not-allowed opacity-50' : ''}`}
          >
            <svg
              viewBox="0 0 24 24"
              fill={favorited ? 'currentColor' : 'none'}
              stroke="currentColor"
              strokeWidth="1.6"
              className="h-6 w-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"
              />
            </svg>
          </button>

          {/* 장바구니 — 완본체/부품: 바로 담기 / 직접 견적: 저장한 견적 고르기 */}
          <button
            type="button"
            onClick={playfulBuy ? onBuilderCart : cartItem ? onAddToCart : undefined}
            className="flex-1 rounded-xl border border-brand bg-surface py-3.5 text-base font-semibold text-brand transition-colors hover:bg-brand/10"
          >
            장바구니
          </button>

          {/* 구매하기 — 직접 견적은 3D 팝업 후 결제, 완본체/부품은 바로 결제. 부품 미선택 시 비활성화 */}
          <button
            type="button"
            disabled={buyDisabled}
            onClick={buyDisabled ? undefined : playfulBuy ? () => setShowPlay(true) : openCheckout}
            className={`flex-[1.6] rounded-xl py-3.5 text-base font-bold transition-colors ${
              buyDisabled
                ? 'cursor-not-allowed bg-surface-2 text-muted'
                : 'bg-brand text-white hover:bg-brand-hover'
            }`}
          >
            구매하기
          </button>
        </div>
      </div>

      {showPlay && (
        <BuyPlayModal
          price={price}
          caseInfo={selectedParts.case}
          onClose={() => setShowPlay(false)}
          // 저장 기능은 직접 견적(playfulBuy)에서만 동작
          onSave={
            playfulBuy
              ? (name) =>
                  addBuild({
                    name,
                    caseImage: selectedParts.case?.imageUrl ?? null,
                    price,
                    parts: selectedParts,
                  })
              : undefined
          }
          defaultName={playfulBuy ? nextName() : ''}
          onCheckout={openCheckout}
        />
      )}

      {/* 직접 견적: 저장한 견적을 골라 장바구니에 담기 */}
      {showSavedCart && (
        <CartFromSavedModal
          builds={savedBuilds}
          onAdd={addSavedBuildToCart}
          onClose={() => setShowSavedCart(false)}
        />
      )}

      {/* 결제 팝업 */}
      {showCheckout && (
        <CheckoutModal
          amount={price}
          summary={checkoutSummary}
          details={checkoutDetails}
          onClose={() => setShowCheckout(false)}
          onPaid={() => setShowCheckout(false)}
        />
      )}
    </div>
  )
}
