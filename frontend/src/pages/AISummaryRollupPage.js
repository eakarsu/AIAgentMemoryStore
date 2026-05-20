import React from 'react';
import AIPage from '../components/AIPage';
import { aiSummaryRollup } from '../services/api';

export default function AISummaryRollupPage() {
  return (
    <AIPage
      title="AI · Summary Rollup"
      feature="summary-rollup"
      subtitle="Summary Rollup"
      inputs={[
        { key: 'subject', label: 'Subject', type: 'text', placeholder: '' },
        { key: 'period', label: 'Period', type: 'text', placeholder: '' }
      ]}
      run={(v) => aiSummaryRollup(v)}
    />
  );
}
