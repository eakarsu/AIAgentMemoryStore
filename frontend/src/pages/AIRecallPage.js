import React from 'react';
import AIPage from '../components/AIPage';
import { aiRecall } from '../services/api';

export default function AIRecallPage() {
  return (
    <AIPage
      title="AI · Natural-Language Recall"
      feature="recall"
      subtitle="Natural-Language Recall"
      inputs={[
        { key: 'query', label: 'Query', type: 'textarea', placeholder: '' }
      ]}
      run={(v) => aiRecall(v)}
    />
  );
}
