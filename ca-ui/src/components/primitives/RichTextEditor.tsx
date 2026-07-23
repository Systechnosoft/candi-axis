'use client';

import React from 'react';
import dynamic from 'next/dynamic';

import { twMerge } from 'tailwind-merge';
import 'react-quill/dist/quill.snow.css';

const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div className="h-40 w-full animate-pulse bg-subtle/50 rounded-md border border-border"></div>
});

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const modules = {
  toolbar: [
    ['bold', 'italic', 'underline', 'link'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['clean']
  ],
};

const formats = [
  'bold', 'italic', 'underline', 'link',
  'list', 'bullet',
];

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  return (
    <div className={twMerge('react-quill-wrapper [&>.quill]:flex [&>.quill]:flex-col [&_.ql-container]:flex-1 [&_.ql-container]:rounded-b-md [&_.ql-toolbar]:rounded-t-md [&_.ql-toolbar]:bg-subtle/30 [&_.ql-container]:bg-white [&_.ql-editor]:min-h-[120px] [&_.ql-editor]:text-sm', className)}>
      <ReactQuill
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
    </div>
  );
}
