import React from 'react';
import './GlobalMessage.css';
import { useMessage } from '../context/MessageContext';

const GlobalMessage = () => {
  const { message, type } = useMessage();
  if (!message) return null;
  return (
    <div className={`global-message ${type}`}>{message}</div>
  );
};

export default GlobalMessage;
