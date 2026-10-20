import { PrismaClient } from "@prisma/client";
import { definitionProblem, type WorkflowDefinition } from "@app/core";

/**
 * The approval chains from `workflows/WORKFLOW_RULES.md`, as data (WF-01).
 *
 * Idempotent on `code`+`version`. A definition is never edited in place — a
 * change is a new version and the old one is deactivated, so a run that started
 * under version 1 can still be read back against the rules it actually
 * followed. Editing would silently rewrite the history of decisions already
 * taken.
 *
 *   npm --workspace @app/db run seed:workflows
 */
const prisma = new PrismaClient();

const DEFINITIONS: WorkflowDefinition[] = [
  {
    // "Leave Request -> Manager -> HR (when configured) -> Approved/Rejected"
    code: "leave_request",
    version: 1,
    name: "Leave request",
    trigger: "leave.requested",
    subjectType: "LeaveRequest",
    stages: [
      {
        key: "manager",
        name: "Line manager",
        rule: "MANAGER_OF_SUBJECT",
        slaHours: 48,
        escalateAfterHours: 72,
        escalateToRole: "MANAGER",
        delegable: true,
      },
      { key: "people", name: "People", rule: "DEPARTMENT", target: "PEO", slaHours: 24, delegable: true },
    ],
    onApproved: "APPROVED",
    onRejected: "REJECTED",
  },
  {
    // "Overtime -> Manager -> Attendance Validation -> Payroll Eligibility"
    code: "overtime_request",
    version: 1,
    name: "Overtime request",
    trigger: "overtime.requested",
    subjectType: "OvertimeRequest",
    stages: [
      { key: "manager", name: "Line manager", rule: "MANAGER_OF_SUBJECT", slaHours: 48, delegable: true },
      {
        key: "attendance",
        name: "Attendance validation",
        rule: "DEPARTMENT",
        target: "PEO",
        requiredEvidence: ["attendance_record"],
        slaHours: 48,
      },
    ],
    onApproved: "APPROVED",
    onRejected: "REJECTED",
  },
  {
    // The disposal control from document_lifecycle.yaml: a retention check and
    // two distinct authorisers. The quorum is the whole point of the row.
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
        target: ["A3", "A4"],
        quorum: 2,
        requiredEvidence: ["retention_check"],
        slaHours: 120,
        delegable: false,
      },
    ],
    onApproved: "DELETED",
    onRejected: "ARCHIVED",
  },
  {
    // "Salary Change -> Request -> HR Review -> Finance/Budget -> Authorized
    // Approval -> Effective Date". No jurisdiction rules here — this is who
    // approves, not what is lawful. See D-003.
    code: "salary_change",
    version: 1,
    name: "Salary change",
    trigger: "compensation.change_requested",
    subjectType: "CompensationRecord",
    stages: [
      { key: "hr_review", name: "People review", rule: "DEPARTMENT", target: "PEO", slaHours: 72 },
      { key: "finance", name: "Finance and budget", rule: "DEPARTMENT", target: "FIN", slaHours: 72 },
      { key: "authorise", name: "Authorised approval", rule: "MIN_LEVEL", target: ["A4"], slaHours: 72, delegable: false },
    ],
    onApproved: "APPROVED",
    onRejected: "REJECTED",
  },
];

async function main() {
  let created = 0;
  let left = 0;

  for (const d of DEFINITIONS) {
    const problem = definitionProblem(d);
    if (problem) {
      // Refuse to seed something the engine would reject at runtime. A bad
      // definition in the database is worse than none: it fails when somebody
      // is waiting on an approval.
      console.error(`  ! ${d.code} v${d.version}: ${problem}`);
      process.exitCode = 1;
      continue;
    }

    const existing = await prisma.workflowDefinition.findUnique({
      where: { code_version: { code: d.code, version: d.version } },
    });
    if (existing) {
      left++;
      console.log(`  = ${d.code} v${d.version} already present — left as it is`);
      continue;
    }

    await prisma.workflowDefinition.create({
      data: {
        code: d.code,
        version: d.version,
        name: d.name,
        trigger: d.trigger,
        subjectType: d.subjectType,
        stages: d.stages as never,
        onApproved: d.onApproved,
        onRejected: d.onRejected,
        active: true,
      },
    });
    created++;
    console.log(`  + ${d.code} v${d.version}  ${d.name} (${d.stages.length} stage(s))`);
  }

  console.log(`\n${created} created, ${left} left unchanged.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
