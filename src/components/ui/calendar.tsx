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
      className={cn("p-5", className)}
      classNames={{
        // V9 class names for react-day-picker
        root: "rdp-root w-[320px] min-h-[400px]",
        months: "flex flex-col sm:flex-row gap-4 w-full h-full",
        month: "flex flex-col gap-4 relative pt-2 w-full h-full",
        month_caption: "flex justify-center pt-1 relative items-center h-12",
        caption_label: "text-lg font-bold text-gray-900",
        nav: "flex items-center justify-between absolute inset-x-0 top-3 max-w-[290px] mx-auto",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "size-11 bg-transparent p-0 opacity-80 hover:opacity-100"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "size-11 bg-transparent p-0 opacity-80 hover:opacity-100"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "text-gray-600 rounded-md w-11 font-semibold text-sm text-center",
        week: "flex w-full mt-2",
        day: cn(
          buttonVariants({ variant: "ghost" }),
          "size-11 p-0 font-medium aria-selected:opacity-100 text-sm text-gray-800"
        ),
        day_button: "size-11 p-0 font-medium cursor-pointer text-sm text-gray-800",
        range_start:
          "day-range-start aria-selected:bg-blue-600 aria-selected:text-white",
        range_end:
          "day-range-end aria-selected:bg-blue-600 aria-selected:text-white",
        selected:
          "bg-blue-600 text-white hover:bg-blue-700 hover:text-white focus:bg-blue-600 focus:text-white rounded-md font-semibold",
        today: "bg-blue-100 text-blue-700 font-bold",
        outside: "text-gray-400 opacity-50",
        disabled: "text-gray-400 opacity-50",
        range_middle:
          "aria-selected:bg-blue-100 aria-selected:text-blue-700",
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
