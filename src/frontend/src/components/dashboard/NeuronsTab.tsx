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
  Brain,
  ChevronDown,
  ChevronUp,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  type NeuronEntryWithId,
  useCreateNeuronEntry,
  useDeleteNeuronEntry,
  useGetGlobalInstructions,
  useGetNeuronEntries,
  useSetGlobalInstructions,
  useUpdateNeuronEntry,
} from "../../hooks/useQueries";

interface NeuronsTabProps {
  ownerPrincipal: Principal;
}

interface NeuronFormData {
  neuronId: string;
  dissolveDate: string;
  designatedController: string;
  votingPreferences: string;
  notes: string;
}

const emptyForm: NeuronFormData = {
  neuronId: "",
  dissolveDate: "",
  designatedController: "",
  votingPreferences: "",
  notes: "",
};

function NeuronCard({
  entry,
  idx,
  onEdit,
  onDelete,
}: {
  entry: NeuronEntryWithId;
  idx: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      className="capsule-card p-5 space-y-3"
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0 },
      }}
      data-ocid={`neurons.item.${idx + 1}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "oklch(0.67 0.18 230 / 0.1)" }}
          >
            <Brain
              className="w-4 h-4"
              style={{ color: "oklch(0.67 0.18 230)" }}
            />
          </div>
          <div className="min-w-0">
            <p className="font-display font-semibold text-sm text-foreground">
              Neuron #{entry.neuronId}
            </p>
            {entry.dissolveDate && (
              <p className="text-xs text-muted-foreground">
                Dissolves: {entry.dissolveDate}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onEdit}
            data-ocid={`neurons.edit_button.${idx + 1}`}
          >
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                data-ocid={`neurons.delete_button.${idx + 1}`}
              >
                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Neuron Entry?</AlertDialogTitle>
                <AlertDialogDescription>
                  Neuron #{entry.neuronId} instructions will be removed
                  permanently.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-ocid="neurons.cancel_button">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  data-ocid="neurons.confirm_button"
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {expanded && (
        <motion.div
          className="space-y-2 pt-2 border-t border-border/50"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          {entry.designatedController && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                Designated Controller
              </p>
              <p className="text-sm font-mono text-foreground break-all">
                {entry.designatedController}
              </p>
            </div>
          )}
          {entry.votingPreferences && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                Voting Preferences
              </p>
              <p className="text-sm text-foreground">
                {entry.votingPreferences}
              </p>
            </div>
          )}
          {entry.notes && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">
                Additional Notes
              </p>
              <p className="text-sm text-foreground whitespace-pre-wrap">
                {entry.notes}
              </p>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}

export default function NeuronsTab({ ownerPrincipal }: NeuronsTabProps) {
  const { data: entries = [], isLoading: entriesLoading } =
    useGetNeuronEntries(ownerPrincipal);
  const { data: globalInstructions = "", isLoading: instructionsLoading } =
    useGetGlobalInstructions(ownerPrincipal);
  const setGlobalInstructions = useSetGlobalInstructions();
  const createEntry = useCreateNeuronEntry();
  const updateEntry = useUpdateNeuronEntry();
  const deleteEntry = useDeleteNeuronEntry();

  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<NeuronEntryWithId | null>(null);
  const [form, setForm] = useState<NeuronFormData>(emptyForm);
  const [globalText, setGlobalText] = useState("");
  const [globalDirty, setGlobalDirty] = useState(false);

  // Initialize global text when loaded
  useEffect(() => {
    if (globalInstructions) {
      setGlobalText(globalInstructions);
    }
  }, [globalInstructions]);

  const handleSaveGlobal = async () => {
    try {
      await setGlobalInstructions.mutateAsync(globalText);
      setGlobalDirty(false);
      toast.success("Global instructions saved");
    } catch {
      toast.error("Failed to save instructions");
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.neuronId.trim()) return;
    try {
      await createEntry.mutateAsync(form);
      toast.success("Neuron entry added");
      setAddOpen(false);
      setForm(emptyForm);
    } catch {
      toast.error("Failed to add neuron entry");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editEntry || !form.neuronId.trim()) return;
    try {
      await updateEntry.mutateAsync({ entryId: editEntry.id ?? "", ...form });
      toast.success("Neuron entry updated");
      setEditEntry(null);
      setForm(emptyForm);
    } catch {
      toast.error("Failed to update entry");
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      await deleteEntry.mutateAsync(entryId);
      toast.success("Neuron entry removed");
    } catch {
      toast.error("Failed to delete entry");
    }
  };

  const openEdit = (entry: NeuronEntryWithId) => {
    setEditEntry(entry);
    setForm({
      neuronId: entry.neuronId,
      dissolveDate: entry.dissolveDate,
      designatedController: entry.designatedController,
      votingPreferences: entry.votingPreferences,
      notes: entry.notes,
    });
  };

  const NeuronForm = ({
    onSubmit,
    isPending,
    submitLabel,
  }: {
    onSubmit: (e: React.FormEvent) => void;
    isPending: boolean;
    submitLabel: string;
  }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Neuron ID *</Label>
          <Input
            value={form.neuronId}
            onChange={(e) =>
              setForm((f) => ({ ...f, neuronId: e.target.value }))
            }
            placeholder="e.g. 123456789"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Dissolve Date</Label>
          <Input
            type="date"
            value={form.dissolveDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, dissolveDate: e.target.value }))
            }
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Designated Controller Principal</Label>
        <Input
          value={form.designatedController}
          onChange={(e) =>
            setForm((f) => ({ ...f, designatedController: e.target.value }))
          }
          placeholder="Principal ID of who should control this neuron"
          className="font-mono text-sm"
        />
      </div>
      <div className="space-y-2">
        <Label>Voting Preferences</Label>
        <Input
          value={form.votingPreferences}
          onChange={(e) =>
            setForm((f) => ({ ...f, votingPreferences: e.target.value }))
          }
          placeholder="e.g. Follow ICA, vote manually on governance proposals"
        />
      </div>
      <div className="space-y-2">
        <Label>Additional Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          placeholder="Any additional instructions for your loved ones..."
          className="min-h-[100px] resize-none"
          data-ocid="neurons.textarea"
        />
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setAddOpen(false);
            setEditEntry(null);
            setForm(emptyForm);
          }}
          data-ocid="neurons.cancel_button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isPending || !form.neuronId.trim()}
          data-ocid="neurons.save_button"
          className="bg-gradient-sky border-0 text-white hover:opacity-90 transition-opacity"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving...
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Neuron Instructions
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Guide your loved ones on managing your ICP neurons and voting
            rewards.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm);
            setAddOpen(true);
          }}
          data-ocid="neurons.add_button"
          className="gap-2 bg-gradient-sky border-0 text-white hover:opacity-90 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Neuron
        </Button>
      </div>

      {/* Global instructions */}
      <div className="capsule-card p-6 space-y-4">
        <div>
          <h3 className="font-display font-semibold text-foreground">
            General ICP & Inheritance Instructions
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Broader guidance for your loved ones — explain your overall ICP
            strategy, accounts, exchanges, hardware wallets, and any important
            context.
          </p>
        </div>
        {instructionsLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <Textarea
            value={globalText || globalInstructions || ""}
            onChange={(e) => {
              setGlobalText(e.target.value);
              setGlobalDirty(true);
            }}
            placeholder="e.g. I hold ICP in the NNS. My neurons are listed below. My seed phrase is stored in [location]..."
            className="min-h-[140px] resize-none font-body"
            data-ocid="neurons.editor"
          />
        )}
        {globalDirty && (
          <Button
            onClick={handleSaveGlobal}
            disabled={setGlobalInstructions.isPending}
            size="sm"
            className="gap-2 bg-gradient-sky border-0 text-white hover:opacity-90 transition-opacity"
          >
            {setGlobalInstructions.isPending ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                Save Instructions
              </>
            )}
          </Button>
        )}
      </div>

      {/* Neuron entries */}
      <div>
        <h3 className="font-display font-semibold text-foreground mb-4">
          Individual Neuron Entries
        </h3>

        {entriesLoading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Skeleton
                key={i}
                className="h-20 rounded-xl"
                data-ocid="neurons.loading_state"
              />
            ))}
          </div>
        )}

        {!entriesLoading && entries.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-14 text-center"
            data-ocid="neurons.empty_state"
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3"
              style={{ background: "oklch(0.67 0.18 230 / 0.1)" }}
            >
              <Brain
                className="w-6 h-6"
                style={{ color: "oklch(0.67 0.18 230)" }}
              />
            </div>
            <p className="font-display font-semibold text-foreground mb-1">
              No neuron entries
            </p>
            <p className="text-muted-foreground text-sm max-w-xs">
              Add entries for each neuron you want to leave instructions for.
            </p>
          </div>
        )}

        {!entriesLoading && entries.length > 0 && (
          <motion.div
            className="space-y-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.06 } },
            }}
          >
            {entries.map((entry, idx) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: neuronId may not be unique across edits
              <NeuronCard
                key={`${entry.neuronId}-${idx}`}
                entry={entry}
                idx={idx}
                onEdit={() => openEdit(entry)}
                onDelete={() => handleDelete(entry.id ?? "")}
              />
            ))}
          </motion.div>
        )}
      </div>

      {/* Add Dialog */}
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setForm(emptyForm);
        }}
      >
        <DialogContent className="max-w-lg" data-ocid="neurons.dialog">
          <DialogHeader>
            <DialogTitle className="font-display">Add Neuron Entry</DialogTitle>
          </DialogHeader>
          <NeuronForm
            onSubmit={handleAdd}
            isPending={createEntry.isPending}
            submitLabel="Add Entry"
          />
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editEntry}
        onOpenChange={(open) => {
          if (!open) {
            setEditEntry(null);
            setForm(emptyForm);
          }
        }}
      >
        <DialogContent className="max-w-lg" data-ocid="neurons.edit_dialog">
          <DialogHeader>
            <DialogTitle className="font-display">
              Edit Neuron Entry
            </DialogTitle>
          </DialogHeader>
          <NeuronForm
            onSubmit={handleEdit}
            isPending={updateEntry.isPending}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
