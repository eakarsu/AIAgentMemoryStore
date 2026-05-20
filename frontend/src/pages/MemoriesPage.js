import React from 'react';
import CrudPage from '../components/CrudPage';
import { memoriesApi } from '../services/api';

const FIELDS = [
  { key: 'subject', label: 'Subject', type: 'text' },
  { key: 'event_text', label: 'Event', type: 'textarea' },
  { key: 'tags', label: 'Tags', type: 'text' },
  { key: 'status', label: 'Status', type: 'select', options: ["active","archived"] },
  { key: 'embedded_at', label: 'Embedded', type: 'datetime-local' }
];

export default function MemoriesPage() {
  return (
    <CrudPage
      title="Memories"
      subtitle="Manage memories records"
      api={memoriesApi}
      fields={FIELDS}
      statusKey="status"
    />
  );
}
