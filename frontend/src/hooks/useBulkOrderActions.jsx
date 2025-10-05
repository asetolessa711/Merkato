import { useState } from 'react';
import axios from 'axios';

export function useBulkOrderActions({ orders, emailTemplate, headers, BULK_ACTION_LIMIT }) {
  // State
  const [emailPreviewOrderIds, setEmailPreviewOrderIds] = useState([]);
  const [emailPreviewContent, setEmailPreviewContent] = useState('');
  const [activeDialog, setActiveDialog] = useState(null);
  const [bulkProgress, setBulkProgress] = useState(null);
  const [bulkErrors, setBulkErrors] = useState([]);
  const [bulkSummary, setBulkSummary] = useState({ success: [], failed: [], action: '', details: [] });
  const [showBulkSummary, setShowBulkSummary] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [showToast, setShowToast] = useState(false);
  const [bulkActionHistory, setBulkActionHistory] = useState([]);

  // Handlers
  const handleBulkResendEmails = (selectedOrders) => {
    if (selectedOrders.length === 0) return;
    setEmailPreviewOrderIds([...selectedOrders]);
    const firstOrder = orders.find(order => order._id === selectedOrders[0]);
    if (firstOrder) {
      setEmailPreviewContent(
        emailTemplate
          .replace('{{buyer}}', firstOrder.buyer?.name || '')
          .replace('{{orderId}}', firstOrder._id)
          .replace('{{status}}', firstOrder.status || '')
      );
    }
    setActiveDialog('emailPreview');
  };

  const confirmBulkResendEmails = async () => {
    setShowEmailPreview(true);
    setBulkProgress(null);
    setBulkErrors([]);
  };

  const handleConfirmResendEmails = async () => {
    setActiveDialog(null);
    setBulkProgress('Resending emails...');
    setBulkErrors([]);
    try {
      const response = await axios.post('/api/admin/orders/bulk-resend-emails', {
        orderIds: emailPreviewOrderIds,
        template: emailTemplate
      }, { headers });
      const failed = response.data.failed || [];
      const success = emailPreviewOrderIds.filter(id => !failed.includes(id));
      setBulkErrors(failed);
      setBulkProgress(null);
      setBulkSummary({
        success,
        failed,
        action: 'Resend emails for selected orders',
        details: failed.map(id => ({ id, error: 'Failed to send email' }))
      });
      setShowBulkSummary(true);
      if (failed.length > 0) {
        setToastMsg(`Some emails failed to send: ${failed.join(', ')}`);
      } else {
        setShowToast(true);
        setToastMsg('Resend email triggered for selected orders.');
      }
      setBulkActionHistory(prev => [
        {
          timestamp: new Date().toLocaleString(),
          user: localStorage.getItem('adminName') || 'Admin',
          action: 'Resend emails for selected orders',
          orderIds: [...emailPreviewOrderIds]
        },
        ...prev
      ]);
      setEmailPreviewOrderIds([]);
      setEmailPreviewContent('');
    } catch (err) {
      setBulkErrors(emailPreviewOrderIds);
      setBulkProgress(null);
      setBulkSummary({
        success: [],
        failed: [...emailPreviewOrderIds],
        action: 'Resend emails for selected orders',
        details: emailPreviewOrderIds.map(id => ({ id, error: 'Bulk resend emails failed.' }))
      });
      setShowBulkSummary(true);
      setToastMsg('Bulk resend emails failed.');
    }
  };

  const retryBulkStatusChange = async (bulkSummary) => {
    if (!bulkSummary.failed.length) return;
    setBulkProgress('Retrying failed status updates...');
    try {
      const response = await axios.post('/api/admin/orders/bulk-status', {
        orderIds: bulkSummary.failed,
        status: bulkSummary.action.replace('Status changed to ', '')
      }, { headers });
      const failed = response.data.failed || [];
      const success = bulkSummary.failed.filter(id => !failed.includes(id));
      setBulkSummary(prev => ({
        ...prev,
        success: [...prev.success, ...success],
        failed,
        details: failed.map(id => ({ id, error: 'Failed to update' }))
      }));
      setBulkErrors(failed);
      setBulkProgress(null);
      if (failed.length === 0) setActiveDialog(null);
    } catch (err) {
      setBulkProgress(null);
    }
  };

  const retryBulkResendEmails = async (bulkSummary) => {
    if (!bulkSummary.failed.length) return;
    setBulkProgress('Retrying failed emails...');
    try {
      const response = await axios.post('/api/admin/orders/bulk-resend-emails', {
        orderIds: bulkSummary.failed,
        template: emailTemplate
      }, { headers });
      const failed = response.data.failed || [];
      const success = bulkSummary.failed.filter(id => !failed.includes(id));
      setBulkSummary(prev => ({
        ...prev,
        success: [...prev.success, ...success],
        failed,
        details: failed.map(id => ({ id, error: 'Failed to send email' }))
      }));
      setBulkErrors(failed);
      setBulkProgress(null);
      if (failed.length === 0) setShowBulkSummary(false);
    } catch (err) {
      setBulkProgress(null);
    }
  };

  const cancelBulkResendEmails = () => {
    setActiveDialog(null);
    setEmailPreviewOrderIds([]);
    setEmailPreviewContent('');
  };

  return {
    emailPreviewOrderIds,
    emailPreviewContent,
    activeDialog,
    bulkProgress,
    bulkErrors,
    bulkSummary,
    showBulkSummary,
    showEmailPreview,
    toastMsg,
    showToast,
    bulkActionHistory,
    setEmailPreviewOrderIds,
    setEmailPreviewContent,
    setActiveDialog,
    setBulkProgress,
    setBulkErrors,
    setBulkSummary,
    setShowBulkSummary,
    setShowEmailPreview,
    setToastMsg,
    setShowToast,
    setBulkActionHistory,
    handleBulkResendEmails,
    confirmBulkResendEmails,
    handleConfirmResendEmails,
    retryBulkStatusChange,
    retryBulkResendEmails,
    cancelBulkResendEmails
  };
}
