import React from 'react';

export function Markdown({ content }) {
  if (!content) return null;

  // Normalize newlines
  const normalized = content.replace(/\r\n/g, '\n');

  // Split content into code blocks vs standard text blocks
  const parts = normalized.split(/(```[\s\S]*?```)/g);

  return (
    <div className="markdown-body">
      {parts.map((part, index) => {
        if (part.startsWith('```') && part.endsWith('```')) {
          // Extract language and code content safely
          const rawCode = part.slice(3, -3);
          const firstNewline = rawCode.indexOf('\n');
          let lang = '';
          let code = rawCode;

          if (firstNewline !== -1) {
            const potentialLang = rawCode.substring(0, firstNewline).trim();
            if (potentialLang && !potentialLang.includes(' ') && potentialLang.length < 15) {
              lang = potentialLang;
              code = rawCode.substring(firstNewline + 1);
            }
          }
          code = code.trim();

          return (
            <pre key={index} className="markdown-code-block">
              {lang && <div className="code-lang">{lang}</div>}
              <code>{code}</code>
            </pre>
          );
        }

        // Parse standard text blocks (lists, headers, bold, inline code, paragraphs)
        const lines = part.split('\n');
        const elements = [];
        let listItems = [];
        let listType = null; // 'ul' or 'ol'

        const flushList = (key) => {
          if (listItems.length > 0) {
            if (listType === 'ul') {
              elements.push(<ul key={`ul-${key}`}>{listItems}</ul>);
            } else {
              elements.push(<ol key={`ol-${key}`}>{listItems}</ol>);
            }
            listItems = [];
            listType = null;
          }
        };

        const parseInline = (text) => {
          if (!text) return '';
          const segments = text.split(/(\*\*.*?\*\*|`.*?`)/g);

          return segments.map((piece, i) => {
            if (piece.startsWith('**') && piece.endsWith('**')) {
              return <strong key={i}>{piece.slice(2, -2)}</strong>;
            }
            if (piece.startsWith('`') && piece.endsWith('`')) {
              return (
                <code key={i} className="inline-code">
                  {piece.slice(1, -1)}
                </code>
              );
            }
            return piece;
          });
        };

        lines.forEach((line, lineIdx) => {
          const trimmed = line.trim();

          // Header 1-6 (# Heading)
          const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
          if (headerMatch) {
            flushList(lineIdx);
            const level = headerMatch[1].length;
            const text = headerMatch[2];
            const Tag = `h${Math.min(level + 1, 6)}`; // h2-h6
            elements.push(<Tag key={lineIdx}>{parseInline(text)}</Tag>);
            return;
          }

          // Unordered list item (- item or * item)
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            if (listType && listType !== 'ul') {
              flushList(lineIdx);
            }
            listType = 'ul';
            listItems.push(<li key={lineIdx}>{parseInline(trimmed.substring(2))}</li>);
            return;
          }

          // Ordered list item (1. item)
          const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
          if (olMatch) {
            if (listType && listType !== 'ol') {
              flushList(lineIdx);
            }
            listType = 'ol';
            listItems.push(<li key={lineIdx}>{parseInline(olMatch[2])}</li>);
            return;
          }

          // Empty line
          if (!trimmed) {
            flushList(lineIdx);
            return;
          }

          // Regular paragraph line
          flushList(lineIdx);
          elements.push(<p key={lineIdx}>{parseInline(line)}</p>);
        });

        flushList(lines.length);

        return <React.Fragment key={index}>{elements}</React.Fragment>;
      })}
    </div>
  );
}
