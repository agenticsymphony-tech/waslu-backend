---
name: Feature request
about: Propose new functionality or an improvement
title: "feat: <short description>"
labels: ["enhancement"]
assignees: []
---

<!--
Before proposing a feature, check ADR 0001 (docs/adr/0001-commerce-engine.md).
Medusa already provides a lot natively — we should extend it, not duplicate it.
-->

## Problem

<!-- What user or business problem does this solve? Who has it? -->

## Proposed solution

<!-- What you would like to happen. Be concrete. -->

## Does Medusa already provide this?

- [ ] I checked the [Medusa docs](https://docs.medusajs.com) and it does **not** exist natively
- [ ] It exists natively and this request is to **extend** it (explain how below)
- [ ] I have not checked yet

<!-- If native or partially native, name the module/entity and link the docs. -->

## Alternatives considered

<!-- Other approaches, including doing nothing, and why they are worse. -->

## Multi-tenant impact

- [ ] No tenant impact
- [ ] Seller-facing — needs store scoping and a cross-store isolation test
- [ ] Touches payments, auth or file storage (ADR 0001 conditions C9/C11/C12 apply)

## Data model impact

<!-- Does this need a new entity, a new field, or a module link?
     Name the owning issue. Week 1 creates no domain entities. -->

- New entity/entities:
- Migration required: yes / no
- Owning issue:

## Acceptance criteria

<!-- How will we know this is done? Write it as a checklist. -->

- [ ]
- [ ]

## Additional context

<!-- Mockups, links, related issues, sprint/issue ID (e.g. BE-W2-03). -->