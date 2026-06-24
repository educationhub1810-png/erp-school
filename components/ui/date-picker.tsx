"use client"

import * as React from "react"
import { format, parseISO, isValid } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  startMonth?: Date
  endMonth?: Date
  /** Disallow picking (or navigating to) any date after today — e.g. for date-of-birth fields. */
  disableFuture?: boolean
}

function DatePicker({ value, onChange, placeholder = "Pick a date", disabled, className, startMonth, endMonth, disableFuture }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const selected = value ? parseISO(value) : undefined
  const displayValue = selected && isValid(selected) ? format(selected, "dd/MM/yyyy") : null
  const today = new Date()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            type="button"
            variant="outline"
            className={cn("w-full justify-start font-normal", !displayValue && "text-muted-foreground", className)}
          />
        }
      >
        <CalendarIcon className="w-4 h-4 mr-2" />
        {displayValue ?? placeholder}
      </PopoverTrigger>
      <PopoverContent>
        <Calendar
          mode="single"
          selected={selected && isValid(selected) ? selected : undefined}
          onSelect={(date) => {
            onChange(date ? format(date, "yyyy-MM-dd") : "")
            setOpen(false)
          }}
          startMonth={startMonth}
          endMonth={disableFuture ? today : endMonth}
          disabled={disableFuture ? { after: today } : undefined}
          defaultMonth={selected && isValid(selected) ? selected : today}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker }
