import { Routes, Route, Navigate } from 'react-router-dom'
import { registerLicense, setCulture, setCurrencyCode } from '@syncfusion/ej2-base'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import MattersPage from './pages/MattersPage'
import MatterDetailPage from './pages/MatterDetailPage'
import ContractsPage from './pages/ContractsPage'
import DocumentsPage from './pages/DocumentsPage'
import DeadlinesPage from './pages/DeadlinesPage'
import AnalyticsPage from './pages/AnalyticsPage'
import './styles/App.css'

// Syncfusion license from VITE_SYNCFUSION_LICENSE_KEY.
const licenseKey = import.meta.env.VITE_SYNCFUSION_LICENSE_KEY as string | undefined;
if (licenseKey) {
  registerLicense(licenseKey);
}

setCulture('en-US')
setCurrencyCode('USD')

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="matters" element={<MattersPage />} />
        <Route path="matters/:matterNumber" element={<MatterDetailPage />} />
        <Route path="contracts" element={<ContractsPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="deadlines" element={<DeadlinesPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
