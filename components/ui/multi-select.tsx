"use client"

import { Check, ChevronDown, X } from "lucide-react"
import * as React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onSelectionChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showSelected?: boolean
}

export function MultiSelect({
  options,
  selected,
  onSelectionChange,
  placeholder = "Select options...",
  className,
  disabled = false,
  showSelected = false,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const handleSelect = (value: string) => {
    console.log('Selecting:', value) // Debug log
    if (selected.includes(value)) {
      onSelectionChange(selected.filter((item) => item !== value))
    } else {
      onSelectionChange([...selected, value])
    }
  }

  const handleRemove = (value: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onSelectionChange(selected.filter((item) => item !== value))
  }

  const selectedLabels = selected.map(value => 
    options.find(option => option.value === value)?.label || value
  )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("justify-between min-h-9 h-auto px-3 py-[7px]", className)}
          disabled={disabled}
        >
          <div className="flex flex-wrap gap-1 flex-1 max-w-full">
            {selected.length > 0 ? (
              showSelected ? (
                <>
                  {selectedLabels.slice(0, 3).map((label, index) => (
                    <Badge
                      key={selected[index]}
                      variant="secondary"
                      className="mr-1 text-xs h-5 cursor-pointer"
                    >
                      {label}
                      <X 
                        className="ml-1 h-3 w-3 hover:bg-muted-foreground/20 rounded-sm" 
                        onClick={(e) => handleRemove(selected[index], e)}
                      />
                    </Badge>
                  ))}
                  {selected.length > 3 && (
                    <Badge variant="secondary" className="mr-1 text-xs h-5">
                      +{selected.length - 3} more
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-foreground font-normal">
                  {selected.length} selected
                </span>
              )
            ) : (
              <span className="text-foreground font-normal">{placeholder}</span>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 z-50" align="start" sideOffset={4}>
        <div className="max-h-72 overflow-y-auto p-1">
          {options.map((option) => {
            const isSelected = selected.includes(option.value)
            return (
              <button
                key={option.value}
                type="button"
                className="w-full flex items-center space-x-2 rounded-md p-2 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground text-left"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleSelect(option.value)
                }}
              >
                <div className={cn(
                  "flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                  isSelected
                    ? "bg-primary text-primary-foreground"
                    : "opacity-50 hover:opacity-100"
                )}>
                  {isSelected && (
                    <Check className="h-3 w-3" />
                  )}
                </div>
                <span className="flex-1">{option.label}</span>
              </button>
            )
          })}
        </div>
      </PopoverContent>
    </Popover>
  )
}
