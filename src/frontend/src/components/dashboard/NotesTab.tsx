import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Principal } from "@dfinity/principal";
import {
  BookOpen,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Note } from "../../backend.d";
import {
  useCreateNote,
  useDeleteNote,
  useGetCapsuleNotes,
  useUpdateNote,
} from "../../hooks/useQueries";
import { formatTime } from "../../utils/crypto";

interface NotesTabProps {
  ownerPrincipal: Principal;
}

export default function NotesTab({ ownerPrincipal }: NotesTabProps) {
  const { data: notes = [], isLoading } = useGetCapsuleNotes(ownerPrincipal);
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();
  const deleteNote = useDeleteNote();

  const [addOpen, setAddOpen] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [viewNote, setViewNote] = useState<Note | null>(null);
  const [form, setForm] = useState({ title: "", body: "" });

  const resetForm = () => setForm({ title: "", body: "" });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    try {
      await createNote.mutateAsync({ title: form.title, body: form.body });
      toast.success("Note saved to your capsule");
      setAddOpen(false);
      resetForm();
    } catch {
      toast.error("Failed to save note");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editNote || !form.title.trim()) return;
    try {
      await updateNote.mutateAsync({
        noteId: editNote.id,
        title: form.title,
        body: form.body,
      });
      toast.success("Note updated");
      setEditNote(null);
      resetForm();
    } catch {
      toast.error("Failed to update note");
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote.mutateAsync(noteId);
      toast.success("Note removed");
    } catch {
      toast.error("Failed to delete note");
    }
  };

  const openEdit = (note: Note) => {
    setEditNote(note);
    setForm({ title: note.title, body: note.body });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Notes & Letters
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Write messages, letters, or instructions for your loved ones.
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setAddOpen(true);
          }}
          data-ocid="notes.add_button"
          className="gap-2 bg-gradient-sky border-0 text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Note
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton
              key={i}
              className="h-40 rounded-xl"
              data-ocid="notes.loading_state"
            />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && notes.length === 0 && (
        <motion.div
          className="flex flex-col items-center justify-center py-20 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          data-ocid="notes.empty_state"
        >
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: "oklch(0.67 0.18 230 / 0.1)" }}
          >
            <BookOpen
              className="w-7 h-7"
              style={{ color: "oklch(0.67 0.18 230)" }}
            />
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">
            No notes yet
          </h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Write your first note — a letter, a memory, words of wisdom, or
            final instructions.
          </p>
        </motion.div>
      )}

      {/* Notes grid */}
      {!isLoading && notes.length > 0 && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.06 } },
          }}
        >
          {notes.map((note, idx) => (
            <motion.div
              key={note.id}
              variants={{
                hidden: { opacity: 0, y: 12 },
                visible: { opacity: 1, y: 0 },
              }}
              className="capsule-card p-5 flex flex-col gap-3 cursor-pointer"
              onClick={() => setViewNote(note)}
              data-ocid={`notes.item.${idx + 1}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: "oklch(0.67 0.18 230)" }}
                  />
                  <h3 className="font-display font-semibold text-foreground text-sm truncate">
                    {note.title}
                  </h3>
                </div>
                {/* biome-ignore lint/a11y/useSemanticElements: grouping action buttons without semantic role */}
                <div
                  className="flex items-center gap-1 flex-shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEdit(note);
                    }}
                    data-ocid={`notes.edit_button.${idx + 1}`}
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => e.stopPropagation()}
                        data-ocid={`notes.delete_button.${idx + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this note?</AlertDialogTitle>
                        <AlertDialogDescription>
                          "{note.title}" will be permanently removed from your
                          capsule.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-ocid="notes.cancel_button">
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(note.id)}
                          data-ocid="notes.confirm_button"
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-3 flex-1 leading-relaxed">
                {note.body || <em className="opacity-60">No content</em>}
              </p>

              <p className="text-xs text-muted-foreground/60">
                Updated {formatTime(note.updatedAt)}
              </p>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add Note Dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-w-lg" data-ocid="notes.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">New Note</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="note-title">Title</Label>
              <Input
                id="note-title"
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
                placeholder="e.g. Letter to my children"
                data-ocid="notes.input"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note-body">Message</Label>
              <Textarea
                id="note-body"
                value={form.body}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
                placeholder="Write your message here..."
                className="min-h-[180px] resize-none"
                data-ocid="notes.textarea"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
                data-ocid="notes.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createNote.isPending || !form.title.trim()}
                data-ocid="notes.save_button"
                className="bg-gradient-sky border-0 text-white hover:opacity-90 transition-opacity"
              >
                {createNote.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Note"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog
        open={!!editNote}
        onOpenChange={(open) => {
          if (!open) {
            setEditNote(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-lg" data-ocid="notes.edit_dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Note</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({ ...f, title: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={form.body}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
                className="min-h-[180px] resize-none"
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setEditNote(null);
                  resetForm();
                }}
                data-ocid="notes.cancel_button"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateNote.isPending || !form.title.trim()}
                data-ocid="notes.save_button"
                className="bg-gradient-sky border-0 text-white hover:opacity-90 transition-opacity"
              >
                {updateNote.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Note Dialog */}
      <Dialog
        open={!!viewNote}
        onOpenChange={(open) => {
          if (!open) setViewNote(null);
        }}
      >
        <DialogContent className="max-w-lg" data-ocid="notes.view_dialog">
          {viewNote && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">
                  {viewNote.title}
                </DialogTitle>
                <p className="text-xs text-muted-foreground">
                  Last updated {formatTime(viewNote.updatedAt)}
                </p>
              </DialogHeader>
              <div className="py-2 max-h-[60vh] overflow-y-auto">
                <p className="text-foreground leading-relaxed whitespace-pre-wrap font-body text-sm">
                  {viewNote.body || (
                    <em className="text-muted-foreground">No content</em>
                  )}
                </p>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewNote(null);
                    openEdit(viewNote);
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setViewNote(null)}
                  data-ocid="notes.close_button"
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
