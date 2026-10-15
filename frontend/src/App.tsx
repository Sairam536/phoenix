import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider } from './context/AuthContext.js';
import { OrgProvider } from './context/OrgContext.js';

import { AppLayout } from './components/layout/AppLayout.js';
import { ProtectedRoute } from './components/layout/ProtectedRoute.js';

import { LandingPage } from './pages/LandingPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { RegisterPage } from './pages/RegisterPage.js';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage.js';

import { DashboardPage } from './pages/DashboardPage.js';
import { DocumentsPage } from './pages/DocumentsPage.js';
import { UploadPage } from './pages/UploadPage.js';
import { DocumentDetailPage } from './pages/DocumentDetailPage.js';
import { ReviewPage } from './pages/ReviewPage.js';
import { ReconciliationPage } from './pages/ReconciliationPage.js';
import { KnowledgePage } from './pages/KnowledgePage.js';
import { JobsPage } from './pages/JobsPage.js';
import { ReportsPage } from './pages/ReportsPage.js';
import { TeamPage } from './pages/TeamPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { AuditPage } from './pages/AuditPage.js';
import { ForbiddenPage } from './pages/ForbiddenPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <OrgProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/callback" element={<Navigate to="/app" replace />} />

              {/* Protected Workspace Routes */}
              <Route
                path="/app"
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path="documents" element={<DocumentsPage />} />
                <Route path="upload" element={<UploadPage />} />
                <Route path="documents/:documentId" element={<DocumentDetailPage />} />
                <Route path="documents/:documentId/review" element={<ReviewPage />} />
                <Route path="review" element={<ReviewPage />} />
                <Route path="review/:documentId" element={<ReviewPage />} />
                <Route path="reconciliation" element={<ReconciliationPage />} />
                <Route path="knowledge" element={<KnowledgePage />} />
                <Route path="jobs" element={<JobsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="team" element={<TeamPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="audit" element={<AuditPage />} />
              </Route>

              {/* Error Routes */}
              <Route path="/403" element={<ForbiddenPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </OrgProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
};
