'use client';

import { useState, useEffect } from 'react';

export default function WhatsAppWidget() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const hidden = localStorage.getItem('whatsapp_widget_hidden');
      setVisible(hidden !== 'true');
    };
    update();
    window.addEventListener('storage', update);
    return () => window.removeEventListener('storage', update);
  }, []);

  const handleClose = () => {
    setVisible(false);
    localStorage.setItem('whatsapp_widget_hidden', 'true');
  };

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        gap: '4px',
      }}
    >
      <button
        onClick={handleClose}
        style={{
          width: '16px',
          height: '16px',
          borderRadius: '50%',
          background: '#666',
          border: 'none',
          color: 'white',
          fontSize: '10px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          lineHeight: 1,
          padding: 0,
          marginBottom: '2px',
        }}
        title="Chiudi"
      >
        ×
      </button>
      <a
        href="https://wa.me/393297919706"
        target="_blank"
        rel="noopener noreferrer"
        title="Contattaci su WhatsApp"
      >
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg"
          alt="WhatsApp"
          style={{ width: '40px', height: '40px', display: 'block' }}
        />
      </a>
    </div>
  );
}
