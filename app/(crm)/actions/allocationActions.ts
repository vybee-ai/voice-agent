"use server";

import { revalidatePath } from "next/cache";
import { allocationsService } from "@/services/allocationsService";
import { associatesService } from "@/services/associatesService";
import type { AllocationMethod, AssociateAvailability } from "@/lib/types";

export async function assignAssociateAction(formData: {
  leadId: string;
  associateId: string;
  method?: AllocationMethod;
  notes?: string;
}) {
  if (!formData.leadId || !formData.associateId) {
    return { success: false, error: "Lead ID and Associate ID are required" };
  }

  const result = await allocationsService.assignAssociate({
    leadId: formData.leadId,
    associateId: formData.associateId,
    method: formData.method ?? "AdminManual",
    outcomeNotes: formData.notes,
  });

  revalidatePath(`/leads/${formData.leadId}`);
  revalidatePath("/leads");
  revalidatePath("/associates");
  revalidatePath("/dashboard");
  revalidatePath("/allocations");

  return result;
}

export async function acceptAllocationAction(allocationId: string, leadId?: string) {
  if (!allocationId) {
    return { success: false, error: "Allocation ID is required" };
  }

  const result = await allocationsService.acceptAllocation(allocationId);

  if (leadId) revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/associates");
  revalidatePath("/dashboard");
  revalidatePath("/allocations");

  return result;
}

export async function declineAllocationAction(allocationId: string, reason: string, leadId?: string) {
  if (!allocationId || !reason) {
    return { success: false, error: "Allocation ID and decline reason are required" };
  }

  const result = await allocationsService.declineAllocation(allocationId, reason);

  if (leadId) revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/associates");
  revalidatePath("/dashboard");
  revalidatePath("/allocations");

  return result;
}

export async function reassignAllocationAction(formData: {
  currentAllocationId: string;
  newAssociateId: string;
  reason: string;
  leadId?: string;
}) {
  if (!formData.currentAllocationId || !formData.newAssociateId || !formData.reason) {
    return { success: false, error: "All reassignment parameters are required" };
  }

  const result = await allocationsService.reassignAllocation({
    currentAllocationId: formData.currentAllocationId,
    newAssociateId: formData.newAssociateId,
    reason: formData.reason,
  });

  if (formData.leadId) revalidatePath(`/leads/${formData.leadId}`);
  revalidatePath("/leads");
  revalidatePath("/associates");
  revalidatePath("/dashboard");
  revalidatePath("/allocations");

  return result;
}

export async function recordFirstContactAction(allocationId: string, leadId?: string) {
  if (!allocationId) {
    return { success: false, error: "Allocation ID is required" };
  }

  const result = await allocationsService.recordFirstContact(allocationId);

  if (leadId) revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/associates");
  revalidatePath("/dashboard");
  revalidatePath("/allocations");

  return result;
}

export async function completeAllocationAction(allocationId: string, notes?: string, leadId?: string) {
  if (!allocationId) {
    return { success: false, error: "Allocation ID is required" };
  }

  const result = await allocationsService.completeAllocation(allocationId, notes);

  if (leadId) revalidatePath(`/leads/${leadId}`);
  revalidatePath("/leads");
  revalidatePath("/associates");
  revalidatePath("/dashboard");
  revalidatePath("/allocations");

  return result;
}

export async function updateAssociateAvailabilityAction(associateId: string, availability: AssociateAvailability) {
  if (!associateId || !availability) {
    return { success: false, error: "Associate ID and availability are required" };
  }

  const updated = await associatesService.updateAvailability(associateId, availability);

  revalidatePath("/associates");
  revalidatePath("/leads");
  revalidatePath("/dashboard");
  revalidatePath("/allocations");

  return { success: !!updated, associate: updated ?? undefined };
}
