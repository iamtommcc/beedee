"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addWebpage } from "@/lib/form-actions"
import { PlusCircle } from "lucide-react"
import { useActionState, useEffect, useRef } from "react"; // Added useEffect
import { useFormStatus } from "react-dom"
import { toast } from "sonner"

import type { FormState } from "@/lib/form-actions"

// Use the shared FormState type
type AddWebpageState = FormState

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? (
        "Adding..."
      ) : (
        <>
          <PlusCircle className="mr-2 h-4 w-4" /> Add URL
        </>
      )}
    </Button>
  )
}

export function AddUrlForm() {
  // Initialize with a proper FormState
  const [state, formAction] = useActionState<AddWebpageState, FormData>(addWebpage, { timestamp: Date.now() })
  const formRef = useRef<HTMLFormElement>(null)

  // Use useEffect to handle side effects like showing toasts
  useEffect(() => {
    if (state.success) {
      toast.success(state.success)
      formRef.current?.reset()
    } else if (state.error) {
      toast.error(state.error)
    }
  }, [state])

  return (
    <form ref={formRef} action={formAction} className="space-y-4 p-4 border rounded-lg shadow">
      <div>
        <Label htmlFor="url" className="text-sm font-medium">
          Webpage URL to Scrape
        </Label>
        <Input id="url" name="url" type="url" placeholder="https://example.com/events" required className="mt-1" />
      </div>
      <SubmitButton />
    </form>
  )
}
