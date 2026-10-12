import React, {useEffect,useState} from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import LoginPage from './pages/LoginPage';
import MemoriesPage from './pages/MemoriesPage';
import NativeMemoryWorkspace from './pages/NativeMemoryWorkspace';
import SubjectsPage from './pages/SubjectsPage';
import ProjectionsPage from './pages/ProjectionsPage';
import ExtractorsPage from './pages/ExtractorsPage';
import RetentionPoliciesPage from './pages/RetentionPoliciesPage';
import AIInsertMemoryPage from './pages/AIInsertMemoryPage';
import MemoryGovernanceReview from './pages/MemoryGovernanceReview';
import AIRecallPage from './pages/AIRecallPage';
import AITimeTravelPage from './pages/AITimeTravelPage';
import AIContradictionDetectPage from './pages/AIContradictionDetectPage';
import AISummaryRollupPage from './pages/AISummaryRollupPage';
import AIExtractorTunerPage from './pages/AIExtractorTunerPage';
import AIEmbeddingQualityPage from './pages/AIEmbeddingQualityPage';
import SubjectBrowserWorkbench from './pages/SubjectBrowserWorkbench';
import TimeSliderWorkbench from './pages/TimeSliderWorkbench';
import CustomViewsPage from './pages/CustomViewsPage';
import { getToken,getMe,setToken,setStoredUser } from './services/api';
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

function RequireAuth({children}){const location=useLocation();const[verified,setVerified]=useState(false),[error,setError]=useState('');useEffect(()=>{if(!getToken())return;let active=true;getMe().then(value=>{if(!value.user)throw Error('The native account could not be verified.');if(active){setStoredUser(value.user);setVerified(true);}}).catch(error=>{if(active)setError(error.message);});return()=>{active=false;};},[]);if(!getToken())return <Navigate to="/login" replace state={{from:location}}/>;if(error)return <section role="alert">{error}<button onClick={()=>{setToken(null);setStoredUser(null);window.location.assign('/login');}}>Sign in again</button><button onClick={()=>window.location.reload()}>Retry</button></section>;if(!verified)return <p role="status">Verifying your native account…</p>;return children;}

function Shell() {
  return (
    <div className="app">
      <Sidebar />
      <main className="main" style={{ padding: 0 }}>
        <Topbar />
        <div style={{ padding: '24px 32px' }}>
          <Routes><Route path="/" element={<Dashboard/>}/><Route path="/memories" element={<NativeMemoryWorkspace/>}/><Route path="/ai/memory-governance-review" element={<MemoryGovernanceReview/>}/><Route path="*" element={<section><h1>Archived prototype</h1><p>This historical global feature remains disabled because it is not tenant-isolated. Use Native tenant memories or Memory governance review in the sidebar.</p></section>}/></Routes>

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
