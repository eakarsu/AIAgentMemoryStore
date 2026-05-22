import React from 'react';
import AIPage from '../components/AIPage';
import { aiPiiRedact } from '../services/api';

export default function AIPiiRedactPage() {
  return (
    <AIPage
      title="AI · PII Redact"
      feature="pii-redact"
      subtitle="Scrub PII from event_text before embedding or storage."
      inputs={[
        { key: 'text', label: 'Text', type: 'textarea' },
      ]}
      run={(v) => aiPiiRedact(v)}
    />
  );
}
