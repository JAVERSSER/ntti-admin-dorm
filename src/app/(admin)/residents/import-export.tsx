"use client";

import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Download, Upload } from "lucide-react";
import { Button, buttonClasses } from "@/components/ui/button";
import { useAction } from "@/components/ui/use-action";
import { useToast } from "@/components/ui/toast";
import { parseCsv } from "@/lib/csv";
import { RESIDENT_COLUMNS, checkResidentHeader } from "@/lib/resident-csv";
import { importResidents } from "./actions";

export function ExportButton() {
  const params = useSearchParams();
  const sp = new URLSearchParams(params.toString());
  sp.delete("page");
  return (
    <a href={`/residents/export${sp.size ? `?${sp}` : ""}`} className={buttonClasses("secondary")} download>
      <Download className="h-4 w-4" /> Export
    </a>
  );
}

export function UploadButton() {
  const input = useRef<HTMLInputElement>(null);
  const { run, pending } = useAction(importResidents);
  const toast = useToast();

  async function upload(file: File) {
    if (!/\.csv$/i.test(file.name)) {
      toast.error(
        /\.xlsx?$/i.test(file.name)
          ? "File not supported: Excel files can't be uploaded. In Excel choose File → Save As → “CSV UTF-8”, then upload that."
          : "File not supported: upload a .csv file in the same format as Export.",
      );
      return;
    }
    // Only the first line is needed to check the columns.
    const firstLine = parseCsv((await file.slice(0, 4096).text()).split(/\r?\n/)[0] ?? "")[0] ?? [];
    const headerError = checkResidentHeader(firstLine);
    if (headerError) {
      toast.error(headerError);
      return;
    }
    const fd = new FormData();
    fd.set("file", file);
    run(fd);
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void upload(file);
        }}
      />
      <Button
        variant="secondary"
        loading={pending}
        onClick={() => input.current?.click()}
        title={`CSV in the Export format. Columns: ${RESIDENT_COLUMNS.join(", ")}`}
      >
        <Upload className="h-4 w-4" /> Upload
      </Button>
    </>
  );
}
