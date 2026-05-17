'use client';

import { Toaster, ToastBar } from 'react-hot-toast';

const BORDER: Record<string, string> = {
  success: '#ACA39A',
  error:   '#6E6259',
  loading: '#83786F',
  blank:   '#B1B3B3',
  custom:  '#B1B3B3',
};

export default function ToasterWrapper() {
  return (
    <Toaster position="top-right" gutter={8} toastOptions={{ duration: 3000 }}>
      {(t) => (
        <ToastBar
          toast={t}
          style={{
            background:    '#3D3935',
            color:         '#FFFFFF',
            borderRadius:  '2px',
            borderLeft:    `3px solid ${BORDER[t.type] ?? '#B1B3B3'}`,
            fontSize:      '13px',
            fontFamily:    'Nunito, sans-serif',
            fontWeight:    '400',
            letterSpacing: '0.04em',
            padding:       '12px 16px',
            boxShadow:     '0 4px 16px rgba(0,0,0,0.25)',
            maxWidth:      '380px',
          }}
        >
          {({ message }) => <>{message}</>}
        </ToastBar>
      )}
    </Toaster>
  );
}
