"use client";

import type { Source, TitleStatus } from "@ongx/db";
import { useTranslations } from "next-intl";
import { useActionState } from "react";

import { SubmitButton } from "@/components/admin/submit-button";
import { TITLE_STATUSES } from "@/lib/admin/validation";

import { updateTitleAction, type TitleFormState } from "./actions";

const INITIAL: TitleFormState = {};

export interface TitleFormProps {
  id: string;
  source: Source;
  titleId: string;
  synopsis: string | null;
  year: number | null;
  status: TitleStatus;
  streamUrl: string | null;
}

const fieldClass =
  "h-10 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)] px-3 text-sm outline-none focus-visible:border-[var(--accent)]";

export function TitleForm(props: TitleFormProps) {
  const t = useTranslations("admin.editTitle");
  const tStatus = useTranslations("admin.status");
  const [state, formAction, pending] = useActionState(updateTitleAction, INITIAL);
  const own = props.source === "OWN";

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-5">
      <input type="hidden" name="titleId" value={props.id} />

      {state.saved ? (
        <p
          role="status"
          className="rounded-[var(--radius)] border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm"
        >
          {t("saved")}
        </p>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-sm text-[var(--accent)]">
          {t(`errors.${state.error}`)}
        </p>
      ) : null}

      <p className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-xs text-[var(--fg-dim)]">
        {own ? t("ownMeta") : t("meta", { source: props.source })}
      </p>

      {own ? (
        <>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t("fieldTitle")}</span>
            <input
              name="titleName"
              type="text"
              required
              maxLength={200}
              defaultValue={props.titleId}
              disabled={pending}
              className={fieldClass}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t("fieldSynopsis")}</span>
            <textarea
              name="synopsis"
              rows={5}
              maxLength={5_000}
              defaultValue={props.synopsis ?? ""}
              disabled={pending}
              className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-sm outline-none focus-visible:border-[var(--accent)]"
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t("fieldYear")}</span>
            <input
              name="year"
              type="number"
              min={1888}
              max={2200}
              step={1}
              defaultValue={props.year ?? ""}
              disabled={pending}
              className={fieldClass}
            />
          </label>
        </>
      ) : null}

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-medium">{t("fieldStatus")}</span>
        <select name="status" defaultValue={props.status} disabled={pending} className={fieldClass}>
          {TITLE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {tStatus(status)}
            </option>
          ))}
        </select>
      </label>

      {own ? (
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-medium">{t("fieldStream")}</span>
          <input
            name="streamUrl"
            type="text"
            maxLength={2_048}
            defaultValue={props.streamUrl ?? ""}
            disabled={pending}
            placeholder="/test/fixtures/hls/master.m3u8"
            className={fieldClass}
          />
          <span className="text-xs text-[var(--fg-dim)]">{t("streamHint")}</span>
        </label>
      ) : (
        <p className="text-xs text-[var(--fg-dim)]">{t("streamLocked")}</p>
      )}

      <div>
        <SubmitButton pendingLabel={t("pending")} className="min-w-40">
          {t("submit")}
        </SubmitButton>
      </div>
    </form>
  );
}
