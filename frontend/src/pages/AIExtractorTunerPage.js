import React from 'react';
import AIPage from '../components/AIPage';
import { aiExtractorTuner } from '../services/api';

export default function AIExtractorTunerPage() {
  return (
    <AIPage
      title="AI · Extractor Tuner"
      feature="extractor-tuner"
      subtitle="Extractor Tuner"
      inputs={[
        { key: 'extractor_name', label: 'Extractor', type: 'text', placeholder: '' },
        { key: 'failing_examples', label: 'Failing Examples', type: 'textarea', placeholder: '' }
      ]}
      run={(v) => aiExtractorTuner(v)}
    />
  );
}
