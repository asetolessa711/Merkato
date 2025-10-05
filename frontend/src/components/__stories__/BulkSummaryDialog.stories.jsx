// @trust-ui
import React, { useState } from 'react';
import BulkSummaryDialog from '../BulkSummaryDialog'';

export default {
  title: 'Dialogs/BulkSummaryDialog',
  component: BulkSummaryDialog,
  parameters: { tags: ['@trust-ui', '@visual'] }
};

const Wrapper = ({ initial }) => {
  const [summary, setSummary] = useState(initial);
  return (
    <div style={{ padding: 40 }}>
      <BulkSummaryDialog
        summary={summary}
        onClose={() => setSummary(null)}
        onRetryStatus={(s) => alert('Retry Status: ' + JSON.stringify(s.failed))}
        onRetryEmail={(s) => alert('Retry Email: ' + JSON.stringify(s.failed))}
      />
      {!summary && <button onClick={() => setSummary(initial)}>Reopen</button>}
    </div>
  );
};

export const AllSuccess = () => (
  <Wrapper initial={{ actionType: 'Status Update', success: ['o1','o2','o3'], failed: [] }} />
);
AllSuccess.storyName = 'All Success';

export const SomeFailures = () => (
  <Wrapper initial={{ actionType: 'Email Send', success: ['o10'], failed: ['o11','o12'] }} />
);
SomeFailures.parameters = { tags: ['@trust-ui', '@visual'] };
SomeFailures.storyName = 'Some Failures (Retry Enabled)';
