import { describe, expect, it } from "vitest";
import {
  applyDecision,
  decisionProblem,
  definitionProblem,
  delegationProblem,
  escalationDue,
  isOverdue,
  type Decision,
  type Instance,
  type WorkflowDefinition,
} from "../index.js";

/** WORKFLOW_RULES.md: "Leave Request -> Manager -> HR (when configured)". */
const leave: WorkflowDefinition = {
  code: "leave_request",
  version: 1,
  name: "Leave request",
  trigger: "leave.requested",
  subjectType: "LeaveRequest",
  stages: [
    { key: "manager", name: "Manager", rule: "MANAGER_OF_SUBJECT", slaHours: 48, escalateAfterHours: 72, escalateToRole: "HR_ADMIN" },
    { key: "hr", name: "People", rule: "DEPARTMENT", target: "PEO", slaHours: 24 },
  ],
  onApproved: "APPROVED",
  onRejected: "REJECTED",
};

/** The disposal control: two distinct authorisers. */
const disposal: WorkflowDefinition = {
  code: "record_disposal",
  version: 1,
  name: "Record disposal",
  trigger: "document.disposal_requested",
  subjectType: "ControlledDocument",
  stages: [
    {
      key: "authorise",
      name: "Two-person authorisation",
      rule: "MIN_LEVEL",
      target: "A3",
      quorum: 2,
      requiredEvidence: ["retention_check"],
    },
  ],
  onApproved: "DELETED",
  onRejected: "ARCHIVED",
};

const anyone = () => true;

const instance = (over: Partial<Instance> = {}): Instance => ({
  definitionCode: "leave_request",
  version: 1,
  subjectRef: "lr1",
  requestedById: "emp",
  subjectMemberId: "emp",
  currentStageKey: "manager",
  state: "RUNNING",
  startedAt: "2026-08-10T09:00:00Z",
  stageEnteredAt: "2026-08-10T09:00:00Z",
  decisions: [],
  ...over,
});

const decide = (over: Partial<Decision> = {}): Decision => ({
  stageKey: "manager",
  deciderId: "mgr",
  outcome: "APPROVE",
  at: "2026-08-10T10:00:00Z",
  ...over,
});

describe("definition validation", () => {
  it("accepts the leave chain from the specification", () => {
    expect(definitionProblem(leave)).toBeNull();
    expect(definitionProblem(disposal)).toBeNull();
  });

  it("refuses duplicate stage keys", () => {
    expect(
      definitionProblem({ ...leave, stages: [leave.stages[0], { ...leave.stages[0] }] })
    ).toMatch(/share the key/i);
  });

  it("refuses a workflow with no stages", () => {
    expect(definitionProblem({ ...leave, stages: [] })).toMatch(/at least one stage/i);
  });

  it("refuses a targeted rule with no target", () => {
    expect(
      definitionProblem({ ...leave, stages: [{ key: "hr", name: "HR", rule: "DEPARTMENT" }] })
    ).toMatch(/needs a target/i);
  });

  it("refuses two approvers from a single manager", () => {
    // One manager cannot be two people, so the rule would deadlock rather than
    // protect anything.
    expect(
      definitionProblem({
        ...leave,
        stages: [{ key: "m", name: "M", rule: "MANAGER_OF_SUBJECT", quorum: 2 }],
      })
    ).toMatch(/single manager/i);
  });

  it("refuses escalation that fires before its own SLA", () => {
    expect(
      definitionProblem({
        ...leave,
        stages: [{ key: "m", name: "M", rule: "MANAGER_OF_SUBJECT", slaHours: 48, escalateAfterHours: 24, escalateToRole: "X" }],
      })
    ).toMatch(/escalates before/i);
  });

  it("refuses escalation with no destination", () => {
    expect(
      definitionProblem({
        ...leave,
        stages: [{ key: "m", name: "M", rule: "MANAGER_OF_SUBJECT", escalateAfterHours: 24 }],
      })
    ).toMatch(/escalates to nobody/i);
  });

  it("refuses a bad code or version", () => {
    expect(definitionProblem({ ...leave, code: "Leave Request" })).toMatch(/lower_snake_case/i);
    expect(definitionProblem({ ...leave, version: 0 })).toMatch(/positive whole number/i);
  });
});

