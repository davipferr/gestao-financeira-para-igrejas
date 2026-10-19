import { BrowserRouter, Navigate, Route, Routes } from 'react-router'

import { AppLayout } from '@/components/AppLayout'
import { RequireAdmin } from '@/components/RequireAdmin'
import { RequireAuth } from '@/components/RequireAuth'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/lib/auth'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { HomePage } from '@/pages/HomePage'
import { ImportPage } from '@/pages/ImportPage'
import { LoginPage } from '@/pages/LoginPage'
import { TransactionsPage } from '@/pages/TransactionsPage'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<HomePage />} />
            <Route
              path="lancamentos"
              element={
                <RequireAdmin>
                  <TransactionsPage />
                </RequireAdmin>
              }
            />
            <Route
              path="categorias"
              element={
                <RequireAdmin>
                  <CategoriesPage />
                </RequireAdmin>
              }
            />
            <Route
              path="importar"
              element={
                <RequireAdmin>
                  <ImportPage />
                </RequireAdmin>
              }
            />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="bottom-center" richColors closeButton toastOptions={{ classNames: { toast: 'text-base!', title: 'text-base!' } }} />
    </AuthProvider>
  )
}
