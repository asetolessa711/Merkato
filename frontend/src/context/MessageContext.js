import React, { createContext, useContext, useState, useCallback } from 'react';

export const MessageContext = createContext();

export const MessageProvider = ({ children }) => {
  const [message, setMessage] = useState(null);
  const [type, setType] = useState('success'); // 'success' or 'error'

  const showMessage = useCallback((msg, msgType = 'success') => {
    setMessage(msg);
    setType(msgType);
    setTimeout(() => setMessage(null), 4000);
  }, []);

  return (
    <MessageContext.Provider value={{ message, type, showMessage }}>
      {children}
    </MessageContext.Provider>
  );
};

export const useMessage = () => useContext(MessageContext);
