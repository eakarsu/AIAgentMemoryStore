import React from 'react';
import AIPage from '../components/AIPage';
import { aiInsertMemory } from '../services/api';

export default function AIInsertMemoryPage() {
  return (
    <AIPage
      title="AI · Insert Memory"
      feature="insert-memory"
      subtitle="Insert Memory"
      inputs={[
        { key: 'subject', label: 'Subject', type: 'text', placeholder: '' },
        { key: 'event_text', label: 'Event', type: 'textarea', placeholder: '' },
        { key: 'tags', label: 'Tags', type: 'text', placeholder: '' }
      ]}
      run={(v) => aiInsertMemory(v)}
    />
  );
}
