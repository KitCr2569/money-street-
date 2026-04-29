'use client';

import React from 'react';

// Inline markdown: **bold**, `code`
function InlineMarkdown({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let idx = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    if (boldMatch && boldMatch.index !== undefined) {
      if (boldMatch.index > 0) {
        parts.push(<span key={idx++}>{remaining.slice(0, boldMatch.index)}</span>);
      }
      parts.push(<strong key={idx++} className="font-bold text-foreground">{boldMatch[1]}</strong>);
      remaining = remaining.slice(boldMatch.index + boldMatch[0].length);
      continue;
    }

    // Code
    const codeMatch = remaining.match(/`(.+?)`/);
    if (codeMatch && codeMatch.index !== undefined) {
      if (codeMatch.index > 0) {
        parts.push(<span key={idx++}>{remaining.slice(0, codeMatch.index)}</span>);
      }
      parts.push(
        <code key={idx++} className="bg-surface-3 px-1.5 py-0.5 rounded text-[11px] font-mono text-accent">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch.index + codeMatch[0].length);
      continue;
    }

    // No more matches
    parts.push(<span key={idx++}>{remaining}</span>);
    break;
  }

  return <>{parts}</>;
}

// Simple markdown-to-JSX renderer for analysis output
export default function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const key = i;

    // H2
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={key} className="text-[16px] font-bold text-foreground mt-5 mb-2 pb-1.5 border-b border-border/50">
          {line.slice(3)}
        </h2>
      );
      continue;
    }

    // H3
    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={key} className="text-[14px] font-bold text-foreground mt-4 mb-1.5">
          {line.slice(4)}
        </h3>
      );
      continue;
    }

    // Horizontal rule
    if (line.trim() === '---') {
      elements.push(<hr key={key} className="border-border/30 my-3" />);
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const text = line.slice(2);
      let borderColor = 'border-accent/40';
      let bgColor = 'bg-accent/5';
      if (text.includes('🟢') || text.includes('ซื้อ')) { borderColor = 'border-green/40'; bgColor = 'bg-green/5'; }
      else if (text.includes('🔴') || text.includes('ขาย')) { borderColor = 'border-red/40'; bgColor = 'bg-red/5'; }
      else if (text.includes('🟡') || text.includes('รอ')) { borderColor = 'border-yellow/40'; bgColor = 'bg-yellow/5'; }
      else if (text.includes('⛔')) { borderColor = 'border-red/40'; bgColor = 'bg-red/5'; }

      elements.push(
        <blockquote key={key} className={`border-l-3 ${borderColor} ${bgColor} pl-3 py-2 pr-3 rounded-r-lg my-2 text-[13px]`}>
          <InlineMarkdown text={text} />
        </blockquote>
      );
      continue;
    }

    // List item
    if (line.startsWith('- ')) {
      elements.push(
        <div key={key} className="flex gap-2 my-0.5 text-[13px] text-foreground/85 leading-relaxed">
          <span className="text-dim shrink-0 mt-0.5">•</span>
          <span><InlineMarkdown text={line.slice(2)} /></span>
        </div>
      );
      continue;
    }

    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s(.+)/);
    if (numMatch) {
      elements.push(
        <div key={key} className="flex gap-2 my-0.5 text-[13px] text-foreground/85 leading-relaxed">
          <span className="text-accent font-mono font-bold shrink-0 w-4 text-right">{numMatch[1]}.</span>
          <span><InlineMarkdown text={numMatch[2]} /></span>
        </div>
      );
      continue;
    }

    // Bold paragraph with colored backgrounds
    if (line.startsWith('**') && line.includes('🟢')) {
      elements.push(
        <div key={key} className="mt-3 mb-1 px-3 py-2 rounded-lg bg-green/8 border border-green/15">
          <InlineMarkdown text={line} />
        </div>
      );
      continue;
    }
    if (line.startsWith('**') && line.includes('🔴')) {
      elements.push(
        <div key={key} className="mt-3 mb-1 px-3 py-2 rounded-lg bg-red/8 border border-red/15">
          <InlineMarkdown text={line} />
        </div>
      );
      continue;
    }
    if (line.startsWith('**') && line.includes('🟡')) {
      elements.push(
        <div key={key} className="mt-3 mb-1 px-3 py-2 rounded-lg bg-yellow/8 border border-yellow/15">
          <InlineMarkdown text={line} />
        </div>
      );
      continue;
    }

    // Table: detect | col | col | rows
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      const tableRows: string[][] = [];
      let j = i;
      while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
        const row = lines[j].trim().slice(1, -1).split('|').map((c) => c.trim());
        // Skip separator row (|---|---|)
        if (!row.every((c) => /^[-:\s]+$/.test(c))) {
          tableRows.push(row);
        }
        j++;
      }
      if (tableRows.length > 0) {
        const [header, ...body] = tableRows;
        elements.push(
          <div key={key} className="overflow-x-auto my-3">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b border-border">
                  {header.map((cell, ci) => (
                    <th key={ci} className="text-left py-2 px-3 text-dim font-semibold text-[12px] uppercase tracking-wider">
                      <InlineMarkdown text={cell} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.map((row, ri) => (
                  <tr key={ri} className="border-b border-border/30 hover:bg-surface-2/50">
                    {row.map((cell, ci) => (
                      <td key={ci} className="py-1.5 px-3 text-foreground/85">
                        <InlineMarkdown text={cell} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        i = j - 1; // skip processed lines
        continue;
      }
    }

    // Empty line
    if (line.trim() === '') {
      elements.push(<div key={key} className="h-1.5" />);
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={key} className="text-[13px] text-foreground/85 leading-relaxed my-0.5">
        <InlineMarkdown text={line} />
      </p>
    );
  }

  return <>{elements}</>;
}
