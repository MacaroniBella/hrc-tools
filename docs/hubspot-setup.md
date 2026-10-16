# HubSpot setup for HRC Tools

The tools submit through HubSpot's Forms API, so every submission is recorded as a real submission on a HubSpot form. Form-triggered workflows, notification emails and follow-up emails all fire exactly as they would for an embedded HubSpot form.

## 1. Create the contact properties (once)

Settings → Properties → Contact properties. Use these internal names exactly.

**Shared by every tool**

| Internal name | Type | Notes |
|---|---|---|
| `hrc_tool_name` | Single-line text | Which tool sent the lead, e.g. `member-leakage` |
| `hrc_tool_source` | Single-line text | The embed's `data-source`, e.g. `tools-page`, `linkedin-ad` |
| `hrc_wants_call` | Single checkbox | `true` when they asked to walk through results |

Standard properties also used: `firstname`, `lastname`, `email`, `company`, `jobtitle`, `phone`.

**Member Leakage Calculator**

| Internal name | Type |
|---|---|
| `hrc_ml_members` | Number |
| `hrc_ml_mortgages_held` | Number |
| `hrc_ml_avg_loan_size` | Number (currency) |
| `hrc_ml_members_per_household` | Number |
| `hrc_ml_households_elsewhere` | Number |
| `hrc_ml_share_served` | Number (percent, 0 to 100) |
| `hrc_ml_volume_elsewhere` | Number (currency) |
| `hrc_ml_renting_households` | Number |

## 2. Create one form per tool

Marketing → Forms → create a form named `Tool – Member Leakage`.

- Add every field above (standard and tool fields). Set the tool fields and the three shared fields to **hidden**.
- **Every field the tool sends must be on the form**, or HubSpot rejects the submission.
- Copy the portal ID and form GUID (from the form's share/embed code) into the embed's `data-hs-portal` and `data-hs-form`.

## 3. Build the workflow

Automation → Workflows → contact-based, enrolled by **Form submission: Tool – Member Leakage**.

1. Set lifecycle stage to **Lead** and lead status to **New**.
2. Rotate or assign the contact owner.
3. Create the Lead record (Sales Hub) or a deal in your partnership pipeline.
4. Send an internal email or Slack notification to the owner with: name, credit union, role, `hrc_wants_call`, `hrc_ml_households_elsewhere` and `hrc_ml_share_served`.
5. If `hrc_wants_call` is true, create a call task due today.
6. Send the confirmation email to the contact with their numbers (personalize with the `hrc_ml_*` tokens) and the booking link.

Optional guardrail: branch on the email domain and flag personal addresses or known competitors instead of alerting sales.

## 4. Test before launch

1. Submit the tool once with a test email.
2. Confirm the submission appears under the form in HubSpot with every hidden field filled.
3. Confirm the workflow enrolled, the owner got the alert and the confirmation email arrived.

If the tool shows "Something went wrong," open the browser console: the warning includes HubSpot's error, which names any field missing from the form.
