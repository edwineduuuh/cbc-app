"use client";

import { useState } from "react";
import CurriculumPicker from "@/components/CurriculumPicker";
import {
  Field, Select, MoreOptions, useGenerate, SubmitButton, ErrorNote, useRemembered, inputCls,
} from "@/components/studio/StudioForm";

const LENGTHS = [
  ["30", "30 minutes"], ["35", "35 minutes"], ["40", "40 minutes"],
  ["60", "60 minutes (double lesson)"], ["70", "70 minutes (double lesson)"], ["80", "80 minutes (double lesson)"],
];

export default function PlansPage() {
  const [sel, setSel] = useState(null);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [minutes, setMinutes] = useState("40");
  const [term, setTerm] = useState("");
  const [week, setWeek] = useState("");
  const [focus, setFocus] = useState("");
  const [school, setSchool] = useRemembered("school");
  const [teacher, setTeacher] = useRemembered("teacher");
  const [className, setClassName] = useState("");
  const [roll, setRoll] = useState("");
  const { run, busy, error } = useGenerate("/facilitator/plans/generate/");

  const subs = sel?.substrands || [];
  const one = subs.length === 1 ? subs[0] : null;

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Lesson Plans</h1>
      <p className="text-sm text-gray-500 mt-1 mb-6">
        A lesson plan in the KICD format, grounded in the sub-strand&apos;s curriculum design. Timings always add up to
        the lesson length, and it ends with a quick check drawn from the StadiSpace question bank.
      </p>

      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 space-y-5">
        <CurriculumPicker onSelect={setSel} single />
        {one && (one.learning_outcomes || []).length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">KICD outcomes for this sub-strand</p>
            <ol className="mt-2 space-y-1">
              {one.learning_outcomes.map((o, i) => (
                <li key={i} className="text-xs text-gray-700">{String.fromCharCode(97 + i)}) {o}</li>
              ))}
            </ol>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date of the lesson"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} /></Field>
          <Field label="Lesson length"><Select value={minutes} onChange={setMinutes} options={LENGTHS} /></Field>
          <Field label="Term" optional><input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="For example: 1" className={inputCls} /></Field>
          <Field label="Week" optional><input value={week} onChange={(e) => setWeek(e.target.value)} placeholder="For example: 5" className={inputCls} /></Field>
        </div>

        <Field label="What should this lesson cover?" optional
          hint="Which part of the sub-strand it is, what learners already know, or how you like to teach.">
          <textarea rows={3} value={focus} onChange={(e) => setFocus(e.target.value)} maxLength={600}
            placeholder="For example: second lesson on this sub-strand. Learners can already find the area of a rectangle; today, triangles. Include group work."
            className={inputCls} />
        </Field>

        <MoreOptions>
          <div className="grid grid-cols-2 gap-4">
            <Field label="School" optional><input value={school} onChange={(e) => setSchool(e.target.value)} className={inputCls} /></Field>
            <Field label="Teacher" optional><input value={teacher} onChange={(e) => setTeacher(e.target.value)} className={inputCls} /></Field>
            <Field label="Class or stream" optional><input value={className} onChange={(e) => setClassName(e.target.value)} placeholder="For example: 7 East" className={inputCls} /></Field>
            <Field label="Number of learners" optional><input value={roll} onChange={(e) => setRoll(e.target.value)} placeholder="For example: 42" className={inputCls} /></Field>
          </div>
        </MoreOptions>

        <ErrorNote error={error} />
        <SubmitButton busy={busy} disabled={!one}
          onClick={() => run({ substrand: one.id, minutes, date, term, week, focus, school, teacher, class_name: className, roll })}>
          {one ? "Generate lesson plan" : "Pick the sub-strand this lesson is on"}
        </SubmitButton>
        <p className="text-[11px] text-center text-gray-400">
          Tip: open a scheme of work and press <b>Plan</b> on any row to make that lesson&apos;s plan in one click.
        </p>
      </div>
    </div>
  );
}
