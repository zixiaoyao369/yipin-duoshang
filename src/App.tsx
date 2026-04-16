import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ToastProvider } from "@/components/Toast"
import { ClientProvider } from "@/components/ClientContext"
import { SubmittedCategoriesProvider } from "@/components/SubmittedCategoriesContext"
import Layout from "@/components/Layout"
import Dashboard from "@/pages/Dashboard"
import DataPrep from "@/pages/DataPrep"
import SimilarityMatch from "@/pages/SimilarityMatch"
import RulesConfig from "@/pages/RulesConfig"
import PromptManagement from "@/pages/PromptManagement"
import BadCasePage from "@/pages/BadCase"
import DataVerify from "@/pages/DataVerify"

function App() {
  return (
    <ClientProvider>
      <SubmittedCategoriesProvider>
      <ToastProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/data-prep" element={<DataPrep />} />
              <Route path="/similarity-match" element={<SimilarityMatch />} />
              <Route path="/rules-config" element={<RulesConfig />} />
              <Route path="/prompt-management" element={<PromptManagement />} />
              <Route path="/badcase" element={<BadCasePage />} />
              <Route path="/data-verify" element={<DataVerify />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
      </SubmittedCategoriesProvider>
    </ClientProvider>
  )
}

export default App
