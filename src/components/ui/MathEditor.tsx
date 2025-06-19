"use client";

import { useState, useEffect, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Eye, EyeOff, Calculator, Type, Plus } from "lucide-react";
import 'katex/dist/katex.min.css';

interface MathEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function MathEditor({ value, onChange, placeholder, className }: MathEditorProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [activeTab, setActiveTab] = useState<"text" | "math">("text");
  const [katex, setKatex] = useState<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load KaTeX dynamically
  useEffect(() => {
    const loadKatex = async () => {
      try {
        const katexModule = await import('katex');
        setKatex(katexModule.default);
      } catch (error) {
        console.error('Failed to load KaTeX:', error);
      }
    };
    loadKatex();
  }, []);

  // Render KaTeX
  const renderMath = (text: string) => {
    if (!katex) return text;
    
    try {
      // Replace LaTeX math delimiters with rendered math
      return text.replace(/\$\$(.*?)\$\$/g, (match, mathContent) => {
        try {
          return katex.renderToString(mathContent.trim(), {
            displayMode: true,
            throwOnError: false
          });
        } catch {
          return match;
        }
      }).replace(/\$(.*?)\$/g, (match, mathContent) => {
        try {
          return katex.renderToString(mathContent.trim(), {
            displayMode: false,
            throwOnError: false
          });
        } catch {
          return match;
        }
      });
    } catch {
      return text;
    }
  };

  // Insert text at cursor position
  const insertAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      // Fallback
      onChange(value + textToInsert);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const newValue = value.substring(0, start) + textToInsert + value.substring(end);
    
    onChange(newValue);
    
    // Set cursor position after insertion
    setTimeout(() => {
      const cursorPos = start + textToInsert.length;
      try {
        textarea.setSelectionRange(cursorPos, cursorPos);
        textarea.focus();
      } catch (error) {
        console.log('Could not set cursor position:', error);
      }
    }, 10);
  };

  // Insert math template
  const insertMathTemplate = (template: string) => {
    insertAtCursor(template);
  };

  // Insert inline math wrapper
  const insertInlineMath = () => {
    insertAtCursor('$  $');
    // Set cursor between the dollar signs
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const cursorPos = textarea.selectionStart - 2;
        textarea.setSelectionRange(cursorPos, cursorPos);
        textarea.focus();
      }
    }, 10);
  };

  // Insert block math wrapper
  const insertBlockMath = () => {
    insertAtCursor('$$  $$');
    // Set cursor between the dollar signs
    setTimeout(() => {
      const textarea = textareaRef.current;
      if (textarea) {
        const cursorPos = textarea.selectionStart - 3;
        textarea.setSelectionRange(cursorPos, cursorPos);
        textarea.focus();
      }
    }, 10);
  };

  const mathTemplates = [
    { name: "Pecahan", template: "\\frac{a}{b}" },
    { name: "Akar", template: "\\sqrt{x}" },
    { name: "Pangkat", template: "x^{n}" },
    { name: "Subscript", template: "x_{i}" },
    { name: "Integral", template: "\\int_{a}^{b} f(x) dx" },
    { name: "Sigma", template: "\\sum_{n=1}^{\\infty} a_n" },
    { name: "Limit", template: "\\lim_{x \\to a} f(x)" },
    { name: "Matriks", template: "\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}" },
    { name: "Alpha", template: "\\alpha" },
    { name: "Beta", template: "\\beta" },
    { name: "Pi", template: "\\pi" },
    { name: "≠", template: "\\neq" },
    { name: "≥", template: "\\geq" },
    { name: "≤", template: "\\leq" },
  ];

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "text" | "math")}>
        <div className="flex items-center justify-between mb-2">
          <TabsList className="grid w-[200px] grid-cols-2">
            <TabsTrigger value="text" className="flex items-center gap-1">
              <Type className="h-3 w-3" />
              Tulis
            </TabsTrigger>
            <TabsTrigger value="math" className="flex items-center gap-1">
              <Calculator className="h-3 w-3" />
              Math
            </TabsTrigger>
          </TabsList>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-1"
          >
            {showPreview ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            {showPreview ? "Sembunyikan" : "Preview"}
          </Button>
        </div>

        <TabsContent value="text" className="mt-0">
          <div className="space-y-3">
            {/* Quick Math Insert Buttons */}
            <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg">
              <span className="text-xs font-medium text-muted-foreground mr-2">Sisipkan Math:</span>
              <Button
                variant="outline"
                size="sm"
                onClick={insertInlineMath}
                className="text-xs h-6 px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Inline Math
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={insertBlockMath}
                className="text-xs h-6 px-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Block Math
              </Button>
            </div>

            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder={placeholder || "Tulis jawaban Anda di sini... \n\nContoh: Jadi hasil dari $x^2 + 2x + 1$ adalah $(x+1)^2$"}
              className="min-h-[120px]"
            />
            
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong>Tips:</strong></p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Tulis teks biasa seperti biasa</li>
                <li>Gunakan <code>$rumus$</code> untuk equation inline: Contoh $x^2$</li>
                <li>Gunakan <code>$$rumus$$</code> untuk equation block:</li>
              </ul>
              <div className="ml-4 text-xs bg-muted p-2 rounded">
                $$x = 2a + b$$
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="math" className="mt-0">
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-800 mb-2">Template Matematika</p>
              <p className="text-xs text-blue-700">Klik template di bawah untuk menyisipkan rumus matematika ke dalam jawaban Anda</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {mathTemplates.map((template) => (
                <Button
                  key={template.name}
                  variant="outline"
                  size="sm"
                  onClick={() => insertMathTemplate(template.template)}
                  className="text-xs h-auto py-2 px-3 hover:bg-blue-50"
                >
                  {template.name}
                </Button>
              ))}
            </div>
            
            <Textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Tulis jawaban dengan rumus matematika... \n\nContoh: Untuk menyelesaikan persamaan kuadrat $ax^2 + bx + c = 0$, kita dapat menggunakan rumus: $$x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$$"
              className="min-h-[120px]"
            />
            
            <div className="text-xs text-muted-foreground">
              <p><strong>Cara menggunakan template:</strong></p>
              <ol className="list-decimal list-inside space-y-1 ml-2 mt-1">
                <li>Klik template yang diinginkan</li>
                <li>Template akan disisipkan di posisi kursor</li>
                <li>Edit bagian huruf (a, b, x, dll.) sesuai kebutuhan</li>
                <li>Gabungkan dengan teks biasa sesuai keinginan</li>
              </ol>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {showPreview && value && (
        <Card className="mt-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview Jawaban
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div 
              className="prose max-w-none text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ 
                __html: renderMath(value.replace(/\n/g, '<br>')) 
              }}
            />
          </CardContent>
        </Card>
      )}

      <div className="mt-2">
        <div className="flex flex-wrap gap-1">
          <Badge variant="secondary" className="text-xs">
            Contoh inline: $x^2 + 1$
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Contoh block: $$x = 2$$
          </Badge>
          <Badge variant="secondary" className="text-xs">
            Simbol: \alpha, \beta, \pi
          </Badge>
        </div>
      </div>
    </div>
  );
} 