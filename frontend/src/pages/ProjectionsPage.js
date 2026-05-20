import React from 'react';
import CrudPage from '../components/CrudPage';
import { projectionsApi } from '../services/api';

const FIELDS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'schema_desc', label: 'Schema', type: 'textarea' },
  { key: 'status', label: 'Status', type: 'select', options: ["active","draft"] }
];

export default function ProjectionsPage() {
  return (
    <CrudPage
      title="Projections"
      subtitle="Manage projections records"
      api={projectionsApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}
