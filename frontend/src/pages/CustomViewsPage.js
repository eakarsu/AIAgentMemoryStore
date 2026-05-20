import React from 'react';
import MemoryGraph from '../components/MemoryGraph';
import RetrievalQualityChart from '../components/RetrievalQualityChart';
import MemoryExporter from '../components/MemoryExporter';
import NamespaceEditor from '../components/NamespaceEditor';

export default function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page">
      <div className="page-header">
        <div>
          <h2>Memory Views</h2>
          <p>Custom visualizations and tooling for the agent memory store.</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
        <MemoryGraph />
        <RetrievalQualityChart />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
          <MemoryExporter />
          <NamespaceEditor />
        </div>
      </div>
    </div>
  );
}
