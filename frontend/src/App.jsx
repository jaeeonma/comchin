import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import HomePage from './pages/HomePage'
import BuilderPage from './pages/BuilderPage'
import DiyBuilderPage from './pages/DiyBuilderPage'
import CategoryPage from './pages/CategoryPage'
import PrebuiltDetailPage from './pages/PrebuiltDetailPage'
import PartsPage from './pages/PartsPage'
import PartDetailPage from './pages/PartDetailPage'
import CartPage from './pages/CartPage'
import FavoritesPage from './pages/FavoritesPage'
import WalletPage from './pages/WalletPage'
import AddPaymentPage from './pages/AddPaymentPage'
import TipsPage from './pages/TipsPage'
import PartsGuidePage from './pages/PartsGuidePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import NotFoundPage from './pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="builder" element={<BuilderPage />} />
        <Route path="builder/intel" element={<DiyBuilderPage platform="intel" />} />
        <Route path="builder/amd" element={<DiyBuilderPage platform="amd" />} />
        <Route path="category/:key" element={<CategoryPage />} />
        <Route path="parts" element={<PartsPage />} />
        <Route path="part/:id" element={<PartDetailPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="wallet" element={<WalletPage />} />
        <Route path="wallet/new" element={<AddPaymentPage />} />
        <Route path="pc/:id" element={<PrebuiltDetailPage />} />
        <Route path="guide/tips" element={<TipsPage />} />
        <Route path="guide/parts" element={<PartsGuidePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="signup" element={<SignupPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
