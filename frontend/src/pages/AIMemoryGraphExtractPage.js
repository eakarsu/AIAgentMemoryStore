import React from 'react';
import AIPage from '../components/AIPage';
import { aiMemoryGraphExtract } from '../services/api';

export default function AIMemoryGraphExtractPage() {
  return (
    <AIPage
      title="AI · Memory Graph Extract"
      feature="memory-graph-extract"
      subtitle="Extract entities and relations from a memory to populate the knowledge-graph layer."
      inputs={[
        { key: 'event_text', label: 'Event text', type: 'textarea' },
      ]}
      run={(v) => aiMemoryGraphExtract(v)}
    />
  );
}
