import React from 'react';
import AIPage from '../components/AIPage';
import { aiMemoryConsolidate } from '../services/api';

export default function AIMemoryConsolidatePage() {
  return (
    <AIPage
      title="AI · Memory Consolidate"
      feature="memory-consolidate"
      subtitle="Summarize and merge N old memories into one canonical episodic block."
      inputs={[
        { key: 'subject', label: 'Subject', type: 'text' },
        { key: 'memory_ids', label: 'Memory IDs (comma-separated)', type: 'text' },
        { key: 'period', label: 'Period', type: 'text' },
      ]}
      run={(v) => aiMemoryConsolidate(v)}
    />
  );
}
