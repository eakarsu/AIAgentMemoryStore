import React from 'react';
import AIPage from '../components/AIPage';
import { aiConflictResolve } from '../services/api';

export default function AIConflictResolvePage() {
  return (
    <AIPage
      title="AI · Conflict Resolve (Advisory)"
      feature="conflict-resolve"
      subtitle="Given a contradiction pair, propose a canonical resolved fact + provenance. Output is advisory; human review required before persisting."
      inputs={[
        { key: 'subject', label: 'Subject', type: 'text' },
        { key: 'a', label: 'Fact A', type: 'textarea' },
        { key: 'b', label: 'Fact B', type: 'textarea' },
      ]}
      run={(v) => aiConflictResolve(v)}
    />
  );
}
