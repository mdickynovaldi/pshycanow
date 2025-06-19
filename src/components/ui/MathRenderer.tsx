"use client";

import { useEffect, useState } from "react";
import 'katex/dist/katex.min.css';

interface MathRendererProps {
  content: string;
  className?: string;
  debug?: boolean;
}

export function MathRenderer({ content, className = "", debug = false }: MathRendererProps) {
  const [katex, setKatex] = useState<any>(null);
  const [renderedContent, setRenderedContent] = useState<string>(content);
  const [isLoading, setIsLoading] = useState(true);
  const [hasEquations, setHasEquations] = useState(false);

  // Load KaTeX dynamically
  useEffect(() => {
    const loadKatex = async () => {
      try {
        const katexModule = await import('katex');
        setKatex(katexModule.default);
        setIsLoading(false);
        if (debug) {
          console.log('KaTeX loaded successfully');
        }
      } catch (error) {
        console.error('Failed to load KaTeX:', error);
        setIsLoading(false);
      }
    };
    loadKatex();
  }, [debug]);

  // Render math content when KaTeX is loaded or content changes
  useEffect(() => {
    if (isLoading || !content) {
      setRenderedContent(content || '');
      return;
    }

    if (!katex) {
      // Fallback: show raw content if KaTeX failed to load
      console.warn('KaTeX not loaded, showing raw content');
      setRenderedContent(content);
      return;
    }

    try {
      // Check if content has math equations
      const hasMath = /\$.*?\$/.test(content);
      setHasEquations(hasMath);
      
      // Debug: log the content being processed
      if (debug) {
        console.log('Processing math content:', {
          content,
          hasInlineMath: /\$[^$\n]+?\$/.test(content),
          hasBlockMath: /\$\$[\s\S]*?\$\$/.test(content),
          length: content.length
        });
      }
      
      // Replace LaTeX math delimiters with rendered math
      let rendered = content;
      
      // Process block math first ($$...$$)
      rendered = rendered.replace(/\$\$([\s\S]*?)\$\$/g, (match, mathContent) => {
        try {
          const trimmedContent = mathContent.trim();
          if (!trimmedContent) return match;
          
          const result = katex.renderToString(trimmedContent, {
            displayMode: true,
            throwOnError: false,
            trust: true,
            strict: false
          });
          if (debug) {
            console.log('Block math rendered:', trimmedContent, '→', result);
          }
          return result;
        } catch (error) {
          console.error('Error rendering block math:', mathContent, error);
          return match;
        }
      });
      
      // Process inline math (single $...$)
      rendered = rendered.replace(/\$([^$\n]+?)\$/g, (match, mathContent) => {
        try {
          const trimmedContent = mathContent.trim();
          if (!trimmedContent) return match;
          
          const result = katex.renderToString(trimmedContent, {
            displayMode: false,
            throwOnError: false,
            trust: true,
            strict: false
          });
          if (debug) {
            console.log('Inline math rendered:', trimmedContent, '→', result);
          }
          return result;
        } catch (error) {
          console.error('Error rendering inline math:', mathContent, error);
          return match;
        }
      });
      
      setRenderedContent(rendered);
    } catch (error) {
      console.error('Error processing math content:', error);
      setRenderedContent(content);
    }
  }, [katex, content, isLoading, debug]);

  if (isLoading) {
    return (
      <div className={`${className} text-muted-foreground`}>
        {debug ? 'Loading KaTeX...' : 'Loading math...'}
      </div>
    );
  }

  // Determine if we should use span (inline) or div (block) based on className
  const isInline = className?.includes('inline');
  const Element = isInline ? 'span' : 'div';
  
  return (
    <Element 
      className={`math-renderer ${className}`}
      data-debug={debug}
      data-has-equations={hasEquations}
      dangerouslySetInnerHTML={{ 
        __html: renderedContent.replace(/\n/g, isInline ? ' ' : '<br>') 
      }}
      style={{
        // Ensure KaTeX styles are not overridden
        fontSize: 'inherit',
        lineHeight: 'inherit',
        display: isInline ? 'inline' : 'block'
      }}
    />
  );
} 