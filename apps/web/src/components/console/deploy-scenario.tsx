"use client";

import { useFieldAssist, useTaskTimer, useTrack } from "@aie/react";
import { type FormEvent, useRef, useState } from "react";
import { AssistedField } from "@/components/adaptive/assisted-field";
import { Instructions } from "@/components/adaptive/instructions";
import {
  DEPLOY_FIELDS,
  type DeployErrorCode,
  type DeployField,
  errorMessage,
  FIELD_HELP,
  validateDeployField,
} from "@/lib/deploy-validation";

const FORM_ID = "deploy";

const LABELS: Record<DeployField, string> = {
  serviceName: "Service name",
  image: "Container image",
  replicas: "Replicas",
  memory: "Memory per replica (MiB)",
  healthPath: "Health check path",
};

const PLACEHOLDERS: Record<DeployField, string> = {
  serviceName: "payments-api",
  image: "registry.example.com/payments:1.4.2",
  replicas: "2",
  memory: "512",
  healthPath: "/healthz",
};

type Values = Record<DeployField, string>;
type Errors = Record<DeployField, DeployErrorCode | null>;

const EMPTY: Values = { serviceName: "", image: "", replicas: "", memory: "", healthPath: "" };
const NO_ERRORS: Errors = {
  serviceName: null,
  image: null,
  replicas: null,
  memory: null,
  healthPath: null,
};

export function DeployScenario() {
  const track = useTrack();
  const timer = useTaskTimer("deploy");
  const started = useRef(false);
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>(NO_ERRORS);
  const [region, setRegion] = useState("eu-west");
  const [deployed, setDeployed] = useState<string | null>(null);

  const assists = {
    serviceName: useFieldAssist({ formId: FORM_ID, fieldId: "serviceName" }),
    image: useFieldAssist({ formId: FORM_ID, fieldId: "image" }),
    replicas: useFieldAssist({ formId: FORM_ID, fieldId: "replicas" }),
    memory: useFieldAssist({ formId: FORM_ID, fieldId: "memory" }),
    healthPath: useFieldAssist({ formId: FORM_ID, fieldId: "healthPath" }),
  };

  /** Validates one field, reports new errors and corrections, and returns the code. */
  function check(field: DeployField, value: string, report: boolean): DeployErrorCode | null {
    const code = validateDeployField(field, value);
    const previous = errors[field];
    if (report && code && code !== previous) assists[field].reportError(code);
    if (!code && previous) assists[field].reportCorrected();
    setErrors((e) => ({ ...e, [field]: code }));
    return code;
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    const codes = DEPLOY_FIELDS.map((field) => check(field, values[field], true));
    const ok = codes.every((code) => code === null);
    track({ type: "form.submitted", formId: FORM_ID, success: ok });
    if (ok) {
      timer.complete();
      started.current = false;
      setDeployed(values.serviceName);
    } else {
      const first = DEPLOY_FIELDS[codes.findIndex((code) => code !== null)];
      document.querySelector<HTMLInputElement>(`[data-field="${first}"]`)?.focus();
    }
  }

  if (deployed) {
    return (
      <div className="space-y-4" role="status">
        <h2 className="text-2xl font-bold">Deployment queued</h2>
        <p>
          <span className="font-mono">{deployed}</span> will roll out to {region} in a few minutes.
          This is a simulation: nothing was deployed.
        </p>
        <button
          type="button"
          className="rounded-md border border-ink px-4 py-2 font-semibold hover:bg-sunken"
          onClick={() => {
            setValues(EMPTY);
            setErrors(NO_ERRORS);
            setDeployed(null);
          }}
        >
          Deploy another service
        </button>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      onFocus={() => {
        if (!started.current) {
          started.current = true;
          timer.start();
        }
      }}
      className="space-y-8"
    >
      <header>
        <h2 className="text-2xl font-bold">Deploy a service</h2>
        <div className="mt-3 ps-4">
          <Instructions
            hint="All fields are required. Each value is checked when you leave the field."
            steps={[
              "Name the service. The name becomes part of its address.",
              "Enter the image with a fixed version tag, never :latest.",
              "Choose at least 2 replicas for anything people depend on.",
              "Set memory per replica in steps of 128 MiB.",
              "Enter the health check path, then select Deploy service.",
            ]}
          />
        </div>
      </header>

      <div className="grid gap-6 ps-4 md:grid-cols-2">
        {DEPLOY_FIELDS.map((field) => (
          <AssistedField
            key={field}
            data-field={field}
            className={field === "image" ? "md:col-span-2" : undefined}
            assist={assists[field]}
            label={LABELS[field]}
            help={FIELD_HELP[field]}
            error={errors[field] ? errorMessage(field, errors[field]) : null}
            name={field}
            value={values[field]}
            placeholder={PLACEHOLDERS[field]}
            inputMode={field === "replicas" || field === "memory" ? "numeric" : undefined}
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              const value = e.target.value;
              setValues((v) => ({ ...v, [field]: value }));
              if (errors[field]) check(field, value, false);
            }}
            onBlur={(e) => {
              if (e.target.value !== "") check(field, e.target.value, true);
            }}
          />
        ))}
        <div>
          <label htmlFor="region" className="font-semibold">
            Region
          </label>
          <select
            id="region"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-line-strong bg-surface px-3 py-2"
          >
            <option value="eu-west">EU West</option>
            <option value="us-east">US East</option>
            <option value="ap-south">Asia Pacific South</option>
          </select>
        </div>
      </div>

      <div className="ps-4">
        <button
          type="submit"
          className="rounded-md bg-ink px-5 py-2.5 font-semibold text-paper hover:opacity-90"
        >
          Deploy service
        </button>
      </div>
    </form>
  );
}
