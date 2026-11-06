import "server-only";
import type { DestinationId } from "./examples";

/** Every registered destination has an inbox or an explicit unconfigured value. */
export type RecipientMap = Readonly<Record<DestinationId, string | null>>;

const destinationIds: readonly DestinationId[] = [
  "billing_invoices",
  "billing_refunds",
  "contact_triage",
  "engineering_triage",
  "enterprise_procurement",
  "enterprise_solutions",
  "frontend_accessibility",
  "frontend_interface",
  "general_inquiries",
  "growth_integrations",
  "growth_sales",
  "identity_authentication",
  "infrastructure_reliability",
  "platform_api",
  "platform_integrations",
  "sales_triage",
  "startup_onboarding",
  "startup_technical",
  "support_access",
  "support_technical",
];

/**
 * Server-owned receiving inboxes, keyed by the registry's destination IDs.
 * @remarks Each destination reads `ROUTE_TO_<DESTINATION_ID>` (e.g. `ROUTE_TO_BILLING_REFUNDS`)
 * and falls back to `ROUTE_TO_DEFAULT`, so a single inbox can receive every form.
 * All destinations for a form must be configured before delivery is offered.
 * Addresses are never passed to the browser or either routing model.
 */
export const routingRecipients: RecipientMap = Object.fromEntries(
  destinationIds.map((id) => [
    id,
    process.env[`ROUTE_TO_${id.toUpperCase()}`]?.trim() ||
      process.env.ROUTE_TO_DEFAULT?.trim() ||
      null,
  ])
) as RecipientMap;
