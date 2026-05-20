import React from 'react';
import CrudPage from '../components/CrudPage';
import { retention_policiesApi } from '../services/api';

const FIELDS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'days', label: 'Days', type: 'number' },
  { key: 'applies_to', label: 'Applies To', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ["active","draft"] }
];

export default function RetentionPoliciesPage() {
  return (
    <CrudPage
      title="Retention Policies"
      subtitle="Manage retention policies records"
      api={retention_policiesApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}
