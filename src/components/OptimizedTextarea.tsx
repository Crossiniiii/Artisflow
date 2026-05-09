import React, { useState, useEffect } from 'react';

export const OptimizedTextarea = ({ value, onChange, ...props }: any) => {
  const [internalValue, setInternalValue] = useState(value || '');

  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (onChange && internalValue !== value) {
        // Mock event object for onChange
        onChange({ target: { value: internalValue } } as React.ChangeEvent<HTMLTextAreaElement>);
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [internalValue, onChange, value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInternalValue(e.target.value);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    if (onChange && internalValue !== value) {
      onChange(e);
    }
    if (props.onBlur) {
      props.onBlur(e);
    }
  };

  return (
    <textarea
      {...props}
      value={internalValue}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
};

