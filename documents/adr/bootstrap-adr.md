# ADR-24OCT2025: Use Bootstrap 4 for Product Style
Status: Accepted (with modifications)

## Context
The inherited repository uses a non-standard style that lacks critical features.

## Decision
Both Bootstrap 4.3 and 5.3 will be used as the primary styling.

## Options

### Option A - Sakura [Do Nothing]
Sakura is made for simple, static websites. It is not meant to be used in complex dynamic websites such as this project.
### Option B - Bootstrap 4.3
The 4.3 version is simpler to understand since Bootstrap 5 includes more features that the team may not need to use or know. Bootstrap 4.3 requires jquery implementation, which the existing repository does not use.
### Option C - Bootstrap 5.3
There are some cases where a Bootstrap 5 feature is necessary. For example, the paneling system of the survey page to separate the questions from the settings. Bootstrap is a standard style library and its scripts do not use jquery and can be implemented.
### Option D - None
Having no style is not an option per the project partner’s requirements.

## Rationale
Combining 4.3's style for simplicity alongside the scripts of 5.3 to support the programmed features is the best outcome to maximize efficiency of the team and compatability with the existing code base.

## Consequences:
- Team members should be familiar with Bootstrap’s architecture.
- Online searches are encouraged to determine if a feature is not possible under the 4.3 framework.

**References:**
- Initial Project Partner Meeting
- [Sakura Main Page](https://oxal.org/projects/sakura/)
- [Bootstrap 4 Main Page](https://getbootstrap.com/docs/4.3/getting-started/introduction/)
- [Bootstrap 5 Main Page](https://getbootstrap.com/docs/5.3/getting-started/introduction/)
