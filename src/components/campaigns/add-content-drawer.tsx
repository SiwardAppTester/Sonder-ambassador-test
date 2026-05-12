"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Drawer, DrawerBody, DrawerFooter, DrawerHeader } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { FileDrop, type FileDropPick } from "@/components/ui/file-drop";
import { HashtagInput } from "@/components/ui/hashtag-input";
import { useUploadCampaignContent } from "@/hooks/use-campaign-contents";

/**
 * Stage-2 of the campaign creation flow: add a piece of content. Per the
 * brief, "save adds the content and clears the drawer for the next one"
 * — so on success we reset the form fields rather than closing.
 *
 * In the demo, the file's preview URL is used directly as the stored
 * `fileUrl` / `thumbnailUrl`. When grafted to the real app, replace the
 * `mutationFn` body in `useUploadCampaignContent` with a call to
 * `createSignedUpload()` followed by a PUT to the signed URL.
 */
export function AddContentDrawer({
  open,
  onClose,
  campaignId,
}: {
  open: boolean;
  onClose: () => void;
  campaignId: string;
}) {
  const upload = useUploadCampaignContent();

  const [file, setFile] = useState<FileDropPick | null>(null);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);

  function reset() {
    setFile(null);
    setCaption("");
    setHashtags([]);
    setInstructions("");
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) return setError("Pick a file first.");

    try {
      await upload.mutateAsync({
        campaignId,
        file: file.file,
        captionTemplate: caption.trim() || null,
        hashtags,
        instructions: instructions.trim() || null,
      });
      // Brief: "save adds the content and clears the drawer for the next one".
      reset();
      setSavedFlash(`${file.type === "video" ? "Video" : "Image"} added.`);
      setTimeout(() => setSavedFlash(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add content");
    }
  }

  return (
    <Drawer open={open} onClose={onClose} ariaLabel="Add content" size="md">
      <DrawerHeader
        title="Add content"
        description="Upload a single piece of content. Save and keep adding for the next one."
      />
      <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
        <DrawerBody>
          <div className="space-y-5">
            <div>
              <Label className="mb-1.5 block">File</Label>
              <FileDrop value={file} onChange={setFile} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="caption">Caption template</Label>
              <Textarea
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Suggested copy for ambassadors. Optional."
              />
            </div>

            <div className="space-y-1.5">
              <Label>Hashtags</Label>
              <HashtagInput value={hashtags} onChange={setHashtags} />
              <p className="text-[11px] text-muted-foreground">
                Press Enter or comma to add. Backspace removes the last chip.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="instructions">Instructions</Label>
              <Textarea
                id="instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Anything ambassadors need to know — placement, tags, dos/don'ts. Optional."
              />
            </div>

            {error ? (
              <p className="text-sm text-status-danger" role="alert">
                {error}
              </p>
            ) : null}
            {savedFlash ? (
              <p className="text-sm text-status-positive" role="status">
                {savedFlash}
              </p>
            ) : null}
          </div>
        </DrawerBody>
        <DrawerFooter>
          <Button type="button" variant="ghost" onClick={onClose} disabled={upload.isPending}>
            Done
          </Button>
          <Button type="submit" disabled={upload.isPending}>
            {upload.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Add content
          </Button>
        </DrawerFooter>
      </form>
    </Drawer>
  );
}
