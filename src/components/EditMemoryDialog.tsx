import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORIES } from "@/lib/categories";
import type { MemoryRow } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";

export function EditMemoryDialog({
  memory,
  open,
  onOpenChange,
}: {
  memory: MemoryRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(memory.title);
  const [description, setDescription] = useState(memory.description ?? "");
  const [category, setCategory] = useState(memory.category);
  const [organization, setOrganization] = useState(memory.organization ?? "");
  const [location, setLocation] = useState(memory.location ?? "");
  const [topics, setTopics] = useState((memory.topics ?? []).join(", "));
  const [startDate, setStartDate] = useState(memory.start_date ?? "");
  const [endDate, setEndDate] = useState(memory.end_date ?? "");
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const { error } = await supabase
      .from("memories")
      .update({
        title: title.trim() || memory.title,
        description: description.trim() || null,
        category,
        organization: organization.trim() || null,
        location: location.trim() || null,
        topics: topics
          .split(",")
          .map((topic) => topic.trim())
          .filter(Boolean),
        start_date: startDate || null,
        end_date: endDate || null,
        date_unknown: !startDate,
      })
      .eq("id", memory.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Memory updated");
    await queryClient.invalidateQueries();
    onOpenChange(false);
  }

  async function remove() {
    setBusy(true);
    const { error } = await supabase.from("memories").delete().eq("id", memory.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Memory deleted");
    await queryClient.invalidateQueries();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit memory</DialogTitle>
          <DialogDescription>Correct anything the AI got wrong.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={3}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                value={organization}
                onChange={(event) => setOrganization(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start">Start date</Label>
              <Input
                id="start"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end">End date</Label>
              <Input
                id="end"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Place</Label>
              <Input
                id="location"
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="topics">Topics</Label>
              <Input
                id="topics"
                value={topics}
                onChange={(event) => setTopics(event.target.value)}
                placeholder="React, Node.js"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="destructive" onClick={remove} disabled={busy}>
            Delete memory
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy && <Loader2 className="mr-2 size-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
