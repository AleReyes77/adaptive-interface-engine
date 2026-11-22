import { describe, expect, it } from "vitest";
import { DEPLOY_FIELDS, errorMessage, validateDeployField } from "@/lib/deploy-validation";

describe("validateDeployField", () => {
  it("accepts valid values", () => {
    expect(validateDeployField("serviceName", "payments-api")).toBeNull();
    expect(validateDeployField("image", "registry.example.com/payments:1.4.2")).toBeNull();
    expect(validateDeployField("replicas", "3")).toBeNull();
    expect(validateDeployField("memory", "512")).toBeNull();
    expect(validateDeployField("healthPath", "/healthz")).toBeNull();
  });

  it("returns a machine code, never the value, for invalid input", () => {
    expect(validateDeployField("serviceName", "Payments API")).toBe("format");
    expect(validateDeployField("serviceName", "")).toBe("required");
    expect(validateDeployField("image", "payments")).toBe("tag");
    expect(validateDeployField("image", "payments:latest")).toBe("latest");
    expect(validateDeployField("replicas", "0")).toBe("range");
    expect(validateDeployField("replicas", "2.5")).toBe("range");
    expect(validateDeployField("memory", "500")).toBe("step");
    expect(validateDeployField("memory", "16384")).toBe("range");
    expect(validateDeployField("healthPath", "healthz")).toBe("format");
  });

  it("has an actionable message for every code it can return", () => {
    for (const field of DEPLOY_FIELDS) {
      expect(errorMessage(field, "required")).toMatch(/\w/);
    }
    expect(errorMessage("replicas", "range")).toBe("Enter a whole number from 1 to 20.");
    expect(errorMessage("memory", "step")).toBe("Use a multiple of 128, like 256, 512 or 1024.");
  });
});
