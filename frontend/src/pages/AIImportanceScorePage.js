import React from 'react';
import AIPage from '../components/AIPage';
import { aiImportanceScore } from '../services/api';

export default function AIImportanceScorePage() {
  return (
    <AIPage
      title="AI · Importance Score"
      feature="importance-score"
      subtitle="Score a fresh memory's importance / pin-worthiness before storage."
      inputs={[
        { key: 'subject', label: 'Subject', type: 'text' },
        { key: 'event_text', label: 'Event', type: 'textarea' },
        { key: 'tags', label: 'Tags', type: 'text' },
      ]}
      run={(v) => aiImportanceScore(v)}
    />
  );
}
