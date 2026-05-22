import React from 'react';
import AIPage from '../components/AIPage';
import { aiSemanticSearch } from '../services/api';

export default function AISemanticSearchPage() {
  return (
    <AIPage
      title="AI · Semantic Search"
      feature="semantic-search"
      subtitle="Pure relevance-ranked retrieval, distinct from /recall (which synthesizes an answer)."
      inputs={[
        { key: 'query', label: 'Query', type: 'textarea' },
        { key: 'top_k', label: 'Top K', type: 'number', defaultValue: 5 },
      ]}
      run={(v) => aiSemanticSearch(v)}
    />
  );
}
