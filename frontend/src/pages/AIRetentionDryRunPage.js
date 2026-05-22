import React from 'react';
import AIPage from '../components/AIPage';
import { aiRetentionDryRun } from '../services/api';

export default function AIRetentionDryRunPage() {
  return (
    <AIPage
      title="AI · Retention Dry-Run (Advisory)"
      feature="retention-dry-run"
      subtitle="LLM-narrated dry-run of a retention policy. NO deletions are issued from this page. Human review required."
      inputs={[
        { key: 'namespace', label: 'Namespace', type: 'text' },
        { key: 'policy_days', label: 'Policy days', type: 'number', defaultValue: 30 },
      ]}
      run={(v) => aiRetentionDryRun(v)}
    />
  );
}
