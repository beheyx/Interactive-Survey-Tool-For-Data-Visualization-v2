# ADR-002: Table-Based Resource Display for Dashboard

## Context
The original inherited dashboard displayed user resources (survey designs, visualizations, published surveys) as simple list items with minimal information. As users began managing multiple survey versions and needed to track recent activity, we considered whether to enhance the display format to provide better organization and actionable information like timestamps and bulk operations.

## Decision
We decided to implement table based layouts with columns for Name, Created, Last Modified, and Actions for all resource list views in the user dashboard.

## Options

### Option A – Do nothing (Baseline)
**Pros:** minimal work needed, already implemented, simple HTML  
**Cons:** poor information density, no way to see timestamps, cannot support bulk operations, harder to scan when managing 10+ surveys

### Option B – Card-Based Layout
**Pros:** visually appealing, modern design  
**Cons:** takes more vertical space, harder to compare items side by side, overkill for text-heavy data

### Option C – Table-Based Layout with Timestamps (Chosen)
**Pros:** high information density, familiar pattern for admin interfaces, enables sorting/filtering later, supports bulk selection via checkboxes, clear visual hierarchy  
**Cons:** requires significant CSS/HTML work

### Option D – Accordion/Collapsible Lists
**Pros:** compact when collapsed, can show details on expand  
**Cons:** requires extra clicks to see information, slower navigation, unfamiliar pattern for resource management

## Consequences

**Positive:**
- Users can now quickly identify recently modified surveys without opening each one
- Enables future enhancements like column sorting and filtering by date
- Bulk delete operations possible through checkbox column
- Professional appearance matching industry-standard admin dashboards

**Negative:**
- Increased CSS maintenance burden
- More HTML structure to maintain across three separate table views
