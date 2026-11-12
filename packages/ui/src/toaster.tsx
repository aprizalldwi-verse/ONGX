"use client";

import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

function Toaster({ theme = "dark", ...props }: ToasterProps) {
  return (
    <SonnerToaster
      theme={theme}
      position="bottom-center"
      toastOptions={{
        classNames: {
          toast:
            "!bg-[var(--surface-2)] !text-[var(--fg)] !border !border-[var(--line)] !rounded-[var(--radius)]",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
