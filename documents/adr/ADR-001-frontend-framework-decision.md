# Front-End Framework Decision

## Context
Because our project is an inherited project, its original framework was using Express + Handlebars. As we began updating UI and implementing more survey features (select elements, smoother zoom in/out, etc.), we considered whether to adopt React for improved component reuse, better user experience, and interactivity.

## Decision
We decided to stay with Express + Handlebars as our front-end rendering framework for this project.

## Options

### Option A – Adopt React
**Pros:** reusable components, cleaner state logic, dynamic forms  
**Cons:** requires full rebuild of UI, adds complexity, team must learn React (time commitment)

### Option B – Enhance Handlebars with Vanilla JS (Chosen)
**Pros:** minimal changes, easy to maintain, works with current templates, fastest delivery  
**Cons:** if a component is complex, it might take more time to implement using this option

### Option C – Adopt Vue.js
**Pros:** simpler API than React, easier to learn, builds a more dynamic and modern front-end  
**Cons:** requires full rebuild of UI, team must learn Vue.js

### Option D – Do Nothing (Baseline)
**Pros:** zero work needed  
**Cons:** cannot support new survey interactions needed for this term

## Consequences
- Delivers the interactivity we need without requiring a major architectural rewrite  
- No need to rebuild UI framework or learn a new language  
- Faster development within sprint timeline  
- Less reusable UI components  
- Harder to manage complex features
