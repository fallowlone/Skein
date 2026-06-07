export const meta = {
  name: 'depth-audit-grade',
  description: 'LLM-grade every curriculum unit on the senior-depth rubric',
  phases: [{ title: 'Grade', detail: 'one agent per unit, reads lessons + practice' }],
}

// args = { units: [...worklist], model?: 'sonnet'|'opus', schema: <GRADE_TOOL_SCHEMA>, guide: '<prompt preface>' }
// The caller (grade-args.ts) builds `guide` + `schema` from the typed rubric so this
// plain-JS script stays in sync with rubric.ts. The Workflow runtime has no filesystem,
// so each grading agent Reads the lesson + practice files itself via absolute paths.
// `args` may arrive as a parsed object or as a JSON string depending on the caller —
// normalize to an object.
const input = typeof args === 'string' ? JSON.parse(args) : args
const units = input.units
const model = input.model || 'sonnet'
const SCHEMA = input.schema

phase('Grade')
const results = await pipeline(
  units,
  (u) => agent(
    `${input.guide}\n\nUnit: ${u.unitKey}\nGrade every lesson below. Read each file with the Read tool before grading it.\n` +
      u.lessons.map((l) => `- ${l.lessonKey}\n    lesson: ${l.path}\n    practice: ${l.practicePath || '(none)'}`).join('\n'),
    { label: `grade:${u.unitKey}`, phase: 'Grade', schema: SCHEMA, model },
  ).then((r) => ({ unitKey: u.unitKey, graderModel: model, grades: (r && r.grades) || [] })),
)
return results.filter(Boolean)
