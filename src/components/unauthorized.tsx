"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function Unauthorized() {
  const [show, setShow] = useState(false);
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const unauthorized = searchParams.get("unauthorized");
    setShow(unauthorized === "true");
  }, [searchParams]);
  
  if (!show) return null;
  
  return (
    <Alert variant="destructive" className="mb-6">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Akses Ditolak</AlertTitle>
      <AlertDescription>
        Anda tidak memiliki izin untuk mengakses halaman tersebut. Silakan hubungi administrator jika Anda yakin seharusnya memiliki akses.
      </AlertDescription>
    </Alert>
  );
} 