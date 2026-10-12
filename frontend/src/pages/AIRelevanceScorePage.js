import React from 'react';
import AIPage from '../components/AIPage';
import { aiRelevanceScore } from '../services/api';

export default function AIRelevanceScorePage() {
  return (
    <AIPage
      title="AI · Relevance Score"
      feature="relevance-score"
      subtitle="Score memories' relevance to a query for re-ranking and pruning."
      inputs={[
        { key: 'query', label: 'Query', type: 'textarea' },
        { key: 'memory_ids', requiresExistingRecord: true, label: 'Memory IDs (comma-separated)', type: 'text' },
      ]}
      run={(v, requestOptions) => aiRelevanceScore(v, requestOptions)}
    />
  );
}
