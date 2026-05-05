# Component Guidelines

> How components are built in this project.

---

## Overview

<!--
Document your project's component conventions here.

Questions to answer:
- What component patterns do you use?
- How are props defined?
- How do you handle composition?
- What accessibility standards apply?
-->

(To be filled by the team)

---

## Component Structure

<!-- Standard structure of a component file -->

(To be filled by the team)

---

## Props Conventions

<!-- How props should be defined and typed -->

(To be filled by the team)

---

## Styling Patterns

<!-- How styles are applied (CSS modules, styled-components, Tailwind, etc.) -->

(To be filled by the team)

---

## Accessibility

<!-- A11y requirements and patterns -->

(To be filled by the team)

---

## Common Mistakes

<!-- Component-related mistakes your team has made -->

### App Shell Grid Rows

When the root route uses a two-row shell such as `grid-rows-[auto_1fr]`, keep
all chrome elements inside the first row wrapper. For example, `Header` and a
session/status bar belong in one `auto` row wrapper, followed by `Outlet` in the
`1fr` row.

Putting `Header`, session bar, and `Outlet` directly into a two-row grid makes
the second chrome element consume the `1fr` row and pushes route content far
down the viewport.
