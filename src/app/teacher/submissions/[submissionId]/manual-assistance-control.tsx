"use client";

import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";

interface ManualAssistanceControlProps {
  studentId: string;
  quizId: string;
  submissionId: string;
  initialOverride?: boolean;
  initialLevel?: string | null;
}

export default function ManualAssistanceControl({
  studentId,
  quizId,

  initialOverride = false,
  initialLevel = null
}: ManualAssistanceControlProps) {
  const [overrideSystem, setOverrideSystem] = useState<boolean>(initialOverride);
  const [assistanceLevel, setAssistanceLevel] = useState<string>(initialLevel || "NONE");
  const [saving, setSaving] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  
  useEffect(() => {
    // Load current settings if not passed in props
    const loadSettings = async () => {
      if (!initialOverride && !initialLevel) {
        setLoading(true);
        try {
          // Bisa ditambahkan API untuk mendapatkan pengaturan saat ini jika diperlukan
          setLoading(false);
        } catch (error) {
          console.error("Error loading settings:", error);
          setLoading(false);
        }
      }
    };
    
    loadSettings();
  }, [initialOverride, initialLevel]);
  
  const handleSaveOverride = async () => {
    setSaving(true);
    
    try {
      const response = await fetch('/api/teacher/override-assistance-level', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          studentId,
          quizId,
          overrideSystemFlow: overrideSystem,
          manuallyAssignedLevel: overrideSystem ? assistanceLevel : null
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success("Pengaturan alur pembelajaran berhasil disimpan");
      } else {
        toast.error(data.message || "Gagal menyimpan pengaturan");
      }
    } catch (error) {
      console.error("Error saving override:", error);
      toast.error("Terjadi kesalahan saat menyimpan pengaturan");
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <div className="p-4 border rounded">Memuat pengaturan...</div>;
  }
  
  return (
    <Card className="border-amber-200 bg-amber-50/30">
      <CardHeader>
        <CardTitle className="text-amber-800">Kontrol Alur Pembelajaran Manual</CardTitle>
        <CardDescription className="text-amber-700">
          Atur akses siswa ke kuis utama atau bantuan tertentu
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="flex items-center space-x-2">
            <Switch 
              id="override-system"
              checked={overrideSystem} 
              onCheckedChange={setOverrideSystem}
            />
            <Label htmlFor="override-system" className="font-medium">
              Override alur otomatis sistem
            </Label>
          </div>
          
          <div className={overrideSystem ? "opacity-100" : "opacity-50 pointer-events-none"}>
            <Label className="block mb-2 font-medium">Tetapkan Level Bantuan:</Label>
            <RadioGroup value={assistanceLevel} onValueChange={setAssistanceLevel} className="space-y-2">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="NONE" id="none" />
                <Label htmlFor="none">Kuis Utama</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ASSISTANCE_LEVEL1" id="level1" />
                <Label htmlFor="level1">Bantuan Level 1</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ASSISTANCE_LEVEL2" id="level2" />
                <Label htmlFor="level2">Bantuan Level 2</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ASSISTANCE_LEVEL3" id="level3" />
                <Label htmlFor="level3">Bantuan Level 3</Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSaveOverride}
          disabled={saving}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {saving ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </CardFooter>
    </Card>
  );
} 