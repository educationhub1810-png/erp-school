"use client"

import * as React from "react"
import { DayPicker } from "react-day-picker"
import "react-day-picker/style.css"

import { cn } from "@/lib/utils"

const CALENDAR_MIN_YEAR = 1950

function Calendar({
  className,
  startMonth = new Date(CALENDAR_MIN_YEAR, 0),
  endMonth = new Date(new Date().getFullYear(), 11),
  captionLayout = "dropdown",
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      startMonth={startMonth}
      endMonth={endMonth}
      captionLayout={captionLayout}
      className={cn("rdp-theme p-1", className)}
      style={{
        "--rdp-accent-color": "#3b32fa",
        "--rdp-accent-background-color": "#f5f5ff",
      } as React.CSSProperties}
      classNames={{
        caption_label: "text-sm font-semibold",
        dropdowns: "text-sm font-medium",
        day_button: "text-sm rounded-full hover:bg-muted transition-colors",
        today: "font-bold",
      }}
      {...props}
    />
  )
}

export { Calendar }
