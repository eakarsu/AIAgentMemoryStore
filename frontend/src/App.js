import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import MemoriesPage from './pages/MemoriesPage';
import SubjectsPage from './pages/SubjectsPage';
import ProjectionsPage from './pages/ProjectionsPage';
import ExtractorsPage from './pages/ExtractorsPage';
import RetentionPoliciesPage from './pages/RetentionPoliciesPage';
import AIInsertMemoryPage from './pages/AIInsertMemoryPage';
import AIRecallPage from './pages/AIRecallPage';
import AITimeTravelPage from './pages/AITimeTravelPage';
import AIContradictionDetectPage from './pages/AIContradictionDetectPage';
import AISummaryRollupPage from './pages/AISummaryRollupPage';
import AIExtractorTunerPage from './pages/AIExtractorTunerPage';
import AIEmbeddingQualityPage from './pages/AIEmbeddingQualityPage';
import SubjectBrowserWorkbench from './pages/SubjectBrowserWorkbench';
import TimeSliderWorkbench from './pages/TimeSliderWorkbench';
import CustomViewsPage from './pages/CustomViewsPage';
import { getToken } from './services/api';
import './App.css';

function RequireAuth({ children }) {
  const location = useLocation();
  if (!getToken()) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function Shell() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main" style={{ padding: 0 }}>
        <Topbar />
        <div style={{ padding: '24px 32px' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/memories" element={<MemoriesPage />} />
            <Route path="/subjects" element={<SubjectsPage />} />
            <Route path="/projections" element={<ProjectionsPage />} />
            <Route path="/extractors" element={<ExtractorsPage />} />
            <Route path="/retention-policies" element={<RetentionPoliciesPage />} />
            <Route path="/ai/insert-memory" element={<AIInsertMemoryPage />} />
            <Route path="/ai/recall" element={<AIRecallPage />} />
            <Route path="/ai/time-travel" element={<AITimeTravelPage />} />
            <Route path="/ai/contradiction-detect" element={<AIContradictionDetectPage />} />
            <Route path="/ai/summary-rollup" element={<AISummaryRollupPage />} />
            <Route path="/ai/extractor-tuner" element={<AIExtractorTunerPage />} />
            <Route path="/ai/embedding-quality" element={<AIEmbeddingQualityPage />} />
            <Route path="/wb/subject-browser" element={<SubjectBrowserWorkbench />} />
            <Route path="/wb/time-slider" element={<TimeSliderWorkbench />} />
            <Route path="/custom-views" element={<CustomViewsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/*" element={<RequireAuth><Shell /></RequireAuth>} />
      </Routes>
    </Router>
  );
}
