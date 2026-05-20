import React from 'react';
import AIPage from '../components/AIPage';
import { aiTimeTravel } from '../services/api';

export default function AITimeTravelPage() {
  return (
    <AIPage
      title="AI · Time-Travel Query"
      feature="time-travel"
      subtitle="Time-Travel Query"
      inputs={[
        { key: 'subject', label: 'Entity', type: 'text', placeholder: '' },
        { key: 'as_of', label: 'As Of (date)', type: 'text', placeholder: '' }
      ]}
      run={(v) => aiTimeTravel(v)}
    />
  );
}
