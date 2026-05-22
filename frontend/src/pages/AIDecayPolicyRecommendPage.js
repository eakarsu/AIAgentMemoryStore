import React from 'react';
import AIPage from '../components/AIPage';
import { aiDecayPolicyRecommend } from '../services/api';

export default function AIDecayPolicyRecommendPage() {
  return (
    <AIPage
      title="AI · Decay Policy Recommend (Advisory)"
      feature="decay-policy-recommend"
      subtitle="Recommend per-namespace forgetting/decay curves. Output is advisory; human review required before applying."
      inputs={[
        { key: 'namespace', label: 'Namespace', type: 'text' },
        { key: 'access_pattern', label: 'Access pattern (free-form)', type: 'textarea' },
      ]}
      run={(v) => aiDecayPolicyRecommend(v)}
    />
  );
}
