"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Plus, Loader2, Upload, X, FileText } from "lucide-react";
import { toast } from "sonner";
import { nameField, optionalLongTextField, FIELD_MAX } from "@/lib/field-validation";

const ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;
const ATTACHMENT_ACCEPT = "image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx";

const schema = z.object({
  classId: z.string().min(1, "Class is required"),
  sectionId: z.string().optional(),
  subjectId: z.string().optional(),
  title: nameField("Title", FIELD_MAX.title),
  description: optionalLongTextField("Description"),
  dueDate: z.string().optional(),
  attachmentUrl: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ClassOption { id: string; name: string; sections: { id: string; name: string }[] }
interface SubjectOption { id: string; name: string; classId: string }

interface Props {
  classes: ClassOption[];
  subjects: SubjectOption[];
}

export function CreateHomeworkDialog({ classes, subjects }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const classId = watch("classId");
  const selectedClass = classes.find((c) => c.id === classId);
  const classSubjects = subjects.filter((s) => s.classId === classId);
  const attachmentUrl = watch("attachmentUrl");

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > ATTACHMENT_MAX_BYTES) {
      toast.error("Attachment is too large. Maximum size is 5 MB.");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setValue("attachmentUrl", reader.result as string);
      setAttachmentName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const removeAttachment = () => {
    setValue("attachmentUrl", "");
    setAttachmentName(null);
  };

  const onSubmit = async (data: FormValues) => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/homework", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Failed to add homework");
        return;
      }
      toast.success("Homework assigned successfully");
      reset();
      setAttachmentName(null);
      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { reset(); setAttachmentName(null); } }}>
      <DialogTrigger render={<Button className="bg-indigo-600 hover:bg-indigo-700" />}>
        <Plus className="w-4 h-4 mr-2" /> Add Homework
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Add New Homework</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input placeholder="Chapter 4 worksheet" maxLength={FIELD_MAX.title} {...register("title")} />
            {errors.title && <p className="text-xs text-red-500">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Class *</Label>
              <Select
                value={watch("classId") ?? ""}
                onValueChange={(v) => { if (v == null) return; setValue("classId", v, { shouldValidate: true }); setValue("sectionId", undefined); setValue("subjectId", undefined); }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select class">
                    {(value: string) => classes.find((c) => c.id === value)?.name ?? "Select class"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              {errors.classId && <p className="text-xs text-red-500">{errors.classId.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label>Section</Label>
              <Select
                value={watch("sectionId") ?? ""}
                onValueChange={(v) => { if (v == null) return; setValue("sectionId", v); }}
                disabled={!selectedClass?.sections.length}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="All sections">
                    {(value: string) => {
                      const section = selectedClass?.sections.find((s) => s.id === value);
                      return section ? `Section ${section.name}` : "All sections";
                    }}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {selectedClass?.sections.map((s) => <SelectItem key={s.id} value={s.id}>Section {s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Select
                value={watch("subjectId") ?? ""}
                onValueChange={(v) => { if (v == null) return; setValue("subjectId", v); }}
                disabled={!classSubjects.length}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No subject">
                    {(value: string) => classSubjects.find((s) => s.id === value)?.name ?? "No subject"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Due Date</Label>
              <DatePicker value={watch("dueDate")} onChange={(v) => setValue("dueDate", v)} placeholder="Select due date" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} placeholder="Instructions for students" maxLength={FIELD_MAX.longText} {...register("description")} />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label>Attachment</Label>
            {attachmentUrl ? (
              <div className="flex items-center gap-3 rounded-lg border bg-gray-50 px-3 py-2">
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700 truncate flex-1">{attachmentName ?? "Attached file"}</span>
                <Button type="button" variant="ghost" size="sm" onClick={removeAttachment}>
                  <X className="w-3.5 h-3.5 mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <div>
                <Button type="button" variant="outline" nativeButton={false} render={<label className="cursor-pointer" />}>
                  <Upload className="w-4 h-4 mr-1.5" /> Upload Document
                  <input type="file" accept={ATTACHMENT_ACCEPT} className="hidden" onChange={handleAttachmentChange} />
                </Button>
                <p className="text-xs text-gray-400 mt-1">Optional. PDF, Word, Excel, PPT or image, up to 5 MB.</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" className="bg-indigo-600 hover:bg-indigo-700" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Add Homework
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
