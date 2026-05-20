import React from 'react';
import CrudPage from '../components/CrudPage';
import { subjectsApi } from '../services/api';

const FIELDS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'type', label: 'Type', type: 'select', options: ["project","customer","employee","vendor","asset"] },
  { key: 'fact_count', label: 'Facts', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ["active","archived"] }
];

export default function SubjectsPage() {
  return (
    <CrudPage
      title="Subjects"
      subtitle="Manage subjects records"
      api={subjectsApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}
