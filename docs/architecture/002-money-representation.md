# 2. Money representation

**Status:** accepted, 12 August 2026 (decision D-001, owner-approved)
**Decision:** `Decimal(18,4)` for every new financial table. Existing payment
tables keep integer minor units. The two are never mixed inside one calculation,
and the boundary between them is explicit and tested.

## The problem

`CLAUDE.md` says monetary values use decimal or numeric and never floating
point. The existing schema satisfies that a different way: twelve fields are
`Int` holding cents (`amountCents`, `totalCents`). The reference DDL in
`data/data_dictionary.csv` uses `numeric(18,2)` for amounts and `numeric(18,4)`
for BOQ unit costs and quantities.

Both are correct about floating point. They are not interchangeable, and Wave 2
adds a general ledger, tax, multi-currency and job costing on top of whichever
one we pick.

## Why Decimal(18,4) for new tables

**Four decimal places, not two, because unit prices are not totals.** A BOQ line
is a quantity times a unit cost, and both carry four places in the reference
model. Rounding a unit cost to two places and then multiplying by a quantity of
1,250 moves the line by real money. Totals are still presented at two; the extra
places exist so the arithmetic that produces them is not lossy.

**Decimal rather than minor units** because the ledger has to divide. Tax at
21%, an overhead allocation across cost codes, a currency conversion — each
produces a remainder, and integer minor units force every one of those into an
explicit rounding decision at the call site. That is defensible when there are
twelve fields and a payment provider dictating the unit; it is a large
recurring cost across a chart of accounts.

**18 digits** because `numeric(18,4)` holds about 99 trillion at four places,
which is beyond any figure this system will legitimately carry.

## Why the existing tables are not converted

They hold live Stripe payment data, and Stripe's API is denominated in minor
units. Converting them means a data migration on money that has already moved,
to gain consistency with tables that do not exist yet. The risk is real and
immediate; the benefit is tidiness.

They stay as they are, and they stay *labelled* as they are: every such field
keeps `Cents` in its name so the unit is visible at the point of use rather than
inferred from a schema file.

## The rule that matters

**Never mix the two inside one calculation.** A conversion happens at a domain
boundary, in one function, with a test — not inline where somebody has to
remember which unit they are holding. Mixing them is not a rounding error, it is
a factor of one hundred.

## Consequences

- New financial models use `Decimal @db.Decimal(18, 4)`.
- Prisma returns `Decimal` objects, not numbers. Arithmetic uses the Decimal
  API; `Number(x)` in a money path is a defect and should be caught in review.
- Presentation rounds to the currency's minor unit at the edge, once, using the
  company's `baseCurrency`.
- Every posted figure carries its currency explicitly. There is no implicit
  company currency at the row level, because consolidation reads rows from
  several companies at once.
