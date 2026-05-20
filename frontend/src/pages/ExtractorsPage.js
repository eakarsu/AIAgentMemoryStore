import React from 'react';
import CrudPage from '../components/CrudPage';
import { extractorsApi } from '../services/api';

const FIELDS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'version', label: 'Version', type: 'text' },
  { key: 'model', label: 'Model', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ["active","deprecated"] },
  { key: 'last_run', label: 'Last Run', type: 'datetime-local' }
];

export default function ExtractorsPage() {
  return (
    <CrudPage
      title="Extractors"
      subtitle="Manage extractors records"
      api={extractorsApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}
