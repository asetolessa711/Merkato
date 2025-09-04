import { useState } from 'react';
import axios from 'axios';

export function useBulkActions({ orders, selectedOrders, setOrders, setBulkActionHistory, setBulkSummary, setBulkErrors, setBulkProgress, setShowToast, setToastMsg, setUndoBulk, headers, emailTemplate }) {
  // Bulk status change
  const handleBulkStatusChange = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to change status to '${newStatus}' for ${selectedOrders.length} selected orders?`)) return;
    const prevOrders = orders.filter(order => selectedOrders.includes(order._id)).map(order => ({ ...order }));
    setUndoBulk({ prevOrders, newStatus });
    setOrders(orders.map(order => selectedOrders.includes(order._id) ? { ...order, status: newStatus } : order));
    setShowToast(true);
    setToastMsg(`Status changed to ${newStatus} for selected orders. Undo available.`);
    setBulkProgress('Processing...');
    setBulkErrors([]);
    setBulkActionHistory(prev => [
      {
        timestamp: new Date().toLocaleString(),
        user: localStorage.getItem('adminName') || 'Admin',
        action: `Status changed to ${newStatus}`,
        orderIds: [...selectedOrders]
      },
      ...prev
    ]);
    try {
      const response = await axios.post('/api/admin/orders/bulk-status', {
        orderIds: selectedOrders,
        status: newStatus
      }, { headers });
      const failed = response.data.failed || [];
      const success = selectedOrders.filter(id => !failed.includes(id));
      setBulkErrors(failed);
      setBulkProgress(null);
      setBulkSummary({
        success,
        failed,
        action: `Status changed to ${newStatus}`,
        details: failed.map(id => ({ id, error: 'Failed to update' }))
      });
      if (failed.length > 0) {
        setToastMsg(`Some orders failed to update: ${failed.join(', ')}`);
      }
    } catch (err) {
      setBulkErrors(selectedOrders);
      setBulkProgress(null);
      setBulkSummary({
        success: [],
        failed: [...selectedOrders],
        action: `Status changed to ${newStatus}`,
        details: selectedOrders.map(id => ({ id, error: 'Bulk status update failed.' }))
      });
      setToastMsg('Bulk status update failed.');
    }
  };

  // Undo bulk status change
  const handleUndoBulk = () => {
    setOrders(orders.map(order => {
      const prev = undoBulk.prevOrders.find(o => o._id === order._id);
      return prev ? { ...order, status: prev.status } : order;
    }));
    setShowToast(true);
    setBulkErrors([]);
    setUndoBulk(null);
  };

  // Bulk resend emails
  const handleBulkResendEmails = async (orderIds) => {
    try {
      const response = await axios.post('/api/admin/orders/bulk-resend-emails', {
        orderIds,
        template: emailTemplate
      }, { headers });
      const failed = response.data.failed || [];
      const success = orderIds.filter(id => !failed.includes(id));
      setBulkErrors(failed);
      setBulkProgress(null);
      setBulkSummary({
        success,
        failed,
        action: 'Resend emails for selected orders',
        details: failed.map(id => ({ id, error: 'Failed to send email' }))
      });
      setBulkActionHistory(prev => [
        {
          timestamp: new Date().toLocaleString(),
          user: localStorage.getItem('adminName') || 'Admin',
          action: 'Resend emails for selected orders',
          orderIds: [...orderIds]
        },
        ...prev
      ]);
    } catch (err) {
      setBulkErrors(orderIds);
      setBulkProgress(null);
      setBulkSummary({
        success: [],
        failed: [...orderIds],
        action: 'Resend emails for selected orders',
        details: orderIds.map(id => ({ id, error: 'Bulk resend emails failed.' }))
      });
    }
  };

  // Bulk export
  const handleConfirmExport = async (format, columns) => {
    try {
      const response = await axios.post('/api/admin/orders/bulk-export', {
        orderIds: selectedOrders,
        format,
        columns
      }, { headers, responseType: 'blob' });
      const ext = format === 'csv' ? 'csv' : format === 'excel' ? 'xlsx' : 'pdf';
      const blob = new Blob([response.data], { type: format === 'pdf' ? 'application/pdf' : format === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `selected_orders.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setShowToast(true);
      setToastMsg(`Exported selected orders to ${format.toUpperCase()}.`);
      setBulkProgress(null);
      setBulkActionHistory(prev => [
        {
          timestamp: new Date().toLocaleString(),
          user: localStorage.getItem('adminName') || 'Admin',
          action: `Exported selected orders to ${format.toUpperCase()}`,
          orderIds: [...selectedOrders]
        },
        ...prev
      ]);
      setBulkSummary({
        success: [...selectedOrders],
        failed: [],
        action: `Exported selected orders to ${format.toUpperCase()}`,
        details: []
      });
    } catch (err) {
      setBulkErrors(selectedOrders);
      setBulkProgress(null);
      setBulkSummary({
        success: [],
        failed: [...selectedOrders],
        action: `Exported selected orders to ${format.toUpperCase()}`,
        details: selectedOrders.map(id => ({ id, error: 'Bulk export failed.' }))
      });
      setToastMsg('Bulk export failed.');
    }
  };

  return {
    handleBulkStatusChange,
    handleUndoBulk,
    handleBulkResendEmails,
    handleConfirmExport
  };
}