describe("segregation of duties", () => {
  it("refuses the requester approving their own request", () => {
    // The one an approval screen makes easiest to forget.
    const p = decisionProblem(leave, instance(), { id: "emp" }, anyone);
    expect(p).toMatch(/you raised this request/i);
  });

  it("refuses the subject deciding a request about themselves", () => {
    const i = instance({ requestedById: "hr", subjectMemberId: "emp" });
    expect(decisionProblem(leave, i, { id: "emp" }, anyone)).toMatch(/about you/i);
  });

  it("refuses somebody who is not an approver for the stage", () => {
    expect(decisionProblem(leave, instance(), { id: "other" }, () => false)).toMatch(
      /not an approver/i
    );
  });

  it("refuses the same person deciding a stage twice", () => {
    // A two-person control one person can satisfy twice is not a control.
    const i = instance({
      currentStageKey: "authorise",
      decisions: [decide({ stageKey: "authorise", deciderId: "a" })],
      evidence: ["retention_check"],
      requestedById: "req",
      subjectMemberId: null,
    });
    expect(decisionProblem(disposal, i, { id: "a" }, anyone)).toMatch(/already decided/i);
  });

  it("refuses a decision on a finished request", () => {
    expect(decisionProblem(leave, instance({ state: "APPROVED" }), { id: "mgr" }, anyone)).toMatch(
      /already approved/i
    );
  });

  it("allows a legitimate approver", () => {
    expect(decisionProblem(leave, instance(), { id: "mgr" }, anyone)).toBeNull();
  });
});

describe("required evidence", () => {
  it("blocks a stage whose evidence is missing", () => {
    const i = instance({ currentStageKey: "authorise", requestedById: "req", subjectMemberId: null });
    expect(decisionProblem(disposal, i, { id: "a" }, anyone)).toMatch(/retention check/i);
  });

  it("allows it once the evidence is attached", () => {
    const i = instance({
      currentStageKey: "authorise",
      requestedById: "req",
      subjectMemberId: null,
      evidence: ["retention_check"],
    });
    expect(decisionProblem(disposal, i, { id: "a" }, anyone)).toBeNull();
  });
});

describe("advancing", () => {
  it("moves to the next stage when the quorum is met", () => {
    const r = applyDecision(leave, instance(), decide());
    expect(r.state).toBe("RUNNING");
    expect(r.currentStageKey).toBe("hr");
  });

  it("approves the run after the last stage", () => {
    const i = instance({ currentStageKey: "hr", decisions: [decide()] });
    const r = applyDecision(leave, i, decide({ stageKey: "hr", deciderId: "hr1" }));
    expect(r.state).toBe("APPROVED");
  });

  it("holds at the stage until a two-person quorum is distinct", () => {
    const i = instance({ currentStageKey: "authorise", requestedById: "req", subjectMemberId: null });
    const one = applyDecision(disposal, i, decide({ stageKey: "authorise", deciderId: "a" }));
    expect(one.state).toBe("RUNNING");

    const two = applyDecision(
      disposal,
      { ...i, decisions: one.decisions },
      decide({ stageKey: "authorise", deciderId: "b" })
    );
    expect(two.state).toBe("APPROVED");
  });

  it("ends the run on a rejection at any stage", () => {
    // A chain where a later approver can overturn an earlier rejection is a
    // suggestion box, not an approval chain.
    const r = applyDecision(leave, instance(), decide({ outcome: "REJECT" }));
    expect(r.state).toBe("REJECTED");
  });
});

describe("SLA and escalation", () => {
  const now = (h: number) => new Date(Date.parse("2026-08-10T09:00:00Z") + h * 3_600_000);

  it("is not overdue inside the SLA", () => {
    expect(isOverdue(leave, instance(), now(24))).toBe(false);
  });

  it("is overdue past it", () => {
    expect(isOverdue(leave, instance(), now(49))).toBe(true);
  });

  it("does not escalate before the escalation window", () => {
    expect(escalationDue(leave, instance(), now(50))).toBeNull();
  });

  it("escalates after it, to the configured role", () => {
    expect(escalationDue(leave, instance(), now(73))).toBe("HR_ADMIN");
  });

  it("neither applies to a finished run", () => {
    const done = instance({ state: "APPROVED" });
    expect(isOverdue(leave, done, now(500))).toBe(false);
    expect(escalationDue(leave, done, now(500))).toBeNull();
  });

  it("a stage without an SLA is never overdue", () => {
    const i = instance({ currentStageKey: "authorise", requestedById: "r" });
    expect(isOverdue(disposal, i, now(10000))).toBe(false);
  });
});

describe("delegation", () => {
  it("allows an ordinary delegation", () => {
    expect(delegationProblem(leave, instance(), "mgr", "deputy")).toBeNull();
  });

  it("refuses delegating to the requester", () => {
    expect(delegationProblem(leave, instance(), "mgr", "emp")).toMatch(/raised the request/i);
  });

  it("refuses delegating to yourself", () => {
    expect(delegationProblem(leave, instance(), "mgr", "mgr")).toMatch(/same person/i);
  });

  it("refuses a stage marked non-delegable", () => {
    const d: WorkflowDefinition = {
      ...disposal,
      stages: [{ ...disposal.stages[0], delegable: false }],
    };
    const i = instance({ currentStageKey: "authorise", requestedById: "r" });
    expect(delegationProblem(d, i, "a", "b")).toMatch(/cannot be delegated/i);
  });
});
