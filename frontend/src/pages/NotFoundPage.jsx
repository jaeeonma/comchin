import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <section className="flex flex-col items-center gap-4 py-20 text-center">
      <h2 className="text-3xl font-bold">404</h2>
      <p className="text-muted">페이지를 찾을 수 없습니다.</p>
      <Link to="/" className="text-brand hover:underline">
        홈으로 돌아가기
      </Link>
    </section>
  )
}
