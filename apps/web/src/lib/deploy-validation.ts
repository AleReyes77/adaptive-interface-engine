export const DEPLOY_FIELDS = ["serviceName", "image", "replicas", "memory", "healthPath"] as const;

export type DeployField = (typeof DEPLOY_FIELDS)[number];

/** Machine-readable error codes. These, not the values, are what the engine is told about. */
export type DeployErrorCode = "required" | "format" | "tag" | "latest" | "range" | "step";

const MESSAGES: Record<DeployField, Partial<Record<DeployErrorCode, string>>> = {
  serviceName: {
    required: "Enter a service name.",
    format: "Use 3 to 40 lowercase letters, numbers or hyphens, starting with a letter.",
  },
  image: {
    required: "Enter the container image to deploy.",
    tag: "Add a version tag after a colon, like payments:1.4.2.",
    latest: "Replace :latest with a specific version so this deploy can be repeated exactly.",
  },
  replicas: {
    required: "Enter how many copies should run.",
    range: "Enter a whole number from 1 to 20.",
  },
  memory: {
    required: "Enter the memory limit in MiB.",
    range: "Enter a value from 128 to 8192 MiB.",
    step: "Use a multiple of 128, like 256, 512 or 1024.",
  },
  healthPath: {
    required: "Enter the health check path.",
    format: "Start the path with a slash, like /healthz.",
  },
};

/** Help shown next to each field when the interface decides help is useful. */
export const FIELD_HELP: Record<DeployField, string> = {
  serviceName:
    "The name becomes part of the service address, so keep it short and stable. Lowercase letters, numbers and hyphens.",
  image:
    "The container image and its version, like registry.example.com/payments:1.4.2. A fixed version means a rollback deploys exactly what ran before.",
  replicas:
    "How many copies run at the same time. Use at least 2 for anything people depend on, so one copy can restart while the other keeps serving.",
  memory:
    "Memory for each copy, in steps of 128 MiB. A copy that goes over its limit is restarted, so leave some headroom.",
  healthPath:
    "The platform calls this path every few seconds. If it stops answering, traffic is moved away from that copy.",
};

function isWholeNumber(value: string): boolean {
  return /^\d+$/.test(value.trim());
}

/** Returns an error code for an invalid value, or null when the value is valid. */
export function validateDeployField(field: DeployField, raw: string): DeployErrorCode | null {
  const value = raw.trim();
  if (value === "") return "required";
  switch (field) {
    case "serviceName":
      return /^[a-z][a-z0-9-]{2,39}$/.test(value) ? null : "format";
    case "image": {
      if (!/^[a-z0-9][a-z0-9./_-]*:[\w.-]+$/.test(value)) return "tag";
      return value.endsWith(":latest") ? "latest" : null;
    }
    case "replicas": {
      if (!isWholeNumber(value)) return "range";
      const n = Number(value);
      return n >= 1 && n <= 20 ? null : "range";
    }
    case "memory": {
      if (!isWholeNumber(value)) return "step";
      const n = Number(value);
      if (n < 128 || n > 8192) return "range";
      return n % 128 === 0 ? null : "step";
    }
    case "healthPath":
      return /^\/[\w./-]*$/.test(value) ? null : "format";
  }
}

export function errorMessage(field: DeployField, code: DeployErrorCode): string {
  return MESSAGES[field][code] ?? "Check this value.";
}
