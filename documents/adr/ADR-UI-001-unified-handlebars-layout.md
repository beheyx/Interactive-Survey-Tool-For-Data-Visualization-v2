# ADR-005 — Unified Handlebars Layout for Authenticated UI

**Date:** 2025-11-23  
**Author:** Kaveenaya Srinivasagam Omkumar 

---

## Context
Our project inherited an inconsistent and partially broken UI architecture from the previous year’s team. Pages used different HTML structures, duplicated headers, missing navigation elements, and inconsistent layout logic. This caused maintainability issues and visual inconsistency, and made it difficult to extend features such as the new dashboard, enhanced tables, and improved navigation.

Stakeholders also requested a UI experience aligned with **Qualtrics-style layout**, requiring:
- A centralized header  
- Sidebar navigation  
- Breadcrumb navigation for clarity  
- Authentication-aware rendering  
- A consistent content container for all authenticated pages  

Since our project uses **Handlebars** as the templating engine, this decision affects every handlebar template files across our UI layouts


A unified system was needed before the team could safely build additional UI components.

---

## Decision
We adopted a **single unified layout** (`main.handlebars`) as the global template for all authenticated pages.

Alternatives Considered
1. Keep per-page layouts (Rejected)
Led to inconsistent UI
Hard to maintain
Changes required editing multiple files
No global navigation structure
2. Rewrite the whole UI using React/Vue (Rejected)
Too large of a rewrite
Not allowed by project constraints
Breaks server-side rendering workflows
Does not integrate smoothly with existing Handlebars routes
3. Patch existing layouts without unification (Rejected)
Still left duplicate HTML blocks
Did not solve global navigation issues
Breadcrumb implementation would be inconsistent


## Consequences
Positive Outcomes:
- Major reduction in duplicated UI logic
- Future features (e.g., Profile page) can be added easily
- Layout is maintainable and modernized
breadcrumb system improves usability
Negative Outcomes:
- Developers must understand the global layout when editing UI pages
- Requires coordination when adding new sidebar items
