import { ComponentProps } from "react"
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left"
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-4", className)}
      classNames={{
        // V9 class names for react-day-picker
        root: "rdp-root w-[280px] min-h-[350px]",
        months: "flex flex-col sm:flex-row gap-4 w-full h-full",
        month: "flex flex-col gap-4 relative pt-2 w-full h-full",
        month_caption: "flex justify-center pt-1 relative items-center h-10",
        caption_label: "text-base font-semibold",
        nav: "flex items-center justify-between absolute inset-x-0 top-3 max-w-[255px] mx-auto",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-10 bg-transparent p-0 opacity-70 hover:opacity-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-10 bg-transparent p-0 opacity-70 hover:opacity-100"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-muted-foreground rounded-md w-10 font-medium text-sm text-center",
        week: "flex w-full mt-2",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "size-10 p-0 font-normal aria-selected:opacity-100 text-sm"
        ),
        day_button: "size-10 p-0 font-normal cursor-pointer text-sm",
        range_start:
          "day-range-start aria-selected:bg-primary aria-selected:text-primary-foreground",
        range_end:
          "day-range-end aria-selected:bg-primary aria-selected:text-primary-foreground",
        selected:
          "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-md",
        today: "bg-accent text-accent-foreground font-semibold",
        outside: "text-muted-foreground opacity-50",
        disabled: "text-muted-foreground opacity-50",
        range_middle:
          "aria-selected:bg-accent aria-selected:text-accent-foreground",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => {
          if (orientation === "left") {
            return <ChevronLeft className="size-6" />
          }
          return <ChevronRight className="size-6" />
        },
      }}
      {...props}
    />
  )
}

export { Calendar }
