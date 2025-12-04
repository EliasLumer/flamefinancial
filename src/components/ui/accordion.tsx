import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const Accordion = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("space-y-2", className)} {...props} />
))
Accordion.displayName = "Accordion"

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value?: string }
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn("border rounded-lg overflow-hidden", className)} {...props} />
))
AccordionItem.displayName = "AccordionItem"

interface AccordionTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isOpen: boolean
  onToggle: () => void
  variant?: 'default' | 'success' | 'danger'
}

const AccordionTrigger = React.forwardRef<HTMLButtonElement, AccordionTriggerProps>(
  ({ className, children, isOpen, onToggle, variant = 'default', ...props }, ref) => {
    const variantStyles = {
      default: "hover:bg-zinc-800/50 data-[state=open]:bg-zinc-800/50",
      success: "hover:bg-green-950/30 data-[state=open]:bg-green-950/30",
      danger: "hover:bg-red-950/30 data-[state=open]:bg-red-950/30",
    }

    return (
      <div className="flex">
        <button
          ref={ref}
          onClick={onToggle}
          data-state={isOpen ? "open" : "closed"}
          className={cn(
            "flex flex-1 items-center justify-between py-4 px-4 font-medium transition-all text-left",
            variantStyles[variant],
            className
          )}
          {...props}
        >
          {children}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
      </div>
    )
  }
)
AccordionTrigger.displayName = "AccordionTrigger"

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { isOpen: boolean }
>(({ className, children, isOpen, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "overflow-hidden transition-all duration-300 ease-in-out",
      isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
    )}
    {...props}
  >
    <div className={cn("p-4 pt-0 text-sm text-zinc-400", className)}>{children}</div>
  </div>
))
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }

