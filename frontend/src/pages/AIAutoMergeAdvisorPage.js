import React from 'react';
import AIPage from '../components/AIPage';
import { aiAutoMergeAdvisor } from '../services/api';

export default function AIAutoMergeAdvisorPage() {
  return (
    <AIPage
      title="AI · Auto-Merge Advisor (Advisory)"
      feature="auto-merge-advisor"
      subtitle="Propose merge groups for contradictory memories with truth-drift risk notes. No merges are issued — human review required."
      inputs={[
        { key: 'subject', label: 'Subject', type: 'text' },
        { key: 'candidate_ids', label: 'Candidate IDs (comma-separated)', type: 'text' },
      ]}
      run={(v) => aiAutoMergeAdvisor(v)}
    />
  );
}
