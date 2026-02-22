// components/MathText.jsx
'use client';

import { useEffect, useRef } from 'react';

export default function MathText({ children }) {
  const mathRef = useRef(null);

  useEffect(() => {
    if (window.MathJax && mathRef.current) {
      window.MathJax.typesetPromise([mathRef.current]).catch((err) =>
        console.error('MathJax error:', err)
      );
    }
  }, [children]);

  return <span ref={mathRef}>{children}</span>;
}