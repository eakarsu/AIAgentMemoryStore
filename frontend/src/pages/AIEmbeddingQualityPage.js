import React from 'react';
import AIPage from '../components/AIPage';
import { aiEmbeddingQuality } from '../services/api';

export default function AIEmbeddingQualityPage() {
  return (
    <AIPage
      title="AI · Embedding Quality"
      feature="embedding-quality"
      subtitle="Embedding Quality"
      inputs={[
        { key: 'sample_texts', label: 'Sample Texts', type: 'textarea', placeholder: '' },
        { key: 'expected_groups_hint', label: 'Groups Hint', type: 'text', placeholder: '' }
      ]}
      run={(v) => aiEmbeddingQuality(v)}
    />
  );
}
