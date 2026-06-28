import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import Layout from './components/Layout.jsx'
import ScrollToTop from './components/ScrollToTop.jsx'
import RouteFallback from './components/RouteFallback.jsx'

// GitHub Pages serves both apps as static files under sub-paths; a hash router avoids the
// per-app 404 problem there. Local dev keeps clean URLs (BrowserRouter).
const Router = import.meta.env.VITE_HASH_ROUTER === 'true' ? HashRouter : BrowserRouter

// Route-level code splitting keeps the initial JS tiny on mobile.
const Home = lazy(() => import('./pages/Home.jsx'))
const Listings = lazy(() => import('./pages/Listings.jsx'))
const VehicleDetail = lazy(() => import('./pages/VehicleDetail.jsx'))
const Report = lazy(() => import('./pages/Report.jsx'))
const ReportDetail = lazy(() => import('./pages/ReportDetail.jsx'))
const SellVehicle = lazy(() => import('./pages/SellVehicle.jsx'))
const NotFound = lazy(() => import('./pages/NotFound.jsx'))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <ScrollToTop />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/listings" element={<Listings />} />
            <Route path="/vehicle/:id" element={<VehicleDetail />} />
            <Route path="/report" element={<Report />} />
            <Route path="/report/:vin" element={<ReportDetail />} />
            <Route path="/sell" element={<SellVehicle />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  </StrictMode>,
)
