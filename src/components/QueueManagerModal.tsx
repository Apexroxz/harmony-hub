import { useState } from "react";
import { ListMusic, Plus, Trash2, Check, Music2 } from "lucide-react";
import { usePlayer } from "@/lib/player";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function QueueManagerModal() {
  const [open, setOpen] = useState(false);
  const { queues, activeQueueName, switchQueue, createQueue, deleteQueue } = usePlayer();
  const [newQueueName, setNewQueueName] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueueName.trim()) return;
    createQueue(newQueueName.trim());
    switchQueue(newQueueName.trim());
    setNewQueueName("");
  };

  const queueNames = Object.keys(queues);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 border-primary/30 bg-primary/10 text-xs font-semibold text-primary hover:bg-primary/20 cursor-pointer"
        >
          <ListMusic className="h-3.5 w-3.5" />
          <span>Queue Manager</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md rounded-3xl border-border/60 bg-background/95 p-6 backdrop-blur-2xl sm:max-w-lg">
        <DialogHeader className="mb-4">
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-foreground">
            <ListMusic className="h-5 w-5 text-primary" />
            <span>Multi-Queue Manager</span>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Switch between independent playing queues without losing current playback state.
          </p>
        </DialogHeader>

        {/* Create Queue Form */}
        <form onSubmit={handleCreate} className="mb-5 flex items-center gap-2">
          <Input
            value={newQueueName}
            onChange={(e) => setNewQueueName(e.target.value)}
            placeholder="New queue name (e.g. Workout Queue)"
            className="rounded-xl border-border/60 bg-surface-raised text-xs"
          />
          <Button
            type="submit"
            size="sm"
            className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold shrink-0"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Create
          </Button>
        </form>

        {/* Queue List */}
        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {queueNames.map((name) => {
            const isActive = activeQueueName === name;
            const count = queues[name]?.length || 0;

            return (
              <div
                key={name}
                className={cn(
                  "flex items-center justify-between rounded-2xl border p-4 transition-all",
                  isActive
                    ? "border-primary/50 bg-primary/10 shadow-[0_0_20px_var(--color-glow-soft)]"
                    : "border-border/60 bg-surface-raised hover:bg-card"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl",
                      isActive ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground"
                    )}
                  >
                    <Music2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-sm truncate">{name}</span>
                      {isActive && (
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold text-primary">
                          Active Queue
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{count} Track(s)</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isActive && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => switchQueue(name)}
                      className="h-8 text-xs border-border/60"
                    >
                      <Check className="mr-1 h-3.5 w-3.5 text-primary" />
                      Switch
                    </Button>
                  )}

                  {name !== "Main Queue" && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteQueue(name)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
