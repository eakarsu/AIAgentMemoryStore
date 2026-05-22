import React from 'react';
import AIPage from '../components/AIPage';
import { aiCrossAgentShareAdvisor } from '../services/api';

export default function AICrossAgentShareAdvisorPage() {
  return (
    <AIPage
      title="AI · Cross-Agent Share Advisor (Advisory)"
      feature="cross-agent-share-advisor"
      subtitle="Propose memory grants between agents with redaction notes and privacy risks. Sharing OFF by default — human review required."
      inputs={[
        { key: 'source_agent', label: 'Source agent', type: 'text' },
        { key: 'target_agent', label: 'Target agent', type: 'text' },
        { key: 'subject', label: 'Subject (optional)', type: 'text' },
      ]}
      run={(v) => aiCrossAgentShareAdvisor(v)}
    />
  );
}
