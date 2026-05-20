import React from 'react';
import AIPage from '../components/AIPage';
import { aiContradictionDetect } from '../services/api';

export default function AIContradictionDetectPage() {
  return (
    <AIPage
      title="AI · Contradiction Detect"
      feature="contradiction-detect"
      subtitle="Contradiction Detect"
      inputs={[
        { key: 'subject', label: 'Subject', type: 'text', placeholder: '' },
        { key: 'recent_window', label: 'Window', type: 'text', placeholder: '' }
      ]}
      run={(v) => aiContradictionDetect(v)}
    />
  );
}
