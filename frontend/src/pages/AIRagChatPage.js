import React from 'react';
import AIPage from '../components/AIPage';
import { aiRagChat } from '../services/api';

export default function AIRagChatPage() {
  return (
    <AIPage
      title="AI · RAG Chat"
      feature="rag-chat"
      subtitle="Retrieval-augmented chat: query → top-k recall → grounded answer with citations."
      inputs={[
        { key: 'query', label: 'Query', type: 'textarea' },
        { key: 'top_k', label: 'Top K', type: 'number', defaultValue: 5 },
      ]}
      run={(v) => aiRagChat(v)}
    />
  );
}
