import { FullAuditResponse, KnowledgeBaseResponse } from "@/types";

function getBackendUrl(): string {
  if (typeof window === "undefined") {
    return (
      process.env.BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      "http://localhost:8000"
    ).replace(/\/$/, "");
  }

  const publicUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(
    /\/$/,
    ""
  );
  if (
    !publicUrl ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(publicUrl)
  ) {
    return "";
  }
  return publicUrl;
}

export async function runFullAudit(
  text: string,
  docType: string = "general"
): Promise<FullAuditResponse> {
  const response = await fetch(`${getBackendUrl()}/api/v1/audit/full`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      doc_type: docType,
      run_stage2_if_stage1_blocked: true,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message || `Audit failed with HTTP status ${response.status}`
    );
  }

  return response.json();
}

export async function fetchKnowledgeBase(): Promise<KnowledgeBaseResponse> {
  const response = await fetch(`${getBackendUrl()}/api/v1/kb/chunks`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.message ||
        `Fetching KB failed with HTTP status ${response.status}`
    );
  }

  return response.json();
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${getBackendUrl()}/api/health`, {
      method: "GET",
      cache: "no-store",
    });
    if (!response.ok) return false;
    const data = await response.json().catch(() => null);
    return data?.status === "ok";
  } catch {
    return false;
  }
}

