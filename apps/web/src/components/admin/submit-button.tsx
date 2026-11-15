"use client";

import { useFormStatus } from "react-dom";

import { Button, type ButtonProps } from "@ongx/ui";

export interface SubmitButtonProps extends ButtonProps {
  /** Shown while the action is pending; defaults to the normal label. */
  pendingLabel?: string;
}

/** Shared pending state for admin forms backed by server actions. */
export function SubmitButton({ children, pendingLabel, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" {...props} disabled={pending || props.disabled}>
      {pending ? (pendingLabel ?? children) : children}
    </Button>
  );
}
