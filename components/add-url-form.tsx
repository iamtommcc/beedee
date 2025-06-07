"use client"

import { useRef, useEffect } from "react" // Added useEffect
import { useActionState } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { addWebpage } from "@/lib/form-actions"
import { PlusCircle } from "lucide-react"

// Define a type for the state returned by addWebpage for clarity
type AddWebpageState = {
  success?: string
  error?: string
  // Add a timestamp or unique ID to ensure state object identity changes
  // This helps useEffect differentiate between "same message, new submission" vs "same message, old submission"
  timestamp?: number
} | null

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
  // Initialize with a state type that can include a timestamp or unique ID
  const [state, formAction] = useActionState<AddWebpageState, FormData>(addWebpage, null)
  const formRef = useRef<HTMLFormElement>(null)

  // Use useEffect to handle side effects like showing toasts
  useEffect(() => {
    if (state) {
      if (state.success) {
        toast.success(state.success)
        formRef.current?.reset()
      } else if (state.error) {
        toast.error(state.error)
      }
      // IMPORTANT: To prevent re-triggering on subsequent renders if `state` object identity
      // doesn't change but its content does (or if the action is called multiple times rapidly),
      // the server action `addWebpage` should ideally return a new state object
      // (e.g., with a new timestamp or unique ID) each time it's successfully processed.
      // The `state` object itself (its reference) is the dependency for this useEffect.
    }
  }, [state]) // Add toast to dependency array as it's used inside

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
