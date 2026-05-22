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

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

// Pass 7 — new AI feature pages
import AIConflictResolvePage from './pages/AIConflictResolvePage';
import AIRelevanceScorePage from './pages/AIRelevanceScorePage';
import AIImportanceScorePage from './pages/AIImportanceScorePage';
import AIMemoryConsolidatePage from './pages/AIMemoryConsolidatePage';
import AIRagChatPage from './pages/AIRagChatPage';
import AIPiiRedactPage from './pages/AIPiiRedactPage';
import AIMemoryGraphExtractPage from './pages/AIMemoryGraphExtractPage';
import AIDecayPolicyRecommendPage from './pages/AIDecayPolicyRecommendPage';
import AISemanticSearchPage from './pages/AISemanticSearchPage';
import AICrossAgentShareAdvisorPage from './pages/AICrossAgentShareAdvisorPage';
import AIRetentionDryRunPage from './pages/AIRetentionDryRunPage';
import AIAutoMergeAdvisorPage from './pages/AIAutoMergeAdvisorPage';
// Pass 7 — new non-AI pages
import AuditLogPage from './pages/AuditLogPage';
import PinnedMemoriesPage from './pages/PinnedMemoriesPage';
import RetentionDryRunPage from './pages/RetentionDryRunPage';
import EvalHarnessPage from './pages/EvalHarnessPage';
import DriftMonitorPage from './pages/DriftMonitorPage';
import CostDashboardPage from './pages/CostDashboardPage';
import ReplayModePage from './pages/ReplayModePage';
import BackgroundJobsPage from './pages/BackgroundJobsPage';
import KnowledgeGraphPage from './pages/KnowledgeGraphPage';
import AgentApiKeysPage from './pages/AgentApiKeysPage';
import AclPage from './pages/AclPage';
import MemoryConflictResolverPage from './pages/MemoryConflictResolverPage';

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
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

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

            {/* Pass 7 — AI features */}
            <Route path="/ai/conflict-resolve" element={<AIConflictResolvePage />} />
            <Route path="/ai/relevance-score" element={<AIRelevanceScorePage />} />
            <Route path="/ai/importance-score" element={<AIImportanceScorePage />} />
            <Route path="/ai/memory-consolidate" element={<AIMemoryConsolidatePage />} />
            <Route path="/ai/rag-chat" element={<AIRagChatPage />} />
            <Route path="/ai/pii-redact" element={<AIPiiRedactPage />} />
            <Route path="/ai/memory-graph-extract" element={<AIMemoryGraphExtractPage />} />
            <Route path="/ai/decay-policy-recommend" element={<AIDecayPolicyRecommendPage />} />
            <Route path="/ai/semantic-search" element={<AISemanticSearchPage />} />
            <Route path="/ai/cross-agent-share-advisor" element={<AICrossAgentShareAdvisorPage />} />
            <Route path="/ai/retention-dry-run" element={<AIRetentionDryRunPage />} />
            <Route path="/ai/auto-merge-advisor" element={<AIAutoMergeAdvisorPage />} />

            {/* Pass 7 — non-AI ops */}
            <Route path="/ops/audit-log" element={<AuditLogPage />} />
            <Route path="/ops/pinned" element={<PinnedMemoriesPage />} />
            <Route path="/ops/retention-dry-run" element={<RetentionDryRunPage />} />
            <Route path="/ops/eval-harness" element={<EvalHarnessPage />} />
            <Route path="/ops/drift" element={<DriftMonitorPage />} />
            <Route path="/ops/cost" element={<CostDashboardPage />} />
            <Route path="/ops/replay" element={<ReplayModePage />} />
            <Route path="/ops/jobs" element={<BackgroundJobsPage />} />
            <Route path="/ops/knowledge-graph" element={<KnowledgeGraphPage />} />
            <Route path="/ops/api-keys" element={<AgentApiKeysPage />} />
            <Route path="/ops/acl" element={<AclPage />} />
            <Route path="/ops/memory-conflicts" element={<MemoryConflictResolverPage />} />

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
