import * as React from "react";
import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const Sheet = Dialog.Root;
const SheetTrigger = Dialog.Trigger;
const SheetClose = Dialog.Close;
const SheetPortal = Dialog.Portal;

function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Overlay>) {
  return (
    <Dialog.Overlay
      className={cn(
        "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out",
        className,
      )}
      {...props}
    />
  );
}

interface SheetContentProps extends React.ComponentProps<typeof Dialog.Content> {
  // Determina desde qué borde entra/sale el panel — cada lado necesita su
  // propia animación de deslizamiento (no se pueden mezclar por className).
  side?: "left" | "right";
}

function SheetContent({
  className,
  side = "right",
  children,
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <Dialog.Content
        className={cn(
          "fixed inset-y-0 z-50 flex h-full w-3/4 max-w-sm flex-col gap-4 bg-white p-6 shadow-lg",
          side === "right"
            ? "right-0 border-l border-black/10 data-[state=open]:animate-sheet-in-right data-[state=closed]:animate-sheet-out-right"
            : "left-0 border-r border-black/10 data-[state=open]:animate-sheet-in-left data-[state=closed]:animate-sheet-out-left",
          className,
        )}
        {...props}
      >
        {children}
        <Dialog.Close className="absolute right-4 top-4 rounded-full p-1 text-text-muted transition-colors hover:bg-bg-muted">
          <X className="size-5" />
          <span className="sr-only">Cerrar</span>
        </Dialog.Close>
      </Dialog.Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props} />
  );
}

function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Title>) {
  return (
    <Dialog.Title
      className={cn("font-heading text-lg font-semibold text-primary", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
};
