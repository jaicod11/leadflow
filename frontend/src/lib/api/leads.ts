import { apiFetch } from "@/lib/api/client";
import type { Lead, LeadCreate, LeadStatus, LeadUpdate } from "@/lib/types";

export interface LeadListParams {
  status?: LeadStatus;
  search?: string;
}

export function listLeads(
  { status, search }: LeadListParams = {},
  signal?: AbortSignal,
): Promise<Lead[]> {
  return apiFetch<Lead[]>("/leads", { query: { status, search }, signal });
}

export function getLead(id: number, signal?: AbortSignal): Promise<Lead> {
  return apiFetch<Lead>(`/leads/${id}`, { signal });
}

export function createLead(data: LeadCreate): Promise<Lead> {
  return apiFetch<Lead>("/leads", { method: "POST", body: data });
}

export function updateLead(id: number, data: LeadUpdate): Promise<Lead> {
  return apiFetch<Lead>(`/leads/${id}`, { method: "PATCH", body: data });
}
