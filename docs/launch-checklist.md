# Launch checklist

Running log of what's left before the tools go live on hrcuso.com. Updated as items close.

**Links for the team:** live demo https://macaronibella.github.io/hrc-tools/demo/member-leakage.html · repo https://github.com/MacaroniBella/hrc-tools

## Hosting

- [x] Repo public, GitHub Pages on from `main` (Oct 16, 2026). Live at https://macaronibella.github.io/hrc-tools/
- [ ] DNS: CNAME `tools` → `macaronibella.github.io` on hrcuso.com
- [ ] Repo Settings → Pages → Custom domain: `tools.hrcuso.com`, then check Enforce HTTPS
- [ ] Switch embed snippets from the github.io address to `https://tools.hrcuso.com/hrc-tools.js`

## HubSpot

- [ ] Create the contact properties in `docs/hubspot-setup.md`
- [ ] Create the form "Tool – Member Leakage" with every field (tool fields hidden)
- [ ] Send Claude the portal ID and form GUID
- [ ] Build the workflow: lead status, owner, Lead record or deal, sales alert, call task, confirmation email
- [ ] Test one submission end to end

## Member Leakage Calculator

- [ ] UI and wording pass (in progress: 92% headline and first-time buyer pipeline done Oct 16)
- [ ] Decide on a multi-product revenue line (needs a current, sourced revenue-per-member figure or CMS data)
- [ ] Confirm the members-per-household default (currently 2.0, unsourced) or replace it with CMS / partner data
- [ ] Booking link for the "Book a call" button (`data-booking-url`)
- [ ] Compliance review of the tool copy and methodology note

## Webflow

- [ ] Upgrade the HRC site to the CMS plan (custom code), planned week of Oct 19
- [ ] Embed the Member Leakage component on /member-leakage-calculator (replace the old static form)
- [ ] One component per tool holding the embed snippet
- [ ] Tool landing pages under `/tools/` (condensed hero + embed + link back to the Tools hub)
- [ ] Replace the static calculator forms on How We Help and What We Handle with the component

## Next tools

- [ ] Build vs. Partner Cost Comparison
- [ ] Mortgage Program Readiness Quiz
- [ ] Single-Product Risk Calculator
- [ ] 95-5 Impact Estimator (hidden landing pages only; consumer-level numbers, no program mechanics in public code)
