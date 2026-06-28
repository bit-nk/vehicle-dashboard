import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import { isAuthed, isPlatformAdmin } from './lib/auth.js'
import { applyTheme } from './lib/theme.js'
import { DealerProvider } from './store/DealerStore.jsx'
import { AdminStoreProvider } from './store/AdminStore.jsx'
import DashboardLayout from './components/DashboardLayout.jsx'

applyTheme() // set light/dark before first paint (default dark)

// GitHub Pages serves both apps as static files under sub-paths; a hash router avoids the
// per-app 404 problem there. Local dev keeps clean URLs (BrowserRouter).
const Router = import.meta.env.VITE_HASH_ROUTER === 'true' ? HashRouter : BrowserRouter

const Login = lazy(() => import('./pages/Login.jsx'))
const Overview = lazy(() => import('./pages/Overview.jsx'))
const Inventory = lazy(() => import('./pages/Inventory.jsx'))
const InventoryNew = lazy(() => import('./pages/InventoryNew.jsx'))
const InventoryVehicle = lazy(() => import('./pages/InventoryVehicle.jsx'))
const Service = lazy(() => import('./pages/Service.jsx'))
const ServiceJob = lazy(() => import('./pages/ServiceJob.jsx'))
const Sales = lazy(() => import('./pages/Sales.jsx'))
const SaleDetail = lazy(() => import('./pages/SaleDetail.jsx'))
const Parts = lazy(() => import('./pages/Parts.jsx'))
const Billing = lazy(() => import('./pages/Billing.jsx'))
const PrintInvoice = lazy(() => import('./pages/PrintInvoice.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const AddNewItem = lazy(() => import('./pages/AddNewItem.jsx'))
const Approvals = lazy(() => import('./pages/Approvals.jsx'))
const AdminLayout = lazy(() => import('./components/AdminLayout.jsx'))
const AdminHome = lazy(() => import('./pages/admin/AdminHome.jsx'))
const AdminDealerships = lazy(() => import('./pages/admin/AdminDealerships.jsx'))
const AdminDealershipEdit = lazy(() => import('./pages/admin/AdminDealershipEdit.jsx'))
const AdminCatalog = lazy(() => import('./pages/admin/AdminCatalog.jsx'))
const AdminAddItem = lazy(() => import('./pages/admin/AdminAddItem.jsx'))

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-ink-200 border-t-brand-600" />
    </div>
  )
}

// Apps are kept separate (public site on its own origin). The dashboard's entry is
// /signin, which carries a prominent "Public site" button to the public app.
function RequireAuth({ children }) {
  if (isAuthed()) return children
  if (isPlatformAdmin()) return <Navigate to="/admin" replace />
  return <Navigate to="/signin" replace />
}
function RequireAdmin({ children }) {
  if (isPlatformAdmin()) return children
  if (isAuthed()) return <Navigate to="/" replace />
  return <Navigate to="/signin" replace state={{ from: 'admin' }} />
}
// /signin: bounce already-signed-in users to their home; else show the login.
function SigninGate() {
  if (isAuthed()) return <Navigate to="/" replace />
  if (isPlatformAdmin()) return <Navigate to="/admin" replace />
  return <Login />
}
function CatchAll() {
  if (isPlatformAdmin()) return <Navigate to="/admin" replace />
  if (isAuthed()) return <Navigate to="/" replace />
  return <Navigate to="/signin" replace />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Router>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/signin" element={<SigninGate />} />
          <Route path="/login" element={<Navigate to="/signin" replace />} />

          {/* Platform admin subtree */}
          <Route element={<RequireAdmin><AdminStoreProvider><AdminLayout /></AdminStoreProvider></RequireAdmin>}>
            <Route path="/admin" element={<AdminHome />} />
            <Route path="/admin/dealerships" element={<AdminDealerships />} />
            <Route path="/admin/dealerships/:id" element={<AdminDealershipEdit />} />
            <Route path="/admin/catalog" element={<AdminCatalog />} />
            <Route path="/admin/add-item" element={<AdminAddItem />} />
          </Route>

          {/* Dealer subtree */}
          <Route element={<RequireAuth><DealerProvider><DashboardLayout /></DealerProvider></RequireAuth>}>
            <Route path="/" element={<Overview />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/inventory/new" element={<InventoryNew />} />
            <Route path="/inventory/:vehicleId" element={<InventoryVehicle />} />
            <Route path="/service" element={<Service />} />
            <Route path="/service/:jobId" element={<ServiceJob />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/sales/:saleId" element={<SaleDetail />} />
            <Route path="/parts" element={<Parts />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/billing/:docType/:id" element={<PrintInvoice />} />
            <Route path="/add-item" element={<AddNewItem />} />
            <Route path="/approvals" element={<Approvals />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<CatchAll />} />
        </Routes>
      </Suspense>
    </Router>
  </StrictMode>,
)
