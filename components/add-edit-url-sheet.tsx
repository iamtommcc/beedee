"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MultiSelect } from "@/components/ui/multi-select"
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet"
import type { FormState } from "@/lib/form-actions"
import { addWebpage, updateWebpage } from "@/lib/form-actions"
import type { WebpageConfig } from "@/lib/types"
import { CATEGORIES } from "@/lib/types"
import { Edit, PlusCircle } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"

interface AddEditURLSheetProps {
  onSuccess: () => void
  mode: "add" | "edit"
  webpage?: WebpageConfig
  triggerButton?: React.ReactNode
}

function SubmitButton({ mode, pending }: { mode: "add" | "edit"; pending: boolean }) {
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        mode === "add" ? "Adding..." : "Updating..."
      ) : (
        mode === "add" ? "Add URL" : "Update URL"
      )}
    </Button>
  )
}

export function AddEditURLSheet({ onSuccess, mode, webpage, triggerButton }: AddEditURLSheetProps) {
  const formRef = useRef<HTMLFormElement>(null)
  const [open, setOpen] = useState(false)
  const [selectedCategories, setSelectedCategories] = useState<string[]>(
    webpage?.categories || []
  )
  const [submitting, setSubmitting] = useState(false)

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen)
    if (nextOpen) {
      if (mode === "edit") {
        setSelectedCategories(webpage?.categories || [])
      } else {
        setSelectedCategories([])
      }
    }
  }

  const handleFormSubmit = async (formData: FormData) => {
    setSubmitting(true)
    formData.set('categories', JSON.stringify(selectedCategories))
    if (mode === "edit" && webpage) {
      formData.set('id', webpage.id.toString())
    }
    let result: FormState
    if (mode === "add") {
      result = await addWebpage({ timestamp: Date.now() } as FormState, formData)
    } else {
      result = await updateWebpage({ timestamp: Date.now() } as FormState, formData)
    }
    setSubmitting(false)
    if (result.success) {
      toast.success(result.success)
      formRef.current?.reset()
      setOpen(false)
      onSuccess()
      return
    }
    if (result.error) {
      toast.error(result.error)
    }
  }

  const defaultTrigger = mode === "add" ? (
    <Button variant="outline">
      <PlusCircle className="h-4 w-4 mr-2" />
      Add URL
    </Button>
  ) : (
    <Button size="sm" variant="outline">
      <Edit className="h-4 w-4 mr-1" />
      Edit
    </Button>
  )

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {triggerButton || defaultTrigger}
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[540px] px-4">
        <SheetHeader>
          <SheetTitle>
            {mode === "add" ? "Add New URL" : "Edit URL"}
          </SheetTitle>
          <SheetDescription>
            {mode === "add" 
              ? "Add a webpage URL to scrape for events." 
              : "Update the webpage URL and categories."
            }
          </SheetDescription>
        </SheetHeader>
    
        <form ref={formRef} action={handleFormSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="url" className="text-sm font-medium">
              Webpage URL to Scrape
            </Label>
            <Input 
              id="url" 
              name="url" 
              type="url" 
              placeholder="https://example.com/events"
              defaultValue={mode === "edit" ? webpage?.url : ""}
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Categories
            </Label>
            <MultiSelect
              options={CATEGORIES}
              selected={selectedCategories}
              onSelectionChange={setSelectedCategories}
              placeholder="Select categories..."
              className="w-full"
            />
          </div>
          
          <SheetFooter className="flex gap-2">
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <SubmitButton mode={mode} pending={submitting} />
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
